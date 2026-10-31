import { createClient } from "@supabase/supabase-js";
import { getDatabase } from "../lib/db/database";
import fs from "fs";
import path from "path";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

async function syncAllToSupabase() {
  console.log("=================================================");
  console.log("  SYNC LOCAL PLATFORM DATA TO LIVE SUPABASE      ");
  console.log("=================================================");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const db = getDatabase();

  // Helper for upserting
  async function syncTable(tableName: string, selectQuery?: string) {
    const rows = db.prepare(selectQuery || `SELECT * FROM ${tableName}`).all() as any[];
    if (rows.length === 0) {
      console.log(`- ${tableName}: 0 rows to sync`);
      return;
    }

    // Convert booleans / numbers / user_id if needed
    const cleanedRows = rows.map((r) => {
      const clean: any = { ...r };
      for (const k in clean) {
        // SQLite stores booleans as 0 or 1
        if (["is_active", "auto_close", "closable", "pausable", "renewable"].includes(k)) {
          clean[k] = Boolean(clean[k]);
        }
        // In Supabase, customers.user_id is UUID or NULL
        if (k === "user_id" && clean[k] && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean[k])) {
          clean[k] = null;
        }
      }
      return clean;
    });

    const conflictCol = tableName === "invoices" ? "number" : "id";
    const { error } = await supabase.from(tableName).upsert(cleanedRows, { onConflict: conflictCol });
    if (error) {
      console.error(`❌ Error syncing ${tableName}:`, error.message);
    } else {
      console.log(`✅ Synced ${cleanedRows.length} rows to ${tableName}`);
    }
  }

  console.log("Syncing database tables in dependency order...");
  await syncTable("products");
  await syncTable("product_variants");
  await syncTable("plans");
  await syncTable("payment_terms");
  await syncTable("taxes");
  await syncTable("discounts");
  await syncTable("quotation_templates");
  await syncTable("quotation_template_lines");
  await syncTable("customers");
  await syncTable("subscriptions");
  await syncTable("subscription_lines");
  await syncTable("invoices");
  await syncTable("invoice_lines");
  await syncTable("payments");
  await syncTable("billing_runs");

  console.log("\n🎉 Sync to live Supabase complete!");
}

syncAllToSupabase();
