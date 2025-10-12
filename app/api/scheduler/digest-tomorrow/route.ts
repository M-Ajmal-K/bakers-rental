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

  // Add 1 day in tz-aware way: loop forward until YMD changes
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
  flight_number?: string | null;
  vehicle_id: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  start_date: string | null;   // YYYY-MM-DD
  end_date: string | null;     // YYYY-MM-DD
  pickup_time: string | null;  // HH:mm or HH:mm:ss
  dropoff_time: string | null; // HH:mm or HH:mm:ss
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
      "id, code, status, customer_name, contact_number, email, flight_number, vehicle_id, pickup_location, dropoff_location, start_date, end_date, pickup_time, dropoff_time, total_price, license_url"
    )
    .or(`start_date.eq.${tomorrowStr},end_date.eq.${tomorrowStr}`);

  if (error) throw error;

  // Also pull bookings that end today (to detect same-vehicle handoffs)
  const { data: todayEnd, error: err2 } = await supabaseAdmin
    .from("bookings")
    .select("id, code, status, vehicle_id, dropoff_location, end_date, dropoff_time")
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

/** utils */
function toHm(timeStr?: string | null) {
  if (!timeStr) return null;
  const [hh, mm] = timeStr.split(":");
  return `${hh}:${mm}`;
}

/** Unified task type (like admin dashboard) */
type UnifiedTaskType = "Deliver" | "Pick up";
type UnifiedTask = {
  type: UnifiedTaskType;
  time: string; // HH:MM
  bookingId: string;
  bookingCode: string;
  vehicleTitle: string;
  plate: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  flightNumber: string | null;
  fromLocation: string; // original source (used only for Pick up display)
  toLocation: string;   // destination (used only for Deliver display)
};

/** Build the same task list the admin dashboard shows, but for tomorrow */
function buildUnifiedTasksForTomorrow(
  ymd: string,
  rows: BookingRow[],
  vehicles: Record<string, { title: string; registration_number: string | null }>
): UnifiedTask[] {
  const rowsStart = rows.filter(r => r.start_date === ymd);
  const rowsEnd = rows.filter(r => r.end_date === ymd);

  // index by vehicle for this date
  const endByVeh = new Map<string, BookingRow[]>();
  rowsEnd.forEach(b => {
    const key = b.vehicle_id || "_";
    const list = endByVeh.get(key) || [];
    list.push(b);
    endByVeh.set(key, list);
  });

  const startByVeh = new Map<string, BookingRow[]>();
  rowsStart.forEach(b => {
    const key = b.vehicle_id || "_";
    const list = startByVeh.get(key) || [];
    list.push(b);
    startByVeh.set(key, list);
  });

  const defaultPickupTime = "09:00";
  const defaultDropoffTime = "17:00";

  const tasks: UnifiedTask[] = [];

  // Deliver rows for START bookings
  for (const s of rowsStart) {
    const veh = s.vehicle_id ? vehicles[s.vehicle_id] : undefined;
    const vehTitle = veh?.title || "Vehicle";
    const plate = veh?.registration_number || "";

    const sameDayEnds = (endByVeh.get(s.vehicle_id || "_") || []).sort((a, b) =>
      (a.dropoff_time || "").localeCompare(b.dropoff_time || "")
    );
    const prevEnd = sameDayEnds[0]; // mirrors admin logic

    const startAt = toHm(s.pickup_time) || defaultPickupTime;

    // Keep raw values; we'll decide what to render in the formatter
    const from = prevEnd?.dropoff_location || "";
    const to = s.pickup_location || "";

    tasks.push({
      type: "Deliver",
      time: startAt,
      bookingId: s.id,
      bookingCode: s.code || s.id.slice(0, 8).toUpperCase(),
      vehicleTitle: vehTitle,
      plate,
      customerName: s.customer_name || "",
      customerPhone: s.contact_number || null,
      customerEmail: s.email || null,
      flightNumber: s.flight_number ?? null,
      fromLocation: from,
      toLocation: to,
    });
  }

  // Pick-up only rows for END bookings without a START on same day
  for (const e of rowsEnd) {
    const hasStartSameDay = (startByVeh.get(e.vehicle_id || "_") || []).length > 0;
    if (hasStartSameDay) continue; // represented by a Deliver task already

    const veh = e.vehicle_id ? vehicles[e.vehicle_id] : undefined;
    const vehTitle = veh?.title || "Vehicle";
    const plate = veh?.registration_number || "";

    const endAt = toHm(e.dropoff_time) || defaultDropoffTime;

    tasks.push({
      type: "Pick up",
      time: endAt,
      bookingId: e.id,
      bookingCode: e.code || e.id.slice(0, 8).toUpperCase(),
      vehicleTitle: vehTitle,
      plate,
      customerName: e.customer_name || "",
      customerPhone: e.contact_number || null,
      customerEmail: e.email || null,
      flightNumber: e.flight_number ?? null,
      fromLocation: e.dropoff_location || "",
      toLocation: "",
    });
  }

  // Sort by time asc, then Pick up before Deliver when same time
  tasks.sort((a, b) => {
    const t = a.time.localeCompare(b.time);
    if (t !== 0) return t;
    if (a.type === b.type) return 0;
    return a.type === "Pick up" ? -1 : 1;
  });

  return tasks;
}

