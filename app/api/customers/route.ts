import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { getCurrentUser } from "@/lib/auth/session";
import { isCustomer, isStaff } from "@/lib/auth/rbac";
import { syncRecordToSupabase } from "@/lib/supabase/sync";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDatabase();
  let query = `
    SELECT c.*, 
           (SELECT count(*) FROM subscriptions WHERE customer_id = c.id AND status = 'active') as active_subs_count,
           (SELECT count(*) FROM invoices WHERE customer_id = c.id) as total_invoices_count
    FROM customers c
    WHERE 1=1
  `;
  const params: any[] = [];

  if (isCustomer(currentUser.role)) {
    query += ` AND c.user_id = ?`;
    params.push(currentUser.id);
  }

  query += ` ORDER BY c.name ASC`;
  const customers = db.prepare(query).all(...params);

  return NextResponse.json({ customers });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isStaff(currentUser.role)) {
    return NextResponse.json({ error: "Unauthorized: Staff access required" }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { name, company, email, phone, billing_address, tax_id } = data;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const db = getDatabase();
    const custId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const customerRow = {
      id: custId,
      name: name.trim(),
      company: company ? company.trim() : null,
      email: email.trim(),
      phone: phone ? phone.trim() : null,
      billing_address: billing_address ? billing_address.trim() : null,
      tax_id: tax_id ? tax_id.trim() : null,
    };

    db.prepare(
      `INSERT INTO customers (id, name, company, email, phone, billing_address, tax_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      customerRow.id,
      customerRow.name,
      customerRow.company,
      customerRow.email,
      customerRow.phone,
      customerRow.billing_address,
      customerRow.tax_id
    );

    // Sync to live Supabase
    await syncRecordToSupabase("customers", customerRow);

    return NextResponse.json({ success: true, customerId: custId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
