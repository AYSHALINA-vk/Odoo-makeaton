import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { getCurrentUser } from "@/lib/auth/session";
import { isCustomer } from "@/lib/auth/rbac";
import { format } from "date-fns";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDatabase();
  const today = format(new Date(), "yyyy-MM-dd");

  const inv = db
    .prepare(
      `SELECT i.*, 
              c.name as customer_name, c.company as customer_company, c.email as customer_email,
              c.phone as customer_phone, c.billing_address as customer_address, c.tax_id as customer_tax_id,
              c.user_id as customer_user_id,
              s.number as subscription_number,
              (i.total - i.amount_paid) as balance_due,
              CASE 
                WHEN i.status = 'confirmed' AND i.total > i.amount_paid AND i.due_date < ? THEN 1 
                ELSE 0 
              END as is_overdue
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       JOIN subscriptions s ON i.subscription_id = s.id
       WHERE i.id = ?`
    )
    .get(today, id) as any;

  if (!inv) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Customer isolation check
  if (isCustomer(currentUser.role) && inv.customer_user_id !== currentUser.id) {
    return NextResponse.json({ error: "Forbidden: Not your invoice" }, { status: 403 });
  }

  const lines = db.prepare(`SELECT * FROM invoice_lines WHERE invoice_id = ?`).all(id) as any[];
  const payments = db
    .prepare(`SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC`)
    .all(id) as any[];

  return NextResponse.json({ invoice: inv, lines, payments });
}
