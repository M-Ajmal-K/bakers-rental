// app/api/_tools/promote-admin/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// tiny safeguard: require a secret header so random people can't run this
const HEADER_KEY = "x-promote-secret";

export async function POST(req: Request) {
  const secret = req.headers.get(HEADER_KEY) || "";
  if (secret !== (process.env.PROMOTE_SECRET || "")) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { userId, email } = await req.json().catch(() => ({}));
  if (!userId && !email) {
    return NextResponse.json({ ok: false, error: "userId or email required" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) {
    return NextResponse.json({ ok: false, error: "Supabase env not set" }, { status: 500 });
  }

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // find by email if provided
  let id = userId as string | undefined;
  if (!id && email) {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    const match = data.users.find(u => u.email?.toLowerCase() === String(email).toLowerCase());
    if (!match) return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 });
    id = match.id;
  }

  const { data, error } = await admin.auth.admin.updateUserById(id!, {
    app_metadata: { role: "admin" },
  });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.user?.id, app_metadata: data.user?.app_metadata });
}
