// app/api/public/currencies/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Row = {
  code: string | null;
  name?: string | null;
  rate_to_fjd?: number | null; // e.g. USD 0.44 means 1 FJD = 0.44 USD
  is_active?: boolean | null;
};

export async function GET() {
  try {
    // Include all active rows + FJD (if present). Using service role, so RLS doesn’t block.
    const { data, error } = await supabaseAdmin
      .from("currency_rates")
      .select("code,name,rate_to_fjd,is_active")
      .or("code.eq.FJD,is_active.eq.true")
      .order("code", { ascending: true });

    if (error) throw error;

    const map = new Map<string, { code: string; name: string; rate_to_fjd: number; fjd_per_unit: number }>();

    for (const r of (data ?? []) as Row[]) {
      const code = (r.code ?? "").toUpperCase().trim();
      if (!code) continue;

      const name = (r.name ?? code).trim();
      // Normalize: if code is FJD, both directions are 1
      const rate_to_fjd =
        code === "FJD" ? 1 :
        typeof r.rate_to_fjd === "number" && r.rate_to_fjd > 0 ? r.rate_to_fjd : 0;

      // What the client expects: FJD per 1 unit of currency
      const fjd_per_unit =
        code === "FJD" ? 1 :
        rate_to_fjd > 0 ? 1 / rate_to_fjd : 0;

      if (rate_to_fjd > 0 || code === "FJD") {
        map.set(code, { code, name, rate_to_fjd, fjd_per_unit });
      }
    }

    // Ensure FJD exists
    if (!map.has("FJD")) {
      map.set("FJD", {
        code: "FJD",
        name: "Fijian Dollar",
        rate_to_fjd: 1,
        fjd_per_unit: 1,
      });
    }

    const items = Array.from(map.values());

    return NextResponse.json(
      { ok: true, base: "FJD", items },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to load currencies" },
      { status: 500 }
    );
  }
}
