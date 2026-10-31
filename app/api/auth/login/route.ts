import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { hashPassword } from "@/lib/db/seed";
import { setSessionCookie } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const db = getDatabase();
    const profile = db
      .prepare(`SELECT * FROM profiles WHERE email = ? COLLATE NOCASE`)
      .get(email.trim()) as any;

    if (!profile) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const hashedInput = hashPassword(password);
    if (profile.password_hash !== hashedInput) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    let customerId: string | undefined;
    if (profile.role === "customer") {
      const cust = db.prepare(`SELECT id FROM customers WHERE user_id = ?`).get(profile.id) as any;
      customerId = cust?.id;
    }

    const sessionUser = {
      id: profile.id,
      email: profile.email,
      name: profile.full_name,
      role: profile.role,
      customerId,
    };

    await setSessionCookie(sessionUser);

    // Audit log
    db.prepare(
      `INSERT INTO audit_log (actor_id, actor_email, entity, entity_id, action, after_state)
       VALUES (?, ?, 'auth', ?, 'USER_LOGIN', ?)`
    ).run(profile.id, profile.email, profile.id, JSON.stringify({ email: profile.email }));

    return NextResponse.json({ success: true, user: sessionUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Login failed" }, { status: 500 });
  }
}
