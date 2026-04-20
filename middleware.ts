import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** WKWebView + CDN can cache HTML; stale HTML points at old JS and old subscribe error strings. */
export function middleware(request: NextRequest) {
  const res = NextResponse.next();
  if (request.nextUrl.pathname === "/subscribe" || request.nextUrl.pathname.startsWith("/subscribe/")) {
    res.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
  }
  return res;
}

export const config = {
  matcher: ["/subscribe", "/subscribe/:path*"],
};
