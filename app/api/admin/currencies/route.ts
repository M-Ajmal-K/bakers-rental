// app/api/admin/currencies/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shape we expose to UI: 1 FJD => rate units of <code> (e.g., USD rate = 0.44 means 1 FJD = 0.44 USD)

function defaultSymbolFor(code: string) {
  switch (code) {
    case "FJD": return "$";
    case "USD": return "US$";
    case "AUD": return "A$";
    default:    return "$";
  }
}

export async function GET() {
  // CHANGED: read from currency_rates and map DB columns -> UI shape
  const { data, error } = await supabaseAdmin
    .from("currency_rates")
    .select("code,name,symbol,rate_to_fjd,is_active,updated_at")
    .order("code", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  const items = (data || []).map((r) => ({
    code: r.code,
    name: r.name,
    symbol: r.symbol,                   // extra field (non-breaking if UI ignores)
    rate: Number(r.rate_to_fjd),        // map -> rate
    enabled: Boolean(r.is_active),      // map -> enabled
    updated_at: r.updated_at,
  }));

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let code = String(body?.code || "").toUpperCase().trim();
    let name = String(body?.name || "").trim() || code;
    let symbol = String(body?.symbol || "").trim(); // NEW: accept symbol (optional)
    let rate = Number(body?.rate);
    let enabled = Boolean(body?.enabled);

    if (!code) {
      return NextResponse.json({ ok: false, error: "Missing currency code" }, { status: 400 });
    }

    // Lock FJD as base (cannot change rate; always enabled)
    if (code === "FJD") {
      rate = 1;
      enabled = true;
      if (!name || name === "FJD") name = "Fijian Dollar";
    } else {
      if (!Number.isFinite(rate) || rate <= 0) {
        return NextResponse.json(
          { ok: false, error: "Rate must be a positive number. Example: USD 0.44 means 1 FJD = 0.44 USD." },
          { status: 400 }
        );
      }
    }

    // Allow only FJD / USD / AUD for now (keeps it clean)
    const allowed = new Set(["FJD", "USD", "AUD"]);
    if (!allowed.has(code)) {
      return NextResponse.json({ ok: false, error: "Only FJD, USD, and AUD are supported." }, { status: 400 });
    }

    // Ensure symbol because DB column is NOT NULL in currency_rates
    if (!symbol) symbol = defaultSymbolFor(code);

    // CHANGED: write to currency_rates with mapped column names
    const payload = {
      code,
      name,
      symbol,
      rate_to_fjd: rate,         // map from UI 'rate'
      is_active: enabled,        // map from UI 'enabled'
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("currency_rates")
      .upsert(payload, { onConflict: "code" })
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    // Map DB -> UI in response
    const item = data
      ? {
          code: data.code,
          name: data.name,
          symbol: data.symbol,
          rate: Number(data.rate_to_fjd),
          enabled: Boolean(data.is_active),
          updated_at: data.updated_at,
        }
      : null;

    return NextResponse.json({ ok: true, item });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Invalid JSON" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") || "").toUpperCase();

  if (!code) {
    return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });
  }
  if (code === "FJD") {
    return NextResponse.json({ ok: false, error: "Cannot delete FJD (base currency)" }, { status: 400 });
  }

  // CHANGED: delete from currency_rates
  const { error } = await supabaseAdmin.from("currency_rates").delete().eq("code", code);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
