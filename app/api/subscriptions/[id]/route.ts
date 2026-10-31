import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { getCurrentUser } from "@/lib/auth/session";
import { isCustomer } from "@/lib/auth/rbac";
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

  if (isSupabaseActive()) {
    try {
      const supabase = createAdminClient();
      const { data: sub, error: sErr } = await supabase
        .from("subscriptions")
        .select(`
          *,
          customer:customers(*),
          plan:plans(*),
          payment_terms:payment_terms(*),
          lines:subscription_lines(
            *,
            product:products(*),
            variant:product_variants(*),
            tax:taxes(*),
            discount:discounts(*)
          ),
          invoices:invoices(*)
        `)
        .eq("id", id)
        .single();

      if (!sErr && sub) {
        if (isCustomer(currentUser.role) && sub.customer?.user_id !== currentUser.id) {
          return NextResponse.json({ error: "Forbidden: Access to this subscription is restricted" }, { status: 403 });
        }

        const formatted = {
          ...sub,
          customer_name: sub.customer?.name,
          customer_company: sub.customer?.company,
          customer_email: sub.customer?.email,
          customer_phone: sub.customer?.phone,
          billing_address: sub.customer?.billing_address,
          plan_name: sub.plan?.name,
          billing_period: sub.plan?.billing_period,
          plan_price: sub.plan?.price,
          auto_close: sub.plan?.auto_close,
          closable: sub.plan?.closable,
          pausable: sub.plan?.pausable,
          renewable: sub.plan?.renewable,
          min_quantity: sub.plan?.min_quantity,
          payment_terms_name: sub.payment_terms?.name,
          days_due: sub.payment_terms?.days_due,
          lines: (sub.lines || []).map((l: any) => ({
            ...l,
            product_name: l.product?.name,
            product_type: l.product?.type,
            variant_name: l.variant?.value,
            variant_attribute: l.variant?.attribute,
            variant_extra: l.variant?.extra_price,
            tax_name: l.tax?.name,
            tax_rate: l.tax?.rate,
            discount_name: l.discount?.name,
            discount_type: l.discount?.type,
            discount_value: l.discount?.value,
          })),
          invoices: sub.invoices || [],
        };

        return NextResponse.json({ subscription: formatted });
      }
    } catch (err: any) {
      console.warn("[Subscription Detail] Supabase fetch fallback:", err.message);
    }
  }

  const db = getDatabase();
  const sub = db
    .prepare(
      `SELECT s.*, 
              c.id as customer_id, c.name as customer_name, c.company as customer_company,
              c.email as customer_email, c.phone as customer_phone, c.billing_address,
              c.user_id as customer_user_id,
              p.name as plan_name, p.billing_period, p.price as plan_price,
              p.auto_close, p.closable, p.pausable, p.renewable, p.min_quantity,
              pt.name as payment_terms_name, pt.days_due
       FROM subscriptions s
       JOIN customers c ON s.customer_id = c.id
       JOIN plans p ON s.plan_id = p.id
       JOIN payment_terms pt ON s.payment_terms_id = pt.id
       WHERE s.id = ?`
    )
    .get(id) as any;

  if (!sub) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  // Tenant / Customer isolation check
  if (isCustomer(currentUser.role) && sub.customer_user_id !== currentUser.id) {
    return NextResponse.json({ error: "Forbidden: Access to this subscription is restricted" }, { status: 403 });
  }

  // Fetch lines
  const lines = db
    .prepare(
      `SELECT sl.*, 
              p.name as product_name, p.type as product_type,
              pv.value as variant_name, pv.attribute as variant_attribute, pv.extra_price as variant_extra,
              t.name as tax_name, t.rate as tax_rate,
              d.name as discount_name, d.type as discount_type, d.value as discount_value
       FROM subscription_lines sl
       JOIN products p ON sl.product_id = p.id
       LEFT JOIN product_variants pv ON sl.variant_id = pv.id
       LEFT JOIN taxes t ON sl.tax_id = t.id
       LEFT JOIN discounts d ON sl.discount_id = d.id
       WHERE sl.subscription_id = ?`
    )
    .all(id) as any[];

  // Fetch associated invoices
  const invoices = db
    .prepare(
      `SELECT * FROM invoices 
       WHERE subscription_id = ? 
       ORDER BY invoice_date DESC`
    )
    .all(id) as any[];

  return NextResponse.json({ subscription: sub, lines, invoices });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser || isCustomer(currentUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const data = await request.json();
    const db = getDatabase();

    db.prepare(
      `UPDATE subscriptions 
       SET plan_id = ?, start_date = ?, expiry_date = ?, payment_terms_id = ?,
           next_billing_date = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      data.plan_id,
      data.start_date,
      data.expiry_date,
      data.payment_terms_id,
      data.next_billing_date,
      id
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
