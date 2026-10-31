import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/rbac";

export async function GET() {
  const db = getDatabase();
  const plans = db.prepare(`SELECT * FROM plans ORDER BY price ASC`).all();
  return NextResponse.json({ plans });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isAdmin(currentUser.role)) {
    return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
  }

  try {
    const data = await request.json();
    const {
      name,
      price,
      billing_period,
      min_quantity,
      available_from,
      available_to,
      auto_close,
      closable,
      pausable,
      renewable,
    } = data;

    if (!name || !billing_period) {
      return NextResponse.json({ error: "Plan name and billing period are required" }, { status: 400 });
    }

    const db = getDatabase();
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    db.prepare(
      `INSERT INTO plans (
        id, name, price, billing_period, min_quantity, available_from, available_to,
        auto_close, closable, pausable, renewable, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
    ).run(
      planId,
      name.trim(),
      Number(price) || 0,
      billing_period,
      Math.max(1, Number(min_quantity) || 1),
      available_from || null,
      available_to || null,
      auto_close ? 1 : 0,
      closable !== false ? 1 : 0,
      pausable !== false ? 1 : 0,
      renewable !== false ? 1 : 0
    );

    // Audit log
    db.prepare(
      `INSERT INTO audit_log (actor_id, actor_email, entity, entity_id, action, after_state)
       VALUES (?, ?, 'plans', ?, 'PLAN_CREATED', ?)`
    ).run(currentUser.id, currentUser.email, planId, JSON.stringify({ name, billing_period, price }));

    return NextResponse.json({ success: true, planId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
