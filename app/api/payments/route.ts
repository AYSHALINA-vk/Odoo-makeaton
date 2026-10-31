import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { recordPayment } from "@/lib/db/billing-engine";
import { getCurrentUser } from "@/lib/auth/session";
import { isCustomer, isStaff } from "@/lib/auth/rbac";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDatabase();
  let query = `
    SELECT p.*, 
           i.number as invoice_number, i.total as invoice_total, i.status as invoice_status,
           c.name as customer_name, c.company as customer_company
    FROM payments p
    JOIN invoices i ON p.invoice_id = i.id
    JOIN customers c ON i.customer_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Customer isolation
  if (isCustomer(currentUser.role)) {
    query += ` AND c.user_id = ?`;
    params.push(currentUser.id);
  }

  query += ` ORDER BY p.payment_date DESC, p.created_at DESC`;

  const payments = db.prepare(query).all(...params);
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

    // Audit log
    const db = getDatabase();
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
