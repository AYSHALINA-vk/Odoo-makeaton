import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/rbac";
import { syncRecordToSupabase } from "@/lib/supabase/sync";

export async function GET() {
  const db = getDatabase();
  const taxes = db.prepare(`SELECT * FROM taxes ORDER BY rate ASC`).all();
  return NextResponse.json({ taxes });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isAdmin(currentUser.role)) {
    return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
  }

  try {
    const { name, rate, applies_to } = await request.json();
    if (!name || rate == null) {
      return NextResponse.json({ error: "Tax name and rate are required" }, { status: 400 });
    }

    const db = getDatabase();
    const taxId = `tax_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const taxRow = {
      id: taxId,
      name: name.trim(),
      rate: Number(rate),
      applies_to: applies_to || "all",
      is_active: true,
    };

    db.prepare(
      `INSERT INTO taxes (id, name, rate, applies_to, is_active)
       VALUES (?, ?, ?, ?, 1)`
    ).run(taxRow.id, taxRow.name, taxRow.rate, taxRow.applies_to);

    await syncRecordToSupabase("taxes", taxRow);

    // Audit log
    db.prepare(
      `INSERT INTO audit_log (actor_id, actor_email, entity, entity_id, action, after_state)
       VALUES (?, ?, 'taxes', ?, 'TAX_CREATED', ?)`
    ).run(currentUser.id, currentUser.email, taxId, JSON.stringify({ name, rate }));

    return NextResponse.json({ success: true, taxId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
