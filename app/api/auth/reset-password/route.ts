import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { hashPassword } from "@/lib/db/seed";
import { validatePassword } from "@/lib/auth/password-policy";

export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
    }

    const policy = validatePassword(newPassword);
    if (!policy.isValid) {
      return NextResponse.json(
        { error: "Password does not meet security requirements", details: policy.errors },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const profile = db
      .prepare(
        `SELECT * FROM profiles 
         WHERE reset_token = ? AND reset_token_expires > ?`
      )
      .get(token, Date.now()) as any;

    if (!profile) {
      return NextResponse.json(
        { error: "Invalid or expired password reset link. Please request a new one." },
        { status: 400 }
      );
    }

    // Update password and clear token (single use)
    db.prepare(
      `UPDATE profiles 
       SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = datetime('now')
       WHERE id = ?`
    ).run(hashPassword(newPassword), profile.id);

    // Audit log
    db.prepare(
      `INSERT INTO audit_log (actor_id, actor_email, entity, entity_id, action, after_state)
       VALUES (?, ?, 'auth', ?, 'PASSWORD_RESET_COMPLETED', ?)`
    ).run(profile.id, profile.email, profile.id, JSON.stringify({ email: profile.email }));

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now log in with your new password.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
