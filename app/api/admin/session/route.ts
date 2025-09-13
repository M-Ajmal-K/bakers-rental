// app/api/admin/session/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "admin_session";

// Read secrets from env (trimmed). Token is what we store in the cookie.
function getSecrets() {
  const pw = (process.env.ADMIN_PASSWORD ?? "").trim();
  const token =
    (process.env.ADMIN_SESSION_TOKEN ?? process.env.ADMIN_SESSION_SECRET ?? "").trim() ||
    // dev fallback so GET can still work if you forgot the token (never used in prod)
    (process.env.NODE_ENV !== "production" ? "dev-token" : "");
  return { pw, token };
}

// Constant-time compare to avoid timing leaks
function safeCompare(a: string, b: string) {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  if (A.length !== B.length) return false;
  try {
    return timingSafeEqual(A, B);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const { pw, token } = getSecrets();
  if (!pw) {
    return NextResponse.json(
      { ok: false, error: "Server misconfigured: ADMIN_PASSWORD missing" },
      { status: 500 }
    );
  }
  if (process.env.NODE_ENV === "production" && !token) {
    return NextResponse.json(
      { ok: false, error: "Server misconfigured: ADMIN_SESSION_TOKEN missing" },
      { status: 500 }
    );
  }

  let supplied = "";
  try {
    const body = await req.json();
    supplied = String(body?.password ?? "").trim();
  } catch {
    // ignore
  }

  if (!safeCompare(supplied, pw)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // ✅ Set cookie on the response
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}

export async function GET() {
  const { token } = getSecrets();
  const jar = await cookies(); // read-only jar (await needed in your env)
  const val = jar.get(COOKIE_NAME)?.value ?? "";

  // Use constant-time compare too
  const authed = !!token && safeCompare(val, token);
  return NextResponse.json({ ok: true, authed });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  // ✅ Delete cookie via response
  res.cookies.delete(COOKIE_NAME);
  return res;
}
