// app/api/availability/[vehicleId]/route.ts
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

// NOTE: In Next 15, ctx.params is a Promise for dynamic routes.
//       Await it before using.
type Params = { vehicleId: string };

export async function GET(req: Request, ctx: { params: Promise<Params> }) {
  const { vehicleId } = await ctx.params; // 👈 fix: await params
  const supabase = adminClient();

  const url = new URL(req.url);
  // includePending=1 -> also block recent PENDING holds while you wait for receipts
  const includePending = url.searchParams.get("includePending") === "1";
  const pendingHoldHours = Number(url.searchParams.get("pendingHours") || 48);

  // Work with DATE columns in local day
  const todayLocal = new Date();
  todayLocal.setHours(0, 0, 0, 0);
  const todayStr = todayLocal.toISOString().slice(0, 10); // "YYYY-MM-DD"

  const cutoffIso = new Date(Date.now() - pendingHoldHours * 60 * 60 * 1000).toISOString();

  // Always block confirmed bookings
  const { data: confirmed, error: e1 } = await supabase
    .from("bookings")
    .select("start_date, end_date")
    .eq("vehicle_id", vehicleId)
    .eq("status", "CONFIRMED")
    .gte("end_date", todayStr)
    .order("start_date", { ascending: true });

  if (e1) {
    return NextResponse.json({ error: e1.message ?? "Error loading confirmed" }, { status: 500 });
  }

  let ranges =
    (confirmed ?? []).map((r) => ({
      start: r.start_date,
      end: r.end_date,
    })) ?? [];

  // Optionally also block *recent* pending holds
  if (includePending) {
    const { data: pending, error: e2 } = await supabase
      .from("bookings")
      .select("start_date, end_date, created_at")
      .eq("vehicle_id", vehicleId)
      .eq("status", "PENDING")
      .gte("created_at", cutoffIso)
      .gte("end_date", todayStr)
      .order("start_date", { ascending: true });

    if (e2) {
      return NextResponse.json({ error: e2.message ?? "Error loading pending" }, { status: 500 });
    }

    ranges = ranges.concat(
      (pending ?? []).map((r) => ({ start: r.start_date, end: r.end_date }))
    );
  }

  return NextResponse.json({ ranges });
}
