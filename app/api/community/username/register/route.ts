import { NextResponse } from "next/server";
import { registerUsername } from "@/lib/server/community-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { username } = (await request.json()) as { username?: string };
    if (!username?.trim()) {
      return NextResponse.json({ error: "username required" }, { status: 400 });
    }
    const r = registerUsername(username);
    if (!r.ok) {
      return NextResponse.json({ error: r.error }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
