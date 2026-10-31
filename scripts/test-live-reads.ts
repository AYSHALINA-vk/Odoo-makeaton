import { fetchProducts, fetchCustomers, fetchSubscriptions, fetchInvoices, isSupabaseActive } from "../lib/supabase/data";
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

async function testLive() {
  console.log("Supabase active:", isSupabaseActive());
  const products = await fetchProducts();
  console.log(`✅ Loaded ${products.length} products (live):`);
  products.forEach((p) => console.log(`   - ${p.name} ($${p.sales_price}) [${p.variants?.length || 0} variants]`));

  const customers = await fetchCustomers();
  console.log(`✅ Loaded ${customers.length} customers (live):`);
  customers.forEach((c) => console.log(`   - ${c.name} (${c.company})`));

  const subs = await fetchSubscriptions();
  console.log(`✅ Loaded ${subs.length} subscriptions (live):`);
  subs.slice(0, 3).forEach((s) => console.log(`   - ${s.number}: ${s.customer_name} [${s.status}]`));

  const invoices = await fetchInvoices();
  console.log(`✅ Loaded ${invoices.length} invoices (live):`);
  invoices.slice(0, 3).forEach((i) => console.log(`   - ${i.number}: $${i.total} [${i.status}]`));
}

testLive();
