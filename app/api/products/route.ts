import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin, isStaff } from "@/lib/auth/rbac";
import { syncRecordToSupabase } from "@/lib/supabase/sync";
import { fetchProducts } from "@/lib/supabase/data";

export async function GET() {
  const products = await fetchProducts();
  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isAdmin(currentUser.role)) {
    return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
  }

  try {
    const { name, type, sales_price, cost_price, notes, variants } = await request.json();

    if (!name || !type) {
      return NextResponse.json({ error: "Product name and type are required" }, { status: 400 });
    }

    const db = getDatabase();
    const productId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    db.prepare(
      `INSERT INTO products (id, name, type, sales_price, cost_price, notes, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`
    ).run(
      productId,
      name.trim(),
      type,
      Number(sales_price) || 0,
      Number(cost_price) || 0,
      notes ? notes.trim() : null
    );

    // Sync to Supabase
    await syncRecordToSupabase("products", {
      id: productId,
      name: name.trim(),
      type,
      sales_price: Number(sales_price) || 0,
      cost_price: Number(cost_price) || 0,
      notes: notes ? notes.trim() : null,
      is_active: true,
    });

    // Insert variants if provided
    if (Array.isArray(variants)) {
      const variantRows: any[] = [];
      for (const v of variants) {
        if (v.attribute && v.value) {
          const variantId = `var_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          db.prepare(
            `INSERT INTO product_variants (id, product_id, attribute, value, extra_price)
             VALUES (?, ?, ?, ?, ?)`
          ).run(variantId, productId, v.attribute.trim(), v.value.trim(), Number(v.extra_price) || 0);
          variantRows.push({
            id: variantId,
            product_id: productId,
            attribute: v.attribute.trim(),
            value: v.value.trim(),
            extra_price: Number(v.extra_price) || 0,
          });
        }
      }
      if (variantRows.length > 0) {
        await syncRecordToSupabase("product_variants", variantRows);
      }
    }

    // Audit log
    db.prepare(
      `INSERT INTO audit_log (actor_id, actor_email, entity, entity_id, action, after_state)
       VALUES (?, ?, 'products', ?, 'PRODUCT_CREATED', ?)`
    ).run(currentUser.id, currentUser.email, productId, JSON.stringify({ name, type, sales_price }));

    return NextResponse.json({ success: true, productId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
