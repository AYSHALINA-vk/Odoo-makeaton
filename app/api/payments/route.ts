import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { recordPayment } from "@/lib/db/billing-engine";
import { getCurrentUser } from "@/lib/auth/session";
import { isCustomer, isStaff } from "@/lib/auth/rbac";
import { syncRecordToSupabase } from "@/lib/supabase/sync";
import { fetchPayments } from "@/lib/supabase/data";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payments = await fetchPayments(isCustomer(currentUser.role) ? currentUser.id : undefined);
  return NextResponse.json({ payments });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isStaff(currentUser.role)) {
    return NextResponse.json({ error: "Unauthorized: Staff access required" }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { invoiceId, method, amount, paymentDate, note } = data;

    if (!invoiceId || !method || amount == null || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Valid invoice, payment method, and positive amount are required" },
        { status: 400 }
      );
    }

    const result = recordPayment({
      invoiceId,
      method,
      amount: Number(amount),
      paymentDate,
      note,
      recordedBy: currentUser.name || "Staff",
    });

    const db = getDatabase();

    // Sync payment and updated invoice to Supabase
    try {
      const paymentRow = db.prepare(`SELECT * FROM payments WHERE id = ?`).get(result.paymentId);
      const invoiceRow = db.prepare(`SELECT * FROM invoices WHERE id = ? OR number = ?`).get(invoiceId, invoiceId);
      if (paymentRow) await syncRecordToSupabase("payments", paymentRow);
      if (invoiceRow) await syncRecordToSupabase("invoices", invoiceRow);
    } catch (err: any) {
      console.warn("Could not sync payment to Supabase:", err.message);
    }

    // Audit log
    db.prepare(
      `INSERT INTO audit_log (actor_id, actor_email, entity, entity_id, action, after_state)
       VALUES (?, ?, 'payments', ?, 'PAYMENT_RECORDED', ?)`
    ).run(
      currentUser.id,
      currentUser.email,
      result.paymentId,
      JSON.stringify({ invoice_id: invoiceId, amount, method })
    );

    return NextResponse.json({
      success: true,
      ...result,
      message: `Payment of $${Number(amount).toFixed(2)} recorded successfully. Invoice status: ${result.newStatus}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
