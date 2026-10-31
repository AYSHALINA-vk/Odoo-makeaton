import { cookies } from "next/headers";
import { getDatabase } from "../db/database";
import { hashPassword } from "../db/seed";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "staff" | "customer";
  customerId?: string;
}

const SESSION_COOKIE_NAME = "brightloop_session";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    // Default fallback to Admin in local dev if no cookie set yet, but check cookie first
    return null;
  }

  try {
    const sessionData = JSON.parse(decodeURIComponent(sessionCookie.value));
    const db = getDatabase();
    const profile = db.prepare(`SELECT * FROM profiles WHERE id = ?`).get(sessionData.id) as any;

    if (!profile) {
      return null;
    }

    let customerId: string | undefined;
    if (profile.role === "customer") {
      const cust = db.prepare(`SELECT id FROM customers WHERE user_id = ?`).get(profile.id) as any;
      customerId = cust?.id;
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.full_name,
      role: profile.role,
      customerId,
    };
  } catch (e) {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser) {
  const cookieStore = await cookies();
  const payload = JSON.stringify({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  cookieStore.set(SESSION_COOKIE_NAME, encodeURIComponent(payload), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
