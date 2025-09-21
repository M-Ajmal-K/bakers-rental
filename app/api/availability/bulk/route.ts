// app/api/availability/bulk/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ------------------------------ Supabase Admin ------------------------------ */
function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return { url, serviceKey };
}

function adminClient() {
  const { url, serviceKey } = getEnv();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/* ---------------------------------- Types ---------------------------------- */
type BulkBody = {
  vehicleIds: Array<string | number>;
  includePending?: boolean | 0 | 1 | "0" | "1";
  pendingHours?: number; // default 48
};

type Range = { start: string; end: string };
type Results = Record<string, Range[]>;

/* ----------------------------------- POST ---------------------------------- */
/**
 * POST /api/availability/bulk
 * Body:
 * {
 *   vehicleIds: (string|number)[],
 *   includePending?: boolean | 0 | 1 | "0" | "1",
 *   pendingHours?: number   // default 48
 * }
 *
 * Response:
 * {
 *   ok: true,
 *   results: { [vehicleId: string]: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" }[] }
 * }
 */
export async function POST(req: Request) {
  try {
    const supabase = adminClient();

    const body = (await req.json()) as BulkBody;
    const idsRaw = Array.isArray(body?.vehicleIds) ? body.vehicleIds : [];
    if (idsRaw.length === 0) {
      return NextResponse.json(
        { ok: false, error: "vehicleIds is required and must be a non-empty array" },
        { status: 400 }
      );
    }

    // Normalize IDs to strings (keys) and de-duplicate
    const ids = Array.from(new Set(idsRaw.map((x) => String(x))));
    // Small safety cap; adjust if you expect more at once
    if (ids.length > 500) {
      return NextResponse.json(
        { ok: false, error: "Too many vehicleIds (max 500)." },
        { status: 400 }
      );
    }

    // Flags / window
    const includePending =
      body?.includePending === true ||
      body?.includePending === 1 ||
      body?.includePending === "1";

    const pendingHoldHours =
      typeof body?.pendingHours === "number" && body.pendingHours >= 0
        ? body.pendingHours
        : 48;

    // Local day start
    const todayLocal = new Date();
    todayLocal.setHours(0, 0, 0, 0);
    const todayStr = todayLocal.toISOString().slice(0, 10); // "YYYY-MM-DD"
    const cutoffIso = new Date(
      Date.now() - pendingHoldHours * 60 * 60 * 1000
    ).toISOString();

    // Storage for results
    const results: Results = {};
    ids.forEach((id) => (results[id] = []));

    /* ------------------------------- CONFIRMED ------------------------------ */
    const { data: confirmed, error: e1 } = await supabase
      .from("bookings")
      .select("vehicle_id, start_date, end_date, status")
      .in("vehicle_id", ids)
      .in("status", ["CONFIRMED", "confirmed"])
      .gte("end_date", todayStr)
      .order("vehicle_id", { ascending: true })
      .order("start_date", { ascending: true });

    if (e1) {
      return NextResponse.json(
        { ok: false, error: e1.message ?? "Error loading confirmed bookings" },
        { status: 500 }
      );
    }

    (confirmed ?? []).forEach((row) => {
      const key = String(row.vehicle_id);
      if (!results[key]) results[key] = [];
      results[key].push({ start: row.start_date as string, end: row.end_date as string });
    });

    /* -------------------------------- PENDING -------------------------------- */
    if (includePending) {
      const { data: pending, error: e2 } = await supabase
        .from("bookings")
        .select("vehicle_id, start_date, end_date, created_at, status")
        .in("vehicle_id", ids)
        .in("status", ["PENDING", "pending"])
        .gte("created_at", cutoffIso)
        .gte("end_date", todayStr)
        .order("vehicle_id", { ascending: true })
        .order("start_date", { ascending: true });

      if (e2) {
        return NextResponse.json(
          { ok: false, error: e2.message ?? "Error loading pending bookings" },
          { status: 500 }
        );
      }

      (pending ?? []).forEach((row) => {
        const key = String(row.vehicle_id);
        if (!results[key]) results[key] = [];
        results[key].push({ start: row.start_date as string, end: row.end_date as string });
      });
    }

    // (Optional) sort each bucket by start date just in case
    Object.values(results).forEach((arr) =>
      arr.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
    );

    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

/* ----------------------------------- GET ----------------------------------- */
/**
 * Convenience GET for quick testing:
 * /api/availability/bulk?ids=1,2,3&includePending=1&pendingHours=48
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const idsParam = url.searchParams.get("ids") || "";
  const includePendingParam = url.searchParams.get("includePending") || "0";
  const pendingHoursParam = url.searchParams.get("pendingHours") || "";

  const vehicleIds = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const includePending =
    includePendingParam === "1" || includePendingParam.toLowerCase() === "true";

  const pendingHours = pendingHoursParam ? Number(pendingHoursParam) : undefined;

  const body: BulkBody = { vehicleIds, includePending, pendingHours };
  const proxyReq = new Request(req.url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  return POST(proxyReq);
}
