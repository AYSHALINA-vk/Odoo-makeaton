import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin, isStaff } from "@/lib/auth/rbac";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isStaff(currentUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const db = getDatabase();
  const discounts = db
    .prepare(
      `SELECT d.*, p.name as product_name 
       FROM discounts d
       LEFT JOIN products p ON d.product_id = p.id
       ORDER BY d.created_at DESC`
    )
    .all();

  return NextResponse.json({ discounts });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  // FR-DISC-1: ONLY ADMIN can create discounts!
  if (!currentUser || !isAdmin(currentUser.role)) {
    return NextResponse.json(
      { error: "Forbidden: Only Administrators can create discounts" },
      { status: 403 }
    );
  }

  try {
    const data = await request.json();
    const {
      name,
      type,
      value,
      min_purchase,
      min_quantity,
      start_date,
      end_date,
      usage_limit,
      scope,
      product_id,
    } = data;

    if (!name || !type || value == null) {
      return NextResponse.json({ error: "Name, type, and value are required" }, { status: 400 });
    }

    const db = getDatabase();
    const discountId = `disc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    db.prepare(
      `INSERT INTO discounts (
        id, name, type, value, min_purchase, min_quantity, start_date, end_date,
        usage_limit, times_used, scope, product_id, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1)`
    ).run(
      discountId,
      name.trim(),
      type,
      Number(value),
      min_purchase ? Number(min_purchase) : null,
      min_quantity ? Number(min_quantity) : null,
      start_date || null,
      end_date || null,
      usage_limit ? Number(usage_limit) : null,
      scope || "subscription",
      scope === "product" ? product_id || null : null
    );

    // Audit log
    db.prepare(
      `INSERT INTO audit_log (actor_id, actor_email, entity, entity_id, action, after_state)
       VALUES (?, ?, 'discounts', ?, 'DISCOUNT_CREATED', ?)`
    ).run(currentUser.id, currentUser.email, discountId, JSON.stringify({ name, type, value }));

    return NextResponse.json({ success: true, discountId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
