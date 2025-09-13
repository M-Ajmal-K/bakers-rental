// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * We only gate client pages under /admin. API routes are not matched here.
 * Exclude the login page itself from protection.
 */
export const config = {
  // Match /admin and everything under it
  matcher: ["/admin/:path*"],
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow the login page and its subpaths (e.g. /admin/login)
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }

  // ✅ TRUST THE PRESENCE OF THE SESSION COOKIE
  // Do not rely on env token here (Edge/env differences caused the loop).
  const hasSession = !!req.cookies.get("admin_session")?.value;

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    // Optionally carry a return-to param
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Auth cookie present → allow
  return NextResponse.next();
}
