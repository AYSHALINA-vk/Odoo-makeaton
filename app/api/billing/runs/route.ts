import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/rbac";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isStaff(currentUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
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
