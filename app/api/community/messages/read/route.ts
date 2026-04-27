import { NextResponse } from "next/server";
import { getCommunityStore, markMessagesRead } from "@/lib/server/community-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { from, to } = (await request.json()) as { from?: string; to?: string };
    if (!from?.trim() || !to?.trim()) {
      return NextResponse.json({ error: "from and to required" }, { status: 400 });
    }
    markMessagesRead(from.trim(), to.trim());
    return NextResponse.json({ messages: getCommunityStore().messages });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
