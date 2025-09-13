// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  matcher: ["/admin/:path*"],
};

const COOKIE_NAME = "admin_session";

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Allow the login page itself
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    const res = NextResponse.next();
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // Presence-only check (token compare handled in /api/admin/session + client guard)
  const hasSession = !!req.cookies.get(COOKIE_NAME)?.value;

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    // Preserve existing query (minus next) and add return-to param
    url.searchParams.delete("next");
    url.searchParams.set("next", pathname + (searchParams.size ? `?${searchParams.toString()}` : ""));
    const res = NextResponse.redirect(url);
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // Auth cookie present → proceed with anti-cache / noindex headers
  const res = NextResponse.next();
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}
