import { NextResponse } from "next/server";
import type { CommunityPost } from "@/lib/community-types";
import { addPost, getCommunityStore } from "@/lib/server/community-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const { posts } = getCommunityStore();
  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CommunityPost>;
    if (!body.username?.trim() || (!body.content?.trim() && !body.imageUrl)) {
      return NextResponse.json({ error: "Missing username or content" }, { status: 400 });
    }
    const post: CommunityPost = {
      id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      username: body.username.trim(),
      content: (body.content || "").trim(),
      timestamp: new Date().toISOString(),
      likes: [],
      comments: [],
      ...(body.addictionType && body.addictionType !== "all" ? { addictionType: body.addictionType } : {}),
      ...(body.imageUrl ? { imageUrl: body.imageUrl } : {}),
    };
    if (post.imageUrl && post.imageUrl.length > 6_000_000) {
      return NextResponse.json({ error: "Image too large" }, { status: 400 });
    }
    addPost(post);
    return NextResponse.json({ post });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