/** Optional: detect simplistic conflicts for tomorrow: overlapping same-vehicle bookings */
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
      const aEnd = (A.dropoff_time || "23:59");
      const bStart = (B.pickup_time || "00:00");
      if (aEnd > bStart) {
        conflicts.push(`${A.code} ↔ ${B.code}`);
      }
    }
  }
  return conflicts;
}

/** Build the WhatsApp digest text — unified "Tasks" section like Admin, with bold & emojis */
function buildDigestText(args: {
  dateStr: string;
  rowsTomorrow: BookingRow[];
  vehicles: Record<string, { title: string; registration_number: string | null }>;
}) {
  const { dateStr, rowsTomorrow, vehicles } = args;

  const tasks = buildUnifiedTasksForTomorrow(dateStr, rowsTomorrow, vehicles);
  const conflicts = computeConflicts(rowsTomorrow);

  const prettyDate = new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const lines: string[] = [];
  lines.push(`Tomorrow (${prettyDate})`);
  lines.push("");
  lines.push("Tasks");

  if (tasks.length === 0) {
    lines.push("• —");
  } else {
    for (const t of tasks) {
      const car = t.plate ? `${t.vehicleTitle} (${t.plate})` : t.vehicleTitle;

      // First line: bullet, time, bold task type, booking code
      lines.push(`• 🕒 ${t.time} *${t.type}* — ${t.bookingCode}`);

      // Car
      lines.push(`  🚗 Car: ${car}`);

      // Customer name (if any)
      if (t.customerName) {
        lines.push(`  👤 Customer: ${t.customerName}`);
      }

      // Contact (phone/email)
      const contactBits = [t.customerPhone || "", t.customerEmail || ""].filter(Boolean).join(" · ");
      if (contactBits) {
        lines.push(`  ☎️ Contact: ${contactBits}`);
      }

      // Flight (if any)
      if (t.flightNumber) {
        lines.push(`  ✈️ Flight: ${t.flightNumber}`);
      }

      // Location(s): no depot/as-arranged fallbacks; only what matters
      if (t.type === "Deliver") {
        if (t.toLocation) {
          lines.push(`  📍 To: ${t.toLocation}`);
        }
      } else {
        // Pick up
        if (t.fromLocation) {
          lines.push(`  📍 Pick up from: ${t.fromLocation}`);
        }
      }

      // Blank line after each task for readability
      lines.push("");
    }
  }

  if (conflicts.length) {
    lines.push("Conflicts");
    for (const c of conflicts) lines.push(`• ${c}`);
  }

  // keep comfortably below WA text limits
  return lines.join("\n").slice(0, 3500);
}

/** Core handler used by GET/POST */
async function handleDigest({ dryRunTo }: { dryRunTo?: string }) {
  const { tomorrowStr, rows, vehicles } = await fetchDigestData();

  const text = buildDigestText({
    dateStr: tomorrowStr,
    rowsTomorrow: rows,
    vehicles,
  });

  // choose recipients
  const preset = (process.env.WABA_DIGEST_RECIPIENTS || "")
    .split(",")
    .map(digits)
    .filter(Boolean);
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
