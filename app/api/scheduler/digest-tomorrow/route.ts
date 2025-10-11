// app/api/scheduler/digest-tomorrow/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendText } from "@/lib/waba";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TZ = "Pacific/Fiji";
const SEND_HOUR_LOCAL = 15;          // 3 PM Fiji
const SEND_WINDOW_MINUTES = 15;      // allow 3:00–3:14 PM window

/** digits-only helper */
function digits(s?: string | null) {
  return (s || "").replace(/\D/g, "");
}

/** Return YYYY-MM-DD string for a Date in a specific IANA tz */
function formatYMDInTZ(d: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  // en-CA yields YYYY-MM-DD
  return fmt.format(d);
}

/** tz-aware "now" */
function nowInTZ(timeZone: string) {
  return new Date(new Date().toLocaleString("en-US", { timeZone }));
}

/** Is it within the send window (3:00–3:14 PM Fiji)? */
function isInSendWindow() {
  const now = nowInTZ(TZ);
  const h = now.getHours();
  const m = now.getMinutes();
  return h === SEND_HOUR_LOCAL && m < SEND_WINDOW_MINUTES;
}

/** Get today/tomorrow strings in Pacific/Fiji */
function getTodayTomorrowStrings() {
  const now = nowInTZ(TZ);
  const todayStr = formatYMDInTZ(now, TZ);

  const tomorrow = new Date(now);
  // Add 1 day in tz-aware way: loop forward until the YMD string changes
  let probe = new Date(now);
  do {
    probe = new Date(probe.getTime() + 60 * 60 * 1000); // +1h
  } while (formatYMDInTZ(probe, TZ) === todayStr);
  const tomorrowStr = formatYMDInTZ(probe, TZ);

  return { todayStr, tomorrowStr };
}

type BookingRow = {
  id: string;
  code: string;
  status: string | null;
  customer_name: string | null;
  contact_number: string | null;
  email: string | null;
  vehicle_id: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  start_date: string | null;   // YYYY-MM-DD
  end_date: string | null;     // YYYY-MM-DD
  pickup_time: string | null;  // HH:mm
  dropoff_time: string | null; // HH:mm
  total_price: number | null;
  license_url?: string | null;
};

/** Fetch all bookings for today/tomorrow in one shot and vehicles used */
async function fetchDigestData() {
  const { todayStr, tomorrowStr } = getTodayTomorrowStrings();

  // Pull candidates for tomorrow pickups or drop-offs
  const { data: rows, error } = await supabaseAdmin
    .from("bookings")
    .select(
      "id, code, status, customer_name, contact_number, email, vehicle_id, pickup_location, dropoff_location, start_date, end_date, pickup_time, dropoff_time, total_price, license_url"
    )
    .or(`start_date.eq.${tomorrowStr},end_date.eq.${tomorrowStr}`);

  if (error) throw error;

  // Also pull bookings that end today (to compute MOVE/CLEAN against tomorrow)
  const { data: todayEnd, error: err2 } = await supabaseAdmin
    .from("bookings")
    .select(
      "id, code, status, vehicle_id, dropoff_location, end_date, dropoff_time"
    )
    .eq("end_date", todayStr);

  if (err2) throw err2;

  // Gather vehicle ids
  const vehIds = new Set<string>();
  [...(rows || []), ...(todayEnd || [])].forEach(r => r.vehicle_id && vehIds.add(r.vehicle_id!));

  let vehicles: Record<string, { title: string; registration_number: string | null }> = {};
  if (vehIds.size) {
    const { data: vehRows, error: vErr } = await supabaseAdmin
      .from("vehicles")
      .select("id, title, registration_number")
      .in("id", Array.from(vehIds));
    if (vErr) throw vErr;
    vehicles = Object.fromEntries(
      (vehRows || []).map(v => [v.id, { title: v.title || "Vehicle", registration_number: v.registration_number || null }])
    );
  }

  return {
    todayStr,
    tomorrowStr,
    rows: (rows || []) as BookingRow[],
    todayEnd: (todayEnd || []) as BookingRow[],
    vehicles,
  };
}

