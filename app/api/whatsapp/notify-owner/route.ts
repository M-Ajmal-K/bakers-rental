// app/api/whatsapp/notify-owner/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendOwnerApprovalButtons, sendPlainText } from "@/lib/waba";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const OWNER_PHONE = (process.env.WABA_OWNER_PHONE || "").replace(/\D/g, "");

function digits(v?: string | null) {
  return (v || "").replace(/\D/g, "");
}

/** Build a compact summary the owner will see above the buttons */
function formatOwnerSummary(booking: any, vehicle?: any) {
  const name = booking?.customer_name || "Unknown";
  const phone = booking?.contact_number || "-";
  const email = booking?.email || "-";

  const start = booking?.start_date || "?";
  const end = booking?.end_date || "?";
  const pt = booking?.pickup_time || "--:--";
  const dt = booking?.dropoff_time || "--:--";
  const pick = booking?.pickup_location || "-";
  const drop = booking?.dropoff_location || "-";
  const total =
    booking?.total_price != null ? Number(booking.total_price) : null;

  const vehicleStr = vehicle
    ? `${vehicle.title || "Vehicle"}${
        vehicle.registration_number ? ` (${vehicle.registration_number})` : ""
      }`
    : "Vehicle";

  return [
    `Vehicle: ${vehicleStr}`,
    `Dates: ${start} • ${pt} → ${end} • ${dt}`,
    `Pickup: ${pick}`,
    `Drop-off: ${drop}`,
    `Customer: ${name}`,
    `Phone: ${phone}`,
    `Email: ${email}`,
    total != null ? `Total Quote: $${total} FJD` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

async function loadByCodeOrId(input: { code?: string; id?: string }) {
  let booking: any = null;

  if (input.id) {
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, code, status, customer_name, contact_number, email, vehicle_id, pickup_location, dropoff_location, start_date, end_date, pickup_time, dropoff_time, total_price"
      )
      .eq("id", input.id)
      .maybeSingle();
    if (error) throw error;
    booking = data;
  } else if (input.code) {
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, code, status, customer_name, contact_number, email, vehicle_id, pickup_location, dropoff_location, start_date, end_date, pickup_time, dropoff_time, total_price"
      )
      .eq("code", input.code)
      .maybeSingle();
    if (error) throw error;
    booking = data;
  }

  if (!booking) return { booking: null, vehicle: null };

  let vehicle: any = null;
  if (booking.vehicle_id) {
    const { data: v, error: vErr } = await supabaseAdmin
      .from("vehicles")
      .select("id, title, registration_number") // <- removed `name`
      .eq("id", booking.vehicle_id)
      .maybeSingle();
    if (vErr) throw vErr;
    vehicle = v || null;
  }

  return { booking, vehicle };
}

async function doNotify(input: { code?: string; id?: string }) {
  if (!OWNER_PHONE) throw new Error("WABA_OWNER_PHONE not set");

  const { booking, vehicle } = await loadByCodeOrId(input);
  if (!booking) {
    await sendPlainText(
      OWNER_PHONE,
      `ℹ️ No booking found for ${input.code || input.id}`
    );
    return { ok: false, reason: "not_found" };
  }

  // Optional guard: only ping owner if still pending
  if (booking.status && booking.status !== "pending") {
    await sendPlainText(
      OWNER_PHONE,
      `ℹ️ ${booking.code} is already ${booking.status}.`
    );
    return { ok: true, skipped: "already_final" };
  }

  const summary = formatOwnerSummary(booking, vehicle);

  await sendOwnerApprovalButtons({
    ownerPhoneE164Digits: OWNER_PHONE,
    bookingId: booking.id,
    bookingCode: booking.code,
    summaryText: summary,
  });

  return { ok: true, bookingId: booking.id, code: booking.code };
}

/* ---------------------------- GET (quick test) ---------------------------- */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code") || undefined;
    const id = url.searchParams.get("id") || undefined;

    if (!code && !id) {
      return NextResponse.json(
        { ok: false, error: "Provide ?code=BR-123456 or ?id=<booking_id>" },
        { status: 400 }
      );
    }

    const out = await doNotify({ code: code || undefined, id: id || undefined });
    return NextResponse.json(out);
  } catch (e: any) {
    console.error("[notify-owner][GET] error:", e?.message || e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

/* ---------------------------- POST (preferred) ---------------------------- */
export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({} as any));
    const code = json?.code as string | undefined;
    const id = json?.id as string | undefined;

    if (!code && !id) {
      return NextResponse.json(
        { ok: false, error: "POST body must include { code } or { id }" },
        { status: 400 }
      );
    }

    const out = await doNotify({ code, id });
    return NextResponse.json(out);
  } catch (e: any) {
    console.error("[notify-owner][POST] error:", e?.message || e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
