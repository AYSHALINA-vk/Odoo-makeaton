import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { getCurrentUser } from "@/lib/auth/session";
import { isCustomer, isStaff } from "@/lib/auth/rbac";
import { syncRecordToSupabase } from "@/lib/supabase/sync";
import { fetchSubscriptions } from "@/lib/supabase/data";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status") || undefined;
  const customerFilter = searchParams.get("customerId") || undefined;

  const subscriptions = await fetchSubscriptions({
    userId: isCustomer(currentUser.role) ? currentUser.id : undefined,
    customerId: customerFilter,
    status: statusFilter,
  });

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
