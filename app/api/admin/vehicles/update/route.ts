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

// Coercion helpers
const str = (v: unknown) => (v === undefined || v === null ? undefined : String(v));
const bool = (v: unknown) => (v === undefined || v === null ? undefined : Boolean(v));
const intOrUndef = (v: unknown) => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
};
const numOrNull = (v: unknown) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const featuresArr = (v: unknown) => {
  if (Array.isArray(v)) return v;
  if (v === undefined || v === null || v === "") return undefined;
  return String(v).split(",").map((f) => f.trim()).filter(Boolean);
};

export async function POST(req: Request) {
  try {
    const { token } = envs();
    const jar = await cookies();
    const val = jar.get(COOKIE_NAME)?.value || "";
    if (!safeEquals(val, token)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const id = body.id;
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    // Build update object, omitting truly-undefined fields
    const update: Record<string, any> = {};

    // Strings
    const registration_number = str(body.registration_number);
    if (registration_number !== undefined) update.registration_number = registration_number;

    const title = str(body.title);
    if (title !== undefined) update.title = title;

    const brand = str(body.brand);
    if (brand !== undefined) update.brand = brand;

    const model = str(body.model);
    if (model !== undefined) update.model = model;

    const category = str(body.category);
    if (category !== undefined) update.category = category;

    const transmission = str(body.transmission);
    if (transmission !== undefined) update.transmission = transmission;

    const fuel = str(body.fuel);
    if (fuel !== undefined) update.fuel = fuel;

    // Numbers / booleans
    const year = intOrUndef(body.year);
    if (year !== undefined) update.year = year;

    const rental_price = numOrNull(body.rental_price);
    if (rental_price !== null && rental_price !== undefined) update.rental_price = rental_price;

    // ✅ NEW optional tier prices
    const rental_price_5plus = numOrNull(body.rental_price_5plus);
    if (rental_price_5plus !== undefined) update.rental_price_5plus = rental_price_5plus;

    const rental_price_8plus = numOrNull(body.rental_price_8plus);
    if (rental_price_8plus !== undefined) update.rental_price_8plus = rental_price_8plus;

    const available = bool(body.available);
    if (available !== undefined) update.available = available;

    const passengers = intOrUndef(body.passengers);
    if (passengers !== undefined) update.passengers = passengers;

    // Arrays
    const features = featuresArr(body.features);
    if (features !== undefined) update.features = features;

    // Media
    if (body.image_path !== undefined) update.image_path = body.image_path ?? null;
    if (body.public_url !== undefined) update.public_url = body.public_url ?? null;

    const sb = admin();
    const { data, error } = await sb
      .from("vehicles")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, vehicle: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
