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
  const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(id) as any;

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const variants = db
    .prepare(`SELECT * FROM product_variants WHERE product_id = ?`)
    .all(id) as any[];

  return NextResponse.json({ product: { ...product, variants } });
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
    const { name, type, sales_price, cost_price, notes, is_active, variants } = await request.json();
    const db = getDatabase();

    db.prepare(
      `UPDATE products 
       SET name = ?, type = ?, sales_price = ?, cost_price = ?, notes = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      name.trim(),
      type,
      Number(sales_price) || 0,
      Number(cost_price) || 0,
      notes ? notes.trim() : null,
      is_active ? 1 : 0,
      id
    );

    // Update variants if provided
    if (Array.isArray(variants)) {
      db.prepare(`DELETE FROM product_variants WHERE product_id = ?`).run(id);
      for (const v of variants) {
        if (v.attribute && v.value) {
          const variantId = v.id || `var_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          db.prepare(
            `INSERT INTO product_variants (id, product_id, attribute, value, extra_price)
             VALUES (?, ?, ?, ?, ?)`
          ).run(variantId, id, v.attribute.trim(), v.value.trim(), Number(v.extra_price) || 0);
        }
      }
    }

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
  // Soft-delete by setting is_active = 0
  db.prepare(`UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).run(id);
  return NextResponse.json({ success: true });
}
