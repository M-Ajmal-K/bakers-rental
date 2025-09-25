// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  // ✅ protect BOTH /admin and /admin/:path*
  matcher: ["/admin", "/admin/:path*"],
};

const COOKIE_NAME = "admin_session";

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Always allow the login page itself
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    const res = NextResponse.next();
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // If someone requests the bare /admin, send them to /admin/login (no loops)
  if (pathname === "/admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    // if a next param already exists, keep it; otherwise default to /admin/dashboard
    if (!url.searchParams.get("next")) {
      url.searchParams.set("next", "/admin/dashboard");
    }
    const res = NextResponse.redirect(url);
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // Legacy cookie presence check (your Supabase guard handles real auth)
  const hasSession = !!req.cookies.get(COOKIE_NAME)?.value;

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    // Preserve the real target (avoid pointing back to /admin)
    const wanted = pathname + (searchParams.size ? `?${searchParams.toString()}` : "");
    url.searchParams.delete("next");
    url.searchParams.set("next", wanted || "/admin/dashboard");
    const res = NextResponse.redirect(url);
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  const res = NextResponse.next();
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}
