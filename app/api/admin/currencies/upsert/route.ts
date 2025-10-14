// app/api/admin/currencies/upsert/route.ts
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
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type UpsertBody = {
  code: string;                 // e.g. FJD/AUD/USD
  name?: string;                // optional label (e.g. "US Dollar")
  symbol?: string;              // e.g. "$", "A$", "US$"
  rate_to_fjd?: number;         // multiplier (FJD amount * rate_to_fjd = converted)
  is_active?: boolean;          // default true
};

export async function POST(req: Request) {
  try {
    const supabase = adminClient();

    let body: UpsertBody;
    try {
      body = await req.json();
    } catch {
      return new NextResponse("Invalid JSON body", { status: 400 });
    }

    // ---- validate inputs ----
    const code = String(body.code || "").toUpperCase().trim();
    if (!code || code.length < 3 || code.length > 6) {
      return new NextResponse("Invalid 'code'. Use 3–6 letters, e.g. FJD, AUD, USD.", { status: 400 });
    }

    const patch: Record<string, any> = { code };

    // Optional fields
    if (typeof body.name === "string" && body.name.trim()) {
      patch.name = body.name.trim();
    }
    if (typeof body.symbol === "string" && body.symbol.trim()) {
      patch.symbol = body.symbol.trim();
    }
    if (typeof body.is_active === "boolean") {
      patch.is_active = body.is_active;
    }

    if (body.rate_to_fjd != null) {
      const rate = Number(body.rate_to_fjd);
      if (!Number.isFinite(rate) || rate <= 0) {
        return new NextResponse("'rate_to_fjd' must be a positive number.", { status: 400 });
      }
      if (code === "FJD" && Math.abs(rate - 1) > 1e-9) {
        return new NextResponse("For base currency FJD, 'rate_to_fjd' must be exactly 1.", { status: 400 });
      }
      patch.rate_to_fjd = rate;
    }

    // Always bump updated_at
    patch.updated_at = new Date().toISOString();

    // Upsert by primary key 'code'
    const { data, error } = await supabase
      .from("currency_rates")
      .upsert(patch, { onConflict: "code" })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, item: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
