import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { getCurrentUser } from "@/lib/auth/session";
import { isCustomer } from "@/lib/auth/rbac";
import { format } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseActive } from "@/lib/supabase/data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = format(new Date(), "yyyy-MM-dd");

  if (isSupabaseActive()) {
    try {
      const supabase = createAdminClient();
      const { data: inv, error: iErr } = await supabase
        .from("invoices")
        .select(`
          *,
          customer:customers(*),
          subscription:subscriptions(number),
          lines:invoice_lines(*),
          payments:payments(*)
        `)
        .eq("id", id)
        .single();

      if (!iErr && inv) {
        if (isCustomer(currentUser.role) && inv.customer?.user_id !== currentUser.id) {
          return NextResponse.json({ error: "Forbidden: Not your invoice" }, { status: 403 });
        }

        const tot = Number(inv.total) || 0;
        const paid = Number(inv.amount_paid) || 0;
        const formatted = {
          ...inv,
          customer_name: inv.customer?.name,
          customer_company: inv.customer?.company,
          customer_email: inv.customer?.email,
          customer_phone: inv.customer?.phone,
          customer_address: inv.customer?.billing_address,
          customer_tax_id: inv.customer?.tax_id,
          subscription_number: inv.subscription?.number,
          balance_due: tot - paid,
          is_overdue: inv.status === "confirmed" && tot > paid && inv.due_date < today ? 1 : 0,
        };

        return NextResponse.json({
          invoice: formatted,
          lines: inv.lines || [],
          payments: inv.payments || [],
        });
      }
    } catch (err: any) {
      console.warn("[Invoice Detail] Supabase fetch fallback:", err.message);
    }
  }

  const db = getDatabase();

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
