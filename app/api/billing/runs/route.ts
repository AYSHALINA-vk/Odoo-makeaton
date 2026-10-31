import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseActive } from "@/lib/supabase/data";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isStaff(currentUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (isSupabaseActive()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("billing_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);
      if (!error && data) {
        return NextResponse.json({ runs: data });
      }
    } catch (err: any) {
      console.warn("[Billing Runs] Supabase fetch fallback:", err.message);
    }
  }

  const db = getDatabase();
  const runs = db
    .prepare(
      `SELECT * FROM billing_runs 
       ORDER BY started_at DESC 
       LIMIT 50`
    )
    .all();

  return NextResponse.json({ runs });
}