/** Detect simplistic conflicts for tomorrow: overlapping same-vehicle bookings */
function computeConflicts(tomorrowRows: BookingRow[]) {
  const byVeh: Record<string, BookingRow[]> = {};
  for (const r of tomorrowRows) {
    const vid = r.vehicle_id || "_";
    byVeh[vid] ||= [];
    byVeh[vid].push(r);
  }
  const conflicts: string[] = [];
  for (const [vid, arr] of Object.entries(byVeh)) {
    if (vid === "_" || arr.length < 2) continue;
    // sort by pickup time (fallback to 00:00) for tomorrow list
    const sorted = arr.slice().sort((a, b) => (a.pickup_time || "00:00").localeCompare(b.pickup_time || "00:00"));
    for (let i = 0; i < sorted.length - 1; i++) {
      const A = sorted[i], B = sorted[i + 1];
      // consider same day; if A dropoff_time > B pickup_time, flag
      const aEnd = (A.dropoff_time || "23:59");
      const bStart = (B.pickup_time || "00:00");
      if (aEnd > bStart) {
        conflicts.push(`${A.code} ↔ ${B.code}`);
      }
    }
  }
  return conflicts;
}

/** Compute logistics MOVE/CLEAN */
function computeLogistics(todayEnd: BookingRow[], tomorrowRows: BookingRow[]) {
  const moves: string[] = [];
  const cleans: string[] = [];

  // map last known drop-off today by vehicle
  const lastDropByVehicle = new Map<string, { where: string | null; time: string | null }>();
  for (const r of todayEnd) {
    if (!r.vehicle_id) continue;
    const prev = lastDropByVehicle.get(r.vehicle_id);
    // keep the latest drop-off time if multiple
    if (!prev || (r.dropoff_time || "00:00") > (prev.time || "00:00")) {
      lastDropByVehicle.set(r.vehicle_id, { where: r.dropoff_location || null, time: r.dropoff_time || null });
    }
  }

  // For each pickup tomorrow, compare locations & gaps
  const byVehTomorrow = new Map<string, BookingRow[]>();
  for (const r of tomorrowRows) {
    if (!r.vehicle_id) continue;
    const list = byVehTomorrow.get(r.vehicle_id) || [];
    list.push(r);
    byVehTomorrow.set(r.vehicle_id, list);
  }

  for (const [vehId, list] of byVehTomorrow) {
    const sorted = list.slice().sort((a, b) => (a.pickup_time || "00:00").localeCompare(b.pickup_time || "00:00"));
    const first = sorted[0];

    // MOVE check: yesterday/today drop-off → first pickup location tomorrow
    const lastDrop = lastDropByVehicle.get(vehId);
    if (lastDrop) {
      const from = (lastDrop.where || "").trim();
      const to = (first.pickup_location || "").trim();
      if (from && to && from.toLowerCase() !== to.toLowerCase()) {
        moves.push(`${vehId}: ${from} → ${to}`);
      }
    }

    // CLEAN check: gap between drop-off and next pickup *tomorrow*
    for (let i = 0; i < sorted.length - 1; i++) {
      const A = sorted[i];
      const B = sorted[i + 1];
      const aEnd = A.dropoff_time || "00:00";
      const bStart = B.pickup_time || "23:59";
      // crude hour gap parse
      const [ah, am] = aEnd.split(":").map(Number);
      const [bh, bm] = bStart.split(":").map(Number);
      const gapMinutes = (bh * 60 + bm) - (ah * 60 + am);
      if (gapMinutes > 0 && gapMinutes < 360) { // < 6h
        cleans.push(`${A.code} → ${B.code} (gap ${Math.floor(gapMinutes / 60)}h)`);
      }
    }
  }

  return { moves, cleans };
}

