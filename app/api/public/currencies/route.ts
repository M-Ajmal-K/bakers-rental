// app/api/public/currencies/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns { base: "FJD", items: [{ code, name, rate }] }
// rate = target units per 1 FJD (e.g., USD 0.44)

export async function GET() {
  // Read from currency_rates; include FJD always + all active others
  const { data, error } = await supabaseAdmin
    .from("currency_rates")
    .select("code,name,rate_to_fjd,is_active")
    .or("code.eq.FJD,is_active.eq.true")
    .order("code", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  const map = new Map<string, { code: string; name: string; rate: number }>();
  (data || []).forEach((r: any) => {
    map.set(r.code, { code: r.code, name: r.name, rate: Number(r.rate_to_fjd || 0) });
  });

  // Ensure FJD present and fixed to 1
  if (!map.has("FJD")) {
    map.set("FJD", { code: "FJD", name: "Fijian Dollar", rate: 1 });
  } else {
    map.set("FJD", { ...map.get("FJD")!, rate: 1 });
  }

  return NextResponse.json({
    ok: true,
    base: "FJD",
    items: Array.from(map.values()),
  });
}
