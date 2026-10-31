import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load .env.local manually if it exists
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
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

async function checkSupabaseConnection() {
  console.log("=================================================");
  console.log("  BRIGHTLOOP - SUPABASE LIVE CONNECTION CHECK    ");
  console.log("=================================================");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || url === "" || anonKey === "") {
    console.log("\n⚠️  NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is empty in .env.local");
    console.log("\nFollow these steps to connect your live Supabase project:");
    console.log("1. Go to https://supabase.com and create a free project.");
    console.log("2. Open SQL Editor in your Supabase dashboard.");
    console.log("3. Paste the contents of 'supabase/complete_setup.sql' and click RUN.");
    console.log("4. Go to Project Settings -> API to copy your Project URL and anon public key.");
    console.log("5. Paste them into .env.local and re-run this script!");
    return;
  }

  console.log(`Connecting to: ${url}`);
  const client = createClient(url, serviceKey || anonKey);

  try {
    const { data: products, error: prodErr } = await client
      .from("products")
      .select("id, name, sales_price")
      .limit(5);

    if (prodErr) {
      console.error("❌ Failed to query 'products' table:", prodErr.message);
      console.log("\nDid you run 'supabase/complete_setup.sql' in your Supabase SQL Editor?");
      process.exit(1);
    }

    console.log(`✅ Successfully connected to Supabase!`);
    console.log(`Found ${products.length} products in your Supabase database:`);
    for (const p of products) {
      console.log(` - [${p.id}] ${p.name}: $${p.sales_price}`);
    }

    const { count, error: subErr } = await client
      .from("subscriptions")
      .select("*", { count: "exact", head: true });

    if (!subErr) {
      console.log(`✅ Subscriptions table check passed (${count ?? 0} records).`);
    }

    console.log("\n🎉 Live Supabase database is ready and working perfectly!");
  } catch (err: any) {
    console.error("❌ Connection failed with exception:", err.message);
    process.exit(1);
  }
}

checkSupabaseConnection();
