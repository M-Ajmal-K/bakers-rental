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

type Params = { vehicleId: string };

export async function GET(req: Request, ctx: { params: Promise<Params> | Params }) {
  const { vehicleId } = await (ctx.params as Promise<Params>); // works for both Next 14/15
  const supabase = adminClient();

  const url = new URL(req.url);
  const includePending = url.searchParams.get("includePending") === "1";
  const pendingHoldHours = Number(url.searchParams.get("pendingHours") || 48);

  // Local-day strings for DATE columns
  const todayLocal = new Date();
  todayLocal.setHours(0, 0, 0, 0);
  const todayStr = todayLocal.toISOString().slice(0, 10); // "YYYY-MM-DD"
  const cutoffIso = new Date(Date.now() - pendingHoldHours * 60 * 60 * 1000).toISOString();

  // ✅ Block confirmed (handle legacy lowercase + new uppercase)
  const { data: confirmed, error: e1 } = await supabase
    .from("bookings")
    .select("start_date, end_date")
    .eq("vehicle_id", vehicleId)
    .in("status", ["CONFIRMED", "confirmed"])
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

  // ✅ Optionally block recent pending holds (both cases)
  if (includePending) {
    const { data: pending, error: e2 } = await supabase
      .from("bookings")
      .select("start_date, end_date, created_at")
      .eq("vehicle_id", vehicleId)
      .in("status", ["PENDING", "pending"])
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
