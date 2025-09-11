// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  // Protect only the admin PAGES. Do not match API here.
  matcher: ["/admin/:path*"],
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow the login page itself
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Read the cookie the session route sets
  const cookieVal = req.cookies.get("admin_session")?.value ?? "";
  const expected =
    (process.env.ADMIN_SESSION_TOKEN ?? process.env.ADMIN_SESSION_SECRET ?? "").trim();

  // If not logged in, redirect admin pages to login
  const authed = expected && cookieVal === expected;
  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
