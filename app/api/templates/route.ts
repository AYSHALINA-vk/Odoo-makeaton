import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/rbac";
import { syncRecordToSupabase } from "@/lib/supabase/sync";

export async function GET() {
  const db = getDatabase();
  const templates = db
    .prepare(
      `SELECT qt.*, p.name as plan_name, p.price as plan_price, p.billing_period
       FROM quotation_templates qt
       JOIN plans p ON qt.plan_id = p.id
       ORDER BY qt.name ASC`
    )
    .all() as any[];

  const lines = db
    .prepare(
      `SELECT qtl.*, p.name as product_name, p.sales_price, pv.value as variant_name, pv.extra_price
       FROM quotation_template_lines qtl
       JOIN products p ON qtl.product_id = p.id
       LEFT JOIN product_variants pv ON qtl.variant_id = pv.id`
    )
    .all() as any[];

  const templatesWithLines = templates.map((t) => ({
    ...t,
    lines: lines.filter((l) => l.template_id === t.id),
  }));

  return NextResponse.json({ templates: templatesWithLines });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isStaff(currentUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { name, plan_id, validity_days, lines } = await request.json();
    if (!name || !plan_id) {
      return NextResponse.json({ error: "Template name and plan are required" }, { status: 400 });
    }

    const db = getDatabase();
    const templateId = `qt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const templateRow = {
      id: templateId,
      name: name.trim(),
      plan_id,
      validity_days: Number(validity_days) || 30,
    };

    db.prepare(
      `INSERT INTO quotation_templates (id, name, plan_id, validity_days)
       VALUES (?, ?, ?, ?)`
    ).run(templateRow.id, templateRow.name, templateRow.plan_id, templateRow.validity_days);

    await syncRecordToSupabase("quotation_templates", templateRow);

    if (Array.isArray(lines)) {
      const lineRows: any[] = [];
      for (const line of lines) {
        if (line.product_id) {
          const lineId = `qtl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          db.prepare(
            `INSERT INTO quotation_template_lines (id, template_id, product_id, variant_id, quantity)
             VALUES (?, ?, ?, ?, ?)`
          ).run(lineId, templateId, line.product_id, line.variant_id || null, Number(line.quantity) || 1);
          lineRows.push({
            id: lineId,
            template_id: templateId,
            product_id: line.product_id,
            variant_id: line.variant_id || null,
            quantity: Number(line.quantity) || 1,
          });
        }
      }
      if (lineRows.length > 0) {
        await syncRecordToSupabase("quotation_template_lines", lineRows);
      }
    }

    return NextResponse.json({ success: true, templateId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
