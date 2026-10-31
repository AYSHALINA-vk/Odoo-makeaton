import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/rbac";
import { hashPassword } from "@/lib/db/seed";
import { validatePassword } from "@/lib/auth/password-policy";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseActive } from "@/lib/supabase/data";
import { syncRecordToSupabase } from "@/lib/supabase/sync";

// Admin only: list staff and create new staff members
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isAdmin(currentUser.role)) {
    return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
  }

  if (isSupabaseActive()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, created_at")
        .in("role", ["admin", "staff"])
        .order("created_at", { ascending: false });

      if (!error && data) {
        return NextResponse.json({ staff: data });
      }
    } catch (err: any) {
      console.warn("[Staff] Supabase fetch fallback:", err.message);
    }
  }

  const db = getDatabase();
  const staffMembers = db
    .prepare(
      `SELECT id, email, full_name, role, created_at 
       FROM profiles 
       WHERE role IN ('admin', 'staff')
       ORDER BY created_at DESC`
    )
    .all();

  return NextResponse.json({ staff: staffMembers });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  // REQ-AUTH-5: Only Admin can create staff accounts!
  if (!currentUser || !isAdmin(currentUser.role)) {
    return NextResponse.json(
      { error: "Forbidden: Only Administrators can create staff accounts" },
      { status: 403 }
    );
  }

  try {
    const { email, password, fullName, role } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Email, password, and full name are required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const targetRole = role === "admin" ? "admin" : "staff";

    // Validate password policy
    const policyResult = validatePassword(password);
    if (!policyResult.isValid) {
      return NextResponse.json(
        { error: "Password does not meet requirements", details: policyResult.errors },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Check unique email
    const existing = db
      .prepare(`SELECT id FROM profiles WHERE email = ? COLLATE NOCASE`)
      .get(cleanEmail);
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const newStaffId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    db.prepare(
      `INSERT INTO profiles (id, email, password_hash, full_name, role)
       VALUES (?, ?, ?, ?, ?)`
    ).run(newStaffId, cleanEmail, hashPassword(password), fullName.trim(), targetRole);

    // Sync to Supabase profiles
    if (isSupabaseActive()) {
      try {
        const supabase = createAdminClient();
        await supabase.from("profiles").upsert(
          {
            email: cleanEmail,
            full_name: fullName.trim(),
            role: targetRole,
          },
          { onConflict: "email" }
        );
      } catch (err: any) {
        console.warn("[Staff Sync] Failed to sync new staff profile to Supabase:", err.message);
      }
    }

    // Audit log
    db.prepare(
      `INSERT INTO audit_log (actor_id, actor_email, entity, entity_id, action, after_state)
       VALUES (?, ?, 'profiles', ?, 'STAFF_CREATED', ?)`
    ).run(
      currentUser.id,
      currentUser.email,
      newStaffId,
      JSON.stringify({ email: cleanEmail, role: targetRole, name: fullName.trim() })
    );

    return NextResponse.json({
      success: true,
      staff: {
        id: newStaffId,
        email: cleanEmail,
        fullName: fullName.trim(),
        role: targetRole,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
