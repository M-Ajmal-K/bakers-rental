// app/api/currency-rates/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Row = {
  code: string | null;
  fjd_per_unit?: number | null;
  rate_fjd?: number | null;
  rate?: number | null;
  is_active?: boolean | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // SERVICE_ROLE if available (server-only), otherwise ANON (with RLS policy)
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("currency_rates")
      .select("code, fjd_per_unit, rate_fjd, rate, is_active")
      .eq("is_active", true)
      .order("code", { ascending: true });

    if (error) throw error;

    const cleaned =
      (data ?? [])
        .map((r: Row) => {
          const code = (r.code ?? "").toUpperCase().trim();
          const fjd_per_unit = r.fjd_per_unit ?? r.rate_fjd ?? r.rate ?? null;
          return code && fjd_per_unit ? { code, fjd_per_unit } : null;
        })
        .filter(Boolean) as { code: string; fjd_per_unit: number }[];

    return NextResponse.json(cleaned, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to load currency rates" },
      { status: 500 }
    );
  }
}
