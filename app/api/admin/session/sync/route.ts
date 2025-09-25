// app/api/admin/session/sync/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "admin_session";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const tokenFromHeader = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!tokenFromHeader) {
    return NextResponse.json({ ok: false, error: "Missing bearer token" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnon);

  // Validate the JWT coming from the browser session
  const { data, error } = await supabase.auth.getUser(tokenFromHeader);
  if (error || !data?.user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  if (data.user.app_metadata?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const opaque = (
    process.env.ADMIN_SESSION_TOKEN ??
    process.env.ADMIN_SESSION_SECRET ??
    ""
  ).trim() || (process.env.NODE_ENV !== "production" ? "dev-token" : "");

  if (!opaque) {
    return NextResponse.json(
      { ok: false, error: "Server missing ADMIN_SESSION_TOKEN" },
      { status: 500 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: opaque,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
