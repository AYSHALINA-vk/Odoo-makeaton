import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin, isStaff } from "@/lib/auth/rbac";
import { syncRecordToSupabase } from "@/lib/supabase/sync";
import { fetchDiscounts } from "@/lib/supabase/data";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isStaff(currentUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const discounts = await fetchDiscounts();
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

    const discountRow = {
      id: discountId,
      name: name.trim(),
      type,
      value: Number(value),
      min_purchase: min_purchase ? Number(min_purchase) : null,
      min_quantity: min_quantity ? Number(min_quantity) : null,
      start_date: start_date || null,
      end_date: end_date || null,
      usage_limit: usage_limit ? Number(usage_limit) : null,
      times_used: 0,
      scope: scope || "subscription",
      product_id: scope === "product" ? product_id || null : null,
      is_active: true,
    };

    db.prepare(
      `INSERT INTO discounts (
        id, name, type, value, min_purchase, min_quantity, start_date, end_date,
        usage_limit, times_used, scope, product_id, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1)`
    ).run(
      discountRow.id,
      discountRow.name,
      discountRow.type,
      discountRow.value,
      discountRow.min_purchase,
      discountRow.min_quantity,
      discountRow.start_date,
      discountRow.end_date,
      discountRow.usage_limit,
      discountRow.scope,
      discountRow.product_id
    );

    await syncRecordToSupabase("discounts", discountRow);

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
