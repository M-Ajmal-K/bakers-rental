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

// Helpers to coerce input safely
const numOrNull = (v: unknown) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const intOrZero = (v: unknown) => {
  const n = Number.parseInt(String(v ?? "0"), 10);
  return Number.isFinite(n) ? n : 0;
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

    // Required
    const registration_number = String(body.registration_number ?? "").trim();
    const title = String(body.title ?? "").trim();
    const brand = String(body.brand ?? "").trim();
    const model = String(body.model ?? "").trim();
    const year = intOrZero(body.year);
    const rental_price = numOrNull(body.rental_price);

    if (!registration_number || !title || !brand || !model || !rental_price) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const payload = {
      registration_number,
      title,
      brand,
      model,
      year,
      rental_price, // base price (required)

      // ✅ NEW optional tier prices
      rental_price_5plus: numOrNull(body.rental_price_5plus), // applies on days 5–7
      rental_price_8plus: numOrNull(body.rental_price_8plus), // applies on day 8+

      image_path: body.image_path ?? null,
      public_url: body.public_url ?? null,
      available: Boolean(body.available),

      // Optional meta
      category: String(body.category ?? ""),
      passengers: intOrZero(body.passengers),
      transmission: String(body.transmission ?? ""),
      fuel: String(body.fuel ?? ""),
      features: Array.isArray(body.features)
        ? body.features
        : body.features
        ? String(body.features).split(",").map((f: string) => f.trim()).filter(Boolean)
        : [],
    };

    const sb = admin();
    const { data, error } = await sb.from("vehicles").insert(payload).select().single();
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, vehicle: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
