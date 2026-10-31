import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseActive } from "@/lib/supabase/data";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser || !isStaff(currentUser.role)) {
    return NextResponse.json({ error: "Unauthorized: Staff access required" }, { status: 403 });
  }

  try {
    const { action } = await request.json();
    const db = getDatabase();

    // 1. Resolve invoice from Supabase if active
    let supaInv: any = null;
    if (isSupabaseActive()) {
      try {
        const supabase = createAdminClient();
        const { data } = await supabase
          .from("invoices")
          .select("*")
          .or(`id.eq.${id},number.eq.${id}`)
          .maybeSingle();
        supaInv = data;
      } catch (err: any) {
        console.warn("[Invoice Action] Supabase fetch warning:", err.message);
      }
    }

    // 2. Resolve invoice from SQLite
    let localInv = db.prepare(`SELECT * FROM invoices WHERE id = ? OR number = ?`).get(id, id) as any;
    if (!localInv && supaInv) {
      localInv = db.prepare(`SELECT * FROM invoices WHERE number = ? OR id = ?`).get(supaInv.number, supaInv.id) as any;
    }

    const inv = supaInv || localInv;
    if (!inv) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const currentStatus = inv.status;
    const amountPaid = Number(inv.amount_paid || 0);
    const invNumber = inv.number;
    const invoiceId = supaInv?.id || localInv?.id || id;

    let newStatus = currentStatus;
    let message = "";

    switch (action) {
      case "confirm":
        if (currentStatus !== "draft") {
          return NextResponse.json({ error: "Only draft invoices can be confirmed" }, { status: 400 });
        }
        newStatus = "confirmed";
        message = "Invoice confirmed and locked for billing collection.";
        break;

      case "cancel":
        if (currentStatus === "paid") {
          return NextResponse.json({ error: "Cannot cancel an invoice that is already paid" }, { status: 400 });
        }
        if (amountPaid > 0) {
          return NextResponse.json({ error: "Cannot cancel an invoice with recorded payments" }, { status: 400 });
        }
        newStatus = "cancelled";
        message = "Invoice cancelled.";
        break;

      case "send":
        // Mock email sending
        message = `Invoice ${invNumber} successfully sent to customer email.`;
        // Audit log in SQLite
        db.prepare(
          `INSERT INTO audit_log (actor_id, actor_email, entity, entity_id, action, after_state)
           VALUES (?, ?, 'invoices', ?, 'INVOICE_SENT_EMAIL', ?)`
        ).run(currentUser.id, currentUser.email, invoiceId, JSON.stringify({ invoice_number: invNumber }));

        return NextResponse.json({ success: true, message });

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    // 3. Update Supabase if active
    if (isSupabaseActive()) {
      try {
        const supabase = createAdminClient();
        await supabase
          .from("invoices")
          .update({ status: newStatus, updated_at: nowIso })
          .or(`id.eq.${invoiceId},number.eq.${invNumber}`);
      } catch (err: any) {
        console.warn("[Invoice Action] Supabase update warning:", err.message);
      }
    }

    // 4. Update SQLite
    db.prepare(
      `UPDATE invoices SET status = ?, updated_at = datetime('now') WHERE number = ? OR id = ?`
    ).run(newStatus, invNumber, invoiceId);

    // 5. Audit log
    db.prepare(
      `INSERT INTO audit_log (actor_id, actor_email, entity, entity_id, action, before_state, after_state)
       VALUES (?, ?, 'invoices', ?, ?, ?, ?)`
    ).run(
      currentUser.id,
      currentUser.email,
      invoiceId,
      `INVOICE_${action.toUpperCase()}`,
      JSON.stringify({ status: currentStatus }),
      JSON.stringify({ status: newStatus })
    );

    return NextResponse.json({ success: true, status: newStatus, message });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
