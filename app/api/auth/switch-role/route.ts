import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { setSessionCookie } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const { role } = await request.json();
    const db = getDatabase();

    let targetEmail = "admin@brightloop.com";
    if (role === "staff") {
      targetEmail = "staff@brightloop.com";
    } else if (role === "customer") {
      targetEmail = "priya@shopmart.com";
    }

    const profile = db
      .prepare(`SELECT * FROM profiles WHERE email = ? COLLATE NOCASE`)
      .get(targetEmail) as any;

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
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

    return NextResponse.json({ success: true, user: sessionUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
