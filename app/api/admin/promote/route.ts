// app/api/admin/promote/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shared-secret guard
function checkSecret(req: Request) {
  const sent = req.headers.get("x-promote-secret")?.trim() || "";
  const expected = (process.env.PROMOTE_SECRET || "").trim();
  return Boolean(expected) && sent === expected;
}

// Works with old SDKs (no getUserByEmail): scan listUsers pages
async function findUserByEmail(email: string) {
  // Try a few pages; adjust if you expect many users
  const PER_PAGE = 1000;
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: PER_PAGE,
    } as any); // PageParams type

    if (error) throw error;
    const users = data?.users ?? [];
    const match = users.find(
      (u: any) => (u.email || "").toLowerCase() === email.toLowerCase()
    );
    if (match) return match;
    if (users.length < PER_PAGE) break; // no more pages
  }
  return null;
}

export async function POST(req: Request) {
  if (!checkSecret(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let email = "";
  try {
    const body = await req.json();
    email = String(body?.email || "").trim().toLowerCase();
  } catch {
    /* ignore */
  }
  if (!email) {
    return NextResponse.json({ ok: false, error: "email is required" }, { status: 400 });
  }

  try {
    // Find the user by email (compatible with old SDKs)
    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    const currentAppMeta = (user.app_metadata as Record<string, any>) || {};
    if (currentAppMeta.role === "admin") {
      return NextResponse.json({
        ok: true,
        already: true,
        userId: user.id,
        email: user.email,
        app_metadata: user.app_metadata,
      });
    }

    const { data: updated, error: updErr } =
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        app_metadata: { ...currentAppMeta, role: "admin" },
      });

    if (updErr) {
      return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      userId: updated.user.id,
      email: updated.user.email,
      app_metadata: updated.user.app_metadata,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
