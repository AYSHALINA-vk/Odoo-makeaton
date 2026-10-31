import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isCustomer } from "@/lib/auth/rbac";
import { fetchInvoices } from "@/lib/supabase/data";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status") || undefined;
  const customerFilter = searchParams.get("customerId") || undefined;

  const invoices = await fetchInvoices({
    userId: isCustomer(currentUser.role) ? currentUser.id : undefined,
    customerId: customerFilter,
    status: statusFilter,
  });

  return NextResponse.json({ invoices });
}
