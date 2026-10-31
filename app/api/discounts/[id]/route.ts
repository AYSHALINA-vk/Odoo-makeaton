import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/rbac";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser || !isAdmin(currentUser.role)) {
    return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
  }

  try {
    const data = await request.json();
    const db = getDatabase();

    db.prepare(
      `UPDATE discounts 
       SET name = ?, type = ?, value = ?, min_purchase = ?, min_quantity = ?,
           start_date = ?, end_date = ?, usage_limit = ?, scope = ?, product_id = ?,
           is_active = ?
       WHERE id = ?`
    ).run(
      data.name.trim(),
      data.type,
      Number(data.value),
      data.min_purchase ? Number(data.min_purchase) : null,
      data.min_quantity ? Number(data.min_quantity) : null,
      data.start_date || null,
      data.end_date || null,
      data.usage_limit ? Number(data.usage_limit) : null,
      data.scope || "subscription",
      data.scope === "product" ? data.product_id || null : null,
      data.is_active ? 1 : 0,
      id
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser || !isAdmin(currentUser.role)) {
    return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
  }

  const db = getDatabase();
  db.prepare(`UPDATE discounts SET is_active = 0 WHERE id = ?`).run(id);
  return NextResponse.json({ success: true });
}
