import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/rbac";
import { syncRecordToSupabase } from "@/lib/supabase/sync";

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

    const inv = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(id) as any;
    if (!inv) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    let newStatus = inv.status;
    let message = "";

    switch (action) {
      case "confirm":
        if (inv.status !== "draft") {
          return NextResponse.json({ error: "Only draft invoices can be confirmed" }, { status: 400 });
        }
        newStatus = "confirmed";
        message = "Invoice confirmed and locked for billing collection.";
        break;

      case "cancel":
        if (inv.status === "paid") {
          return NextResponse.json({ error: "Cannot cancel an invoice that is already paid" }, { status: 400 });
        }
        if (inv.amount_paid > 0) {
          return NextResponse.json({ error: "Cannot cancel an invoice with recorded payments" }, { status: 400 });
        }
        newStatus = "cancelled";
        message = "Invoice cancelled.";
        break;

      case "send":
        // Mock email sending
        message = `Invoice ${inv.number} successfully sent to customer email.`;
        // Audit log
        db.prepare(
          `INSERT INTO audit_log (actor_id, actor_email, entity, entity_id, action, after_state)
           VALUES (?, ?, 'invoices', ?, 'INVOICE_SENT_EMAIL', ?)`
        ).run(currentUser.id, currentUser.email, id, JSON.stringify({ invoice_number: inv.number }));

        return NextResponse.json({ success: true, message });

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    db.prepare(`UPDATE invoices SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(
      newStatus,
      id
    );

    // Sync updated invoice to Supabase
    await syncRecordToSupabase("invoices", {
      id,
      status: newStatus,
      updated_at: new Date().toISOString(),
    });

    // Audit log
    db.prepare(
      `INSERT INTO audit_log (actor_id, actor_email, entity, entity_id, action, before_state, after_state)
       VALUES (?, ?, 'invoices', ?, ?, ?, ?)`
    ).run(
      currentUser.id,
      currentUser.email,
      id,
      `INVOICE_${action.toUpperCase()}`,
      JSON.stringify({ status: inv.status }),
      JSON.stringify({ status: newStatus })
    );

    return NextResponse.json({ success: true, status: newStatus, message });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
