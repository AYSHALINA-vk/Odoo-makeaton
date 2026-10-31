import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/rbac";
import { format, addDays } from "date-fns";

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
    const { customer_id, payment_terms_id } = await request.json();
    if (!customer_id) {
      return NextResponse.json({ error: "Customer selection is required" }, { status: 400 });
    }

    const db = getDatabase();
    const template = db.prepare(`SELECT * FROM quotation_templates WHERE id = ?`).get(id) as any;
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const templateLines = db
      .prepare(
        `SELECT qtl.*, p.sales_price, pv.extra_price
         FROM quotation_template_lines qtl
         JOIN products p ON qtl.product_id = p.id
         LEFT JOIN product_variants pv ON qtl.variant_id = pv.id
         WHERE qtl.template_id = ?`
      )
      .all(id) as any[];

    // Generate unique subscription number
    const countRow = db.prepare(`SELECT count(*) as count FROM subscriptions`).get() as { count: number };
    const nextNum = (countRow.count + 1).toString().padStart(6, "0");
    const subNumber = `SUB-${nextNum}`;
    const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const todayStr = format(new Date(), "yyyy-MM-dd");
    const expiryDateStr = format(addDays(new Date(), template.validity_days || 30), "yyyy-MM-dd");

    // Default payment terms if not supplied
    const termsId = payment_terms_id || "pt_15";

    // Insert new subscription in 'quotation' status
    db.prepare(
      `INSERT INTO subscriptions (
        id, number, customer_id, plan_id, start_date, expiry_date, payment_terms_id,
        status, next_billing_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'quotation', ?)`
    ).run(
      subId,
      subNumber,
      customer_id,
      template.plan_id,
      todayStr,
      expiryDateStr,
      termsId,
      todayStr
    );

    // Insert subscription lines from template
    for (const line of templateLines) {
      const lineId = `sl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const unitPrice = Number(line.sales_price) + (line.extra_price ? Number(line.extra_price) : 0);
      const qty = Number(line.quantity) || 1;
      const amount = qty * unitPrice;

      db.prepare(
        `INSERT INTO subscription_lines (
          id, subscription_id, product_id, variant_id, quantity, unit_price, tax_id, discount_id, amount
        ) VALUES (?, ?, ?, ?, ?, ?, 'tax_vat20', null, ?)`
      ).run(
        lineId,
        subId,
        line.product_id,
        line.variant_id || null,
        qty,
        unitPrice,
        amount
      );
    }

    // Audit log
    db.prepare(
      `INSERT INTO audit_log (actor_id, actor_email, entity, entity_id, action, after_state)
       VALUES (?, ?, 'subscriptions', ?, 'QUOTATION_CREATED_FROM_TEMPLATE', ?)`
    ).run(
      currentUser.id,
      currentUser.email,
      subId,
      JSON.stringify({ template_id: id, sub_number: subNumber, customer_id })
    );

    return NextResponse.json({ success: true, subscriptionId: subId, number: subNumber });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