/** Build the WhatsApp digest text */
function buildDigestText(args: {
  dateStr: string;
  rowsTomorrow: BookingRow[];
  vehicles: Record<string, { title: string; registration_number: string | null }>;
  todayEnd: BookingRow[];
}) {
  const { dateStr, rowsTomorrow, vehicles, todayEnd } = args;

  const pickups = rowsTomorrow.filter(r => r.start_date === dateStr);
  const dropoffs = rowsTomorrow.filter(r => r.end_date === dateStr);
  const pending = rowsTomorrow.filter(r => (r.status || "pending").toLowerCase() === "pending");

  const conflicts = computeConflicts(rowsTomorrow);
  const { moves, cleans } = computeLogistics(todayEnd, rowsTomorrow);

  const lines: string[] = [];
  lines.push(`Tomorrow (${new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })})`);

  // Pickups
  lines.push("");
  lines.push("Pickups");
  if (pickups.length === 0) lines.push("• —");
  for (const r of pickups.sort((a,b)=> (a.pickup_time||"").localeCompare(b.pickup_time||""))) {
    const v = r.vehicle_id ? vehicles[r.vehicle_id] : undefined;
    const car = v ? `${v.title}${v.registration_number ? ` (${v.registration_number})` : ""}` : "Vehicle";
    const flags: string[] = [];
    if ((r.status || "pending").toLowerCase() === "pending") flags.push("PENDING");
    if (!r.license_url) flags.push("LICENSE?");
    lines.push(
      `• ${r.pickup_time || "--:--"} ${r.code} — ${car} — ${r.pickup_location || "-"} — ${r.customer_name || ""}${flags.length ? `  [${flags.join("][")}]` : ""}`
    );
  }

  // Drop-offs
  lines.push("");
  lines.push("Drop-offs");
  if (dropoffs.length === 0) lines.push("• —");
  for (const r of dropoffs.sort((a,b)=> (a.dropoff_time||"").localeCompare(b.dropoff_time||""))) {
    const v = r.vehicle_id ? vehicles[r.vehicle_id] : undefined;
    const car = v ? `${v.title}${v.registration_number ? ` (${v.registration_number})` : ""}` : "Vehicle";
    lines.push(
      `• ${r.dropoff_time || "--:--"} ${r.code} — ${car} — ${r.dropoff_location || "-"}`
    );
  }

  // Logistics
  if (moves.length || cleans.length) {
    lines.push("");
    lines.push("Logistics");
    for (const m of moves) lines.push(`• MOVE ${m}`);
    for (const c of cleans) lines.push(`• CLEAN ${c}`);
  }

  // Conflicts
  if (conflicts.length) {
    lines.push("");
    lines.push("Conflicts");
    for (const c of conflicts) lines.push(`• ${c}`);
  }

  // Pending summary
  if (pending.length) {
    lines.push("");
    lines.push("Action Needed");
    for (const r of pending) lines.push(`• ${r.code} (${r.customer_name || ""}) is still pending`);
  }

  return lines.join("\n").slice(0, 3500); // keep under WA text limits
}

/** Core handler used by GET/POST */
async function handleDigest({ dryRunTo }: { dryRunTo?: string }) {
  const { todayStr, tomorrowStr, rows, todayEnd, vehicles } = await fetchDigestData();

  const text = buildDigestText({
    dateStr: tomorrowStr,
    rowsTomorrow: rows,
    vehicles,
    todayEnd,
  });

  // choose recipients
  const preset = (process.env.WABA_DIGEST_RECIPIENTS || "").split(",").map(digits).filter(Boolean);
  const recipients = dryRunTo ? [digits(dryRunTo)] : preset;

  const deliveries: any[] = [];
  if (recipients.length) {
    for (const to of recipients) {
      try {
        const resp = await sendText(to, text);
        deliveries.push({ to, ok: true, resp });
      } catch (e: any) {
        deliveries.push({ to, ok: false, error: e?.message || String(e) });
      }
    }
  }

  return {
    ok: true,
    date: tomorrowStr,
    preview: text,
    recipients,
    delivered_to: deliveries,
  };
}

/* ----------------------------- GET (manual) ----------------------------- */
/** Test locally or from browser:
 *  /api/scheduler/digest-tomorrow?dryRun=1&to=679XXXXXXX
 *  If no query params, it will use WABA_DIGEST_RECIPIENTS env.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const dry = url.searchParams.get("dryRun");
    const to = url.searchParams.get("to") || undefined;

    const result = await handleDigest({ dryRunTo: dry ? to : undefined });
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[digest-tomorrow][GET] error:", e?.message || e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

/* ----------------------------- POST (cron) ------------------------------ */
/**
 * Configure your cron to hit this route **hourly** (e.g. "0 * * * *").
 * This POST handler sends only during the Fiji 3:00–3:14 PM window.
 * You can override the guard with ?force=1 in the POST URL if needed.
 */
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force");

    const now = nowInTZ(TZ);
    if (!force && !isInSendWindow()) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "Outside 3pm Fiji window",
        now_fiji_iso: now.toISOString(),
        hour_local: now.getHours(),
        minute_local: now.getMinutes(),
        tz: TZ,
      });
    }

    const result = await handleDigest({}); // use env recipients
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[digest-tomorrow][POST] error:", e?.message || e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
