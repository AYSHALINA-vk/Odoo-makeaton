import { NextResponse } from "next/server";
import { getDashboardSummary } from "@/lib/db/billing-engine";
import { getCurrentUser } from "@/lib/auth/session";
import { isCustomer } from "@/lib/auth/rbac";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || isCustomer(currentUser.role)) {
    return NextResponse.json({ error: "Unauthorized: Finance / Staff access required" }, { status: 403 });
  }

  const summary = getDashboardSummary();
  return NextResponse.json(summary);
}
