import { createClient } from "@supabase/supabase-js";
import { getDatabase } from "../lib/db/database";
import crypto from "crypto";
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

async function syncProfiles() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key);
  const db = getDatabase();

  const profiles = db.prepare(`SELECT * FROM profiles`).all() as any[];
  console.log(`Found ${profiles.length} profiles locally.`);

  for (const p of profiles) {
    // Generate deterministic UUID from email
    const hash = crypto.createHash("md5").update(p.email.toLowerCase()).digest("hex");
    const uuid = `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-a${hash.substring(17, 20)}-${hash.substring(20, 32)}`;

    const row = {
      id: uuid,
      email: p.email.toLowerCase(),
      full_name: p.full_name,
      role: p.role,
    };

    const { error } = await supabase.from("profiles").upsert(row, { onConflict: "email" });
    if (error) {
      console.error(`❌ Failed to sync profile ${p.email}:`, error.message);
    } else {
      console.log(`✅ Synced profile: [${p.role}] ${p.full_name} (${p.email})`);
      // Also link customer user_id if this is a customer
      if (p.role === "customer") {
        await supabase
          .from("customers")
          .update({ user_id: uuid })
          .eq("email", p.email.toLowerCase());
      }
    }
  }
}

syncProfiles();
