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
  const logs = db
    .prepare(
      `SELECT * FROM audit_log 
       ORDER BY created_at DESC 
       LIMIT 100`
    )
    .all();

  return NextResponse.json({ logs });
}
