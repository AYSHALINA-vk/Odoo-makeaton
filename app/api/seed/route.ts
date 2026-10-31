import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/db/seed";
import { syncRecordToSupabase } from "@/lib/supabase/sync";
import { getDatabase } from "@/lib/db/database";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";
    const res = seedDatabase(force);
    return NextResponse.json({ success: true, ...res });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const res = seedDatabase(body.force === true);

    // Sync state to Supabase
    try {
      const db = getDatabase();
      const tables = [
        "products",
        "product_variants",
        "plans",
        "payment_terms",
        "taxes",
        "discounts",
        "quotation_templates",
        "quotation_template_lines",
        "customers",
        "subscriptions",
        "subscription_lines",
        "invoices",
        "invoice_lines",
        "payments",
        "billing_runs",
      ];
      for (const t of tables) {
        const rows = db.prepare(`SELECT * FROM ${t}`).all();
        await syncRecordToSupabase(t, rows);
      }
    } catch (err: any) {
      console.warn("Could not sync re-seeded state to Supabase:", err.message);
    }

    return NextResponse.json({ success: true, ...res, syncedToSupabase: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
