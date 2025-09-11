import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rawPw = process.env.ADMIN_PASSWORD ?? "";
  const rawTok = process.env.ADMIN_SESSION_TOKEN ?? process.env.ADMIN_SESSION_SECRET ?? "";

  return NextResponse.json({
    node: process.version,
    env: process.env.NODE_ENV,
    pwLen: rawPw.trim().length,       // should be > 0
    pwRawLen: rawPw.length,           // if > pwLen, you have trailing spaces
    tokenLen: rawTok.trim().length,   // should be > 0
    hasToken: !!rawTok,               // true/false
  });
}
