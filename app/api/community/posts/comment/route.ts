import { NextResponse } from "next/server";
import { addComment, getCommunityStore } from "@/lib/server/community-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { postId, username, content } = (await request.json()) as {
      postId?: string;
      username?: string;
      content?: string;
    };
    if (!postId || !username?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "postId, username, and content required" }, { status: 400 });
    }
    const comment = {
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      username: username.trim(),
      content: content.trim().slice(0, 2000),
      timestamp: new Date().toISOString(),
    };
    const post = addComment(postId, comment);
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    return NextResponse.json({ posts: getCommunityStore().posts });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
