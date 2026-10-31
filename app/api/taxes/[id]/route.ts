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
    const { name, rate, applies_to, is_active } = await request.json();
    const db = getDatabase();

    db.prepare(
      `UPDATE taxes 
       SET name = ?, rate = ?, applies_to = ?, is_active = ?
       WHERE id = ?`
    ).run(name.trim(), Number(rate), applies_to || "all", is_active ? 1 : 0, id);

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
  db.prepare(`UPDATE taxes SET is_active = 0 WHERE id = ?`).run(id);
  return NextResponse.json({ success: true });
}
