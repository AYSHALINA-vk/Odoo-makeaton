import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { getCurrentUser } from "@/lib/auth/session";
import { isCustomer, isStaff } from "@/lib/auth/rbac";
import { syncRecordToSupabase } from "@/lib/supabase/sync";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");
  const customerFilter = searchParams.get("customerId");

  const db = getDatabase();

  let query = `
    SELECT s.*, 
           c.name as customer_name, c.company as customer_company, c.email as customer_email,
           p.name as plan_name, p.billing_period, p.price as plan_price,
           p.auto_close, p.closable, p.pausable, p.renewable,
           pt.name as payment_terms_name, pt.days_due,
           (SELECT COALESCE(sum(amount), 0) FROM subscription_lines WHERE subscription_id = s.id) as sub_total
    FROM subscriptions s
    JOIN customers c ON s.customer_id = c.id
    JOIN plans p ON s.plan_id = p.id
    JOIN payment_terms pt ON s.payment_terms_id = pt.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Customer isolation (FR-PORTAL-1: customers can only view their own subscriptions!)
  if (isCustomer(currentUser.role)) {
    query += ` AND c.user_id = ?`;
    params.push(currentUser.id);
  } else if (customerFilter) {
    query += ` AND s.customer_id = ?`;
    params.push(customerFilter);
  }

  if (statusFilter && statusFilter !== "all") {
    query += ` AND s.status = ?`;
    params.push(statusFilter);
  }

  query += ` ORDER BY s.created_at DESC`;

  const subscriptions = db.prepare(query).all(...params);
  return NextResponse.json({ subscriptions });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isStaff(currentUser.role)) {
    return NextResponse.json({ error: "Unauthorized: Staff access required" }, { status: 403 });
  }

  try {
    const data = await request.json();
    const {
      customer_id,
      plan_id,
      start_date,
      expiry_date,
      payment_terms_id,
      status,
      lines,
    } = data;

    if (!customer_id || !plan_id || !start_date || !expiry_date) {
      return NextResponse.json(
        { error: "Customer, plan, start date, and expiry date are required" },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Fetch plan details to validate minimum quantity and availability
    const plan = db.prepare(`SELECT * FROM plans WHERE id = ?`).get(plan_id) as any;
    if (!plan) {
      return NextResponse.json({ error: "Selected plan does not exist" }, { status: 400 });
    }

    // Check plan availability dates
    if (plan.available_from && start_date < plan.available_from) {
      return NextResponse.json(
        { error: `Plan is only available from ${plan.available_from}` },
        { status: 400 }
      );
    }
    if (plan.available_to && start_date > plan.available_to) {
      return NextResponse.json(
        { error: `Plan availability ended on ${plan.available_to}` },
        { status: 400 }
      );
    }

    // Check minimum quantity requirement (FR-PLAN-3)
    const minQty = Number(plan.min_quantity) || 1;
    if (Array.isArray(lines)) {
      for (const line of lines) {
        if (Number(line.quantity) < minQty) {
          return NextResponse.json(
            { error: `Line quantity (${line.quantity}) must be at least the plan minimum (${minQty})` },
            { status: 400 }
          );
        }
      }
    }

    const countRow = db.prepare(`SELECT count(*) as count FROM subscriptions`).get() as { count: number };
    const nextNum = (countRow.count + 1).toString().padStart(6, "0");
    const subNumber = `SUB-${nextNum}`;
    const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const initialStatus = status || "draft";
    const termsId = payment_terms_id || "pt_15";

    const subRow = {
      id: subId,
      number: subNumber,
      customer_id,
      plan_id,
      start_date,
      expiry_date,
      payment_terms_id: termsId,
      status: initialStatus,
      next_billing_date: start_date,
    };

    db.prepare(
      `INSERT INTO subscriptions (
        id, number, customer_id, plan_id, start_date, expiry_date, payment_terms_id,
        status, next_billing_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      subRow.id,
      subRow.number,
      subRow.customer_id,
      subRow.plan_id,
      subRow.start_date,
      subRow.expiry_date,
      subRow.payment_terms_id,
      subRow.status,
      subRow.next_billing_date
    );

    await syncRecordToSupabase("subscriptions", subRow);

    // Insert lines
    if (Array.isArray(lines)) {
      const lineRows: any[] = [];
      for (const line of lines) {
        if (line.product_id) {
          const lineId = `sl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const unitPrice = Number(line.unit_price) || 0;
          const qty = Number(line.quantity) || 1;
          const amount = qty * unitPrice;

          db.prepare(
            `INSERT INTO subscription_lines (
              id, subscription_id, product_id, variant_id, quantity, unit_price,
              tax_id, discount_id, amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            lineId,
            subId,
            line.product_id,
            line.variant_id || null,
            qty,
            unitPrice,
            line.tax_id || null,
            line.discount_id || null,
            amount
          );

          lineRows.push({
            id: lineId,
            subscription_id: subId,
            product_id: line.product_id,
            variant_id: line.variant_id || null,
            quantity: qty,
            unit_price: unitPrice,
            tax_id: line.tax_id || null,
            discount_id: line.discount_id || null,
            amount,
          });
        }
      }
      if (lineRows.length > 0) {
        await syncRecordToSupabase("subscription_lines", lineRows);
      }
    }

    // Audit log
    db.prepare(
      `INSERT INTO audit_log (actor_id, actor_email, entity, entity_id, action, after_state)
       VALUES (?, ?, 'subscriptions', ?, 'SUBSCRIPTION_CREATED', ?)`
    ).run(
      currentUser.id,
      currentUser.email,
      subId,
      JSON.stringify({ number: subNumber, customer_id, status: initialStatus })
    );

    return NextResponse.json({ success: true, subscriptionId: subId, number: subNumber });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
