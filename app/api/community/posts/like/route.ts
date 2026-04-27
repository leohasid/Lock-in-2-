import { NextResponse } from "next/server";
import { getCommunityStore, toggleLikePost } from "@/lib/server/community-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { postId, username } = (await request.json()) as { postId?: string; username?: string };
    if (!postId || !username?.trim()) {
      return NextResponse.json({ error: "postId and username required" }, { status: 400 });
    }
    const post = toggleLikePost(postId, username.trim());
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    return NextResponse.json({ posts: getCommunityStore().posts });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
