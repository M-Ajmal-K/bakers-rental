import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createHash, timingSafeEqual } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "admin_session";

function envs() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const token = process.env.ADMIN_SESSION_TOKEN!;
  if (!url || !key || !token) throw new Error("Missing envs");
  return { url, key, token };
}
function admin() {
  const { url, key } = envs();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function safeEquals(a = "", b = "") {
  const da = createHash("sha256").update(a).digest();
  const db = createHash("sha256").update(b).digest();
  return timingSafeEqual(da, db);
}

export async function POST(req: Request) {
  try {
    const { token } = envs();
    const jar = await cookies();
    const val = jar.get(COOKIE_NAME)?.value || "";
    if (!safeEquals(val, token)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const payload = {
      registration_number: body.registration_number,
      title: body.title,
      brand: body.brand,
      model: body.model,
      year: body.year,
      rental_price: body.rental_price,
      image_path: body.image_path ?? null,
      public_url: body.public_url ?? null,
      available: body.available,
      category: body.category ?? "",
      passengers: body.passengers ?? 0,
      transmission: body.transmission ?? "",
      fuel: body.fuel ?? "",
      features: body.features ?? [],
    };

    const sb = admin();
    const { data, error } = await sb.from("vehicles").insert(payload).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, vehicle: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
