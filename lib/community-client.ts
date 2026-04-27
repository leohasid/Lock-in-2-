/**
 * Community API base: use Railway when NEXT_PUBLIC_RAILWAY_API_URL is set (shared in-memory on one dyno),
 * otherwise same-origin Next.js /api/community/* (shared on warm serverless instances).
 */
export function getCommunityApiOrigin(): string {
  if (typeof window === "undefined") return "";
  const r = process.env.NEXT_PUBLIC_RAILWAY_API_URL;
  return r && r.startsWith("http") ? r.replace(/\/$/, "") : "";
}

export function communityUrl(path: string): string {
  const base = getCommunityApiOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (base) return `${base}${p}`;
  if (typeof window !== "undefined") return p;
  return p;
}
