import { createClient } from "@supabase/supabase-js";
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

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const s = createClient(url, key);

  const tables = [
    "profiles",
    "customers",
    "products",
    "product_variants",
    "plans",
    "payment_terms",
    "taxes",
    "discounts",
    "quotation_templates",
    "subscriptions",
    "subscription_lines",
    "invoices",
    "payments",
    "billing_runs",
  ];

  console.log("Checking Supabase tables for project:", url);
  for (const t of tables) {
    const { data, error } = await s.from(t).select("*");
    if (error) {
      console.log(`- ${t}: ❌ ${error.message}`);
    } else {
      console.log(`- ${t}: ✅ ${data.length} records`);
    }
  }
}

main();
