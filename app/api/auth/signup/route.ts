import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { hashPassword } from "@/lib/db/seed";
import { validatePassword } from "@/lib/auth/password-policy";
import { setSessionCookie } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const { email, password, fullName, company, phone, billingAddress } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Email, password, and full name are required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Validate password policy
    const policyResult = validatePassword(password);
    if (!policyResult.isValid) {
      return NextResponse.json(
        { error: "Password does not meet requirements", details: policyResult.errors },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // 2. Enforce unique email check
    const existing = db
      .prepare(`SELECT id FROM profiles WHERE email = ? COLLATE NOCASE`)
      .get(cleanEmail);

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email address already exists" },
        { status: 409 }
      );
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const custId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 3. Insert customer profile (Sign-up only creates Customer accounts, never admin or staff)
    db.prepare(
      `INSERT INTO profiles (id, email, password_hash, full_name, role)
       VALUES (?, ?, ?, ?, 'customer')`
    ).run(userId, cleanEmail, hashPassword(password), fullName.trim());

    // 4. Create linked customer row
    db.prepare(
      `INSERT INTO customers (id, user_id, name, company, email, phone, billing_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      custId,
      userId,
      fullName.trim(),
      company ? company.trim() : null,
      cleanEmail,
      phone ? phone.trim() : null,
      billingAddress ? billingAddress.trim() : null
    );

    // Audit log
    db.prepare(
      `INSERT INTO audit_log (actor_id, actor_email, entity, entity_id, action, after_state)
       VALUES (?, ?, 'auth', ?, 'USER_SIGNUP', ?)`
    ).run(userId, cleanEmail, userId, JSON.stringify({ email: cleanEmail, role: "customer" }));

    const sessionUser = {
      id: userId,
      email: cleanEmail,
      name: fullName.trim(),
      role: "customer" as const,
      customerId: custId,
    };

    await setSessionCookie(sessionUser);

    return NextResponse.json({ success: true, user: sessionUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Sign up failed" }, { status: 500 });
  }
}
