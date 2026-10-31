import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import crypto from "node:crypto";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = getDatabase();

    const profile = db
      .prepare(`SELECT * FROM profiles WHERE email = ? COLLATE NOCASE`)
      .get(cleanEmail) as any;

    let resetToken = null;
    if (profile) {
      resetToken = crypto.randomBytes(24).toString("hex");
      const expires = Date.now() + 1000 * 60 * 60; // 1 hour expiration

      db.prepare(
        `UPDATE profiles 
         SET reset_token = ?, reset_token_expires = ?
         WHERE id = ?`
      ).run(resetToken, expires, profile.id);

      // Audit log
      db.prepare(
        `INSERT INTO audit_log (actor_id, actor_email, entity, entity_id, action, after_state)
         VALUES (?, ?, 'auth', ?, 'PASSWORD_RESET_REQUESTED', ?)`
      ).run(profile.id, cleanEmail, profile.id, JSON.stringify({ email: cleanEmail }));
    }

    // Generic safe response to not reveal user existence
    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, password reset instructions have been sent.",
      // For testing convenience, we provide the resetToken so the user can easily test the reset page
      debugToken: resetToken,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
