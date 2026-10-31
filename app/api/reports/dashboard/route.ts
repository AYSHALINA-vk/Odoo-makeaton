import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isCustomer } from "@/lib/auth/rbac";
import { fetchDashboardSummary } from "@/lib/supabase/data";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || isCustomer(currentUser.role)) {
    return NextResponse.json({ error: "Unauthorized: Finance / Staff access required" }, { status: 403 });
  }

  const summary = await fetchDashboardSummary();
  return NextResponse.json(summary);
}
