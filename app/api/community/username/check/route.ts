import { NextRequest, NextResponse } from "next/server";
import { isUsernameAvailable } from "@/lib/server/community-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const u = request.nextUrl.searchParams.get("username");
  if (!u?.trim()) {
    return NextResponse.json({ available: false, error: "username required" }, { status: 400 });
  }
  return NextResponse.json({ available: isUsernameAvailable(u) });
}
