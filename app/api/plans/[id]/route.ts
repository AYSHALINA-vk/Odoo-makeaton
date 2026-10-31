import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/rbac";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDatabase();
  const plan = db.prepare(`SELECT * FROM plans WHERE id = ?`).get(id);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  return NextResponse.json({ plan });
}

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
      `UPDATE plans 
       SET name = ?, price = ?, billing_period = ?, min_quantity = ?,
           available_from = ?, available_to = ?, auto_close = ?, closable = ?,
           pausable = ?, renewable = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      data.name.trim(),
      Number(data.price) || 0,
      data.billing_period,
      Math.max(1, Number(data.min_quantity) || 1),
      data.available_from || null,
      data.available_to || null,
      data.auto_close ? 1 : 0,
      data.closable ? 1 : 0,
      data.pausable ? 1 : 0,
      data.renewable ? 1 : 0,
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
  db.prepare(`UPDATE plans SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).run(id);
  return NextResponse.json({ success: true });
}
