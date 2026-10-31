import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/db/seed";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";
    const res = seedDatabase(force);
    return NextResponse.json({ success: true, ...res });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const res = seedDatabase(body.force === true);
    return NextResponse.json({ success: true, ...res });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
