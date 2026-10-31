import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { hashPassword } from "@/lib/db/seed";
import { validatePassword } from "@/lib/auth/password-policy";
import { setSessionCookie } from "@/lib/auth/session";
import { syncRecordToSupabase } from "@/lib/supabase/sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseActive } from "@/lib/supabase/data";
import crypto from "crypto";

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

    // 3. Insert customer profile locally (Sign-up only creates Customer accounts, never admin or staff)
    db.prepare(
      `INSERT INTO profiles (id, email, password_hash, full_name, role)
       VALUES (?, ?, ?, ?, 'customer')`
    ).run(userId, cleanEmail, hashPassword(password), fullName.trim());

    // 4. Sync profile to Supabase if active
    let supabaseUserId: string | null = null;
    if (isSupabaseActive()) {
      try {
        const hash = crypto.createHash("md5").update(cleanEmail).digest("hex");
        const profileUuid = `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-a${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
        const supabase = createAdminClient();
        const { data: supaProfile } = await supabase
          .from("profiles")
          .upsert(
            {
              id: profileUuid,
              email: cleanEmail,
              full_name: fullName.trim(),
              role: "customer",
            },
            { onConflict: "email" }
          )
          .select("id")
          .maybeSingle();

        supabaseUserId = supaProfile?.id || profileUuid;
      } catch (err: any) {
        console.warn("[Signup Sync] Failed to sync profile to Supabase:", err.message);
      }
    }

    // 5. Create linked customer row
    const customerRow = {
      id: custId,
      user_id: supabaseUserId,
      name: fullName.trim(),
      company: company ? company.trim() : null,
      email: cleanEmail,
      phone: phone ? phone.trim() : null,
      billing_address: billingAddress ? billingAddress.trim() : null,
    };

    db.prepare(
      `INSERT INTO customers (id, user_id, name, company, email, phone, billing_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      customerRow.id,
      userId,
      customerRow.name,
      customerRow.company,
      customerRow.email,
      customerRow.phone,
      customerRow.billing_address
    );

    // Sync to Supabase
    await syncRecordToSupabase("customers", customerRow);

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
