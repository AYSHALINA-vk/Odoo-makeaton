import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { getCurrentUser } from "@/lib/auth/session";
import { isCustomer } from "@/lib/auth/rbac";
import { format } from "date-fns";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");
  const customerFilter = searchParams.get("customerId");

  const db = getDatabase();
  const today = format(new Date(), "yyyy-MM-dd");

  let query = `
    SELECT i.*, 
           c.name as customer_name, c.company as customer_company, c.email as customer_email,
           s.number as subscription_number,
           (i.total - i.amount_paid) as balance_due,
           CASE 
             WHEN i.status = 'confirmed' AND i.total > i.amount_paid AND i.due_date < ? THEN 1 
             ELSE 0 
           END as is_overdue
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    JOIN subscriptions s ON i.subscription_id = s.id
    WHERE 1=1
  `;
  const params: any[] = [today];

  // Customer isolation
  if (isCustomer(currentUser.role)) {
    query += ` AND c.user_id = ?`;
    params.push(currentUser.id);
  } else if (customerFilter) {
    query += ` AND i.customer_id = ?`;
    params.push(customerFilter);
  }

  if (statusFilter && statusFilter !== "all") {
    if (statusFilter === "overdue") {
      query += ` AND i.status = 'confirmed' AND i.total > i.amount_paid AND i.due_date < ?`;
      params.push(today);
    } else if (statusFilter === "outstanding") {
      query += ` AND i.status = 'confirmed' AND i.total > i.amount_paid`;
    } else {
      query += ` AND i.status = ?`;
      params.push(statusFilter);
    }
  }

  query += ` ORDER BY i.created_at DESC`;

  const invoices = db.prepare(query).all(...params);
  return NextResponse.json({ invoices });
}
