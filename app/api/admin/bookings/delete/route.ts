import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return { url, serviceKey };
}

function adminClient() {
  const { url, serviceKey } = getEnv();
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

// POST { id: string } -> hard delete booking row
export async function POST(req: Request) {
  const { id } = await req.json().catch(() => ({}));
  if (!id) return new NextResponse("Missing 'id' in body", { status: 400 });

  const supabase = adminClient();
  const { error } = await supabase.from("bookings").delete().eq("id", id);

  if (error) return new NextResponse(error.message ?? "Failed to delete booking", { status: 400 });
  return NextResponse.json({ ok: true, id });
}
