import { NextResponse } from "next/server";
import type { CommunityMessage } from "@/lib/community-types";
import { addMessage, getCommunityStore } from "@/lib/server/community-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ messages: getCommunityStore().messages });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CommunityMessage>;
    if (!body.from?.trim() || !body.to?.trim() || !body.content?.trim()) {
      return NextResponse.json({ error: "from, to, and content required" }, { status: 400 });
    }
    const m: CommunityMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      from: body.from.trim(),
      to: body.to.trim(),
      content: body.content.trim().slice(0, 5000),
      timestamp: new Date().toISOString(),
      read: false,
    };
    addMessage(m);
    return NextResponse.json({ message: m, messages: getCommunityStore().messages });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
