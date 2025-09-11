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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, code } = body || {};

    if (!id && !code) {
      return new NextResponse("Provide booking 'id' or 'code'.", { status: 400 });
    }

    const supabase = adminClient();

    // 1) find the booking
    const filter = id ? { id } : { code };
    const { data: rows, error: findErr } = await supabase
      .from("bookings")
      .select("id, vehicle_id, start_date, end_date, status, code")
      .match(filter)
      .limit(1);

    if (findErr) return new NextResponse(findErr.message, { status: 400 });
    const booking = rows?.[0];
    if (!booking) return new NextResponse("Booking not found.", { status: 404 });

    // 2) already confirmed?
    if (booking.status === "CONFIRMED") {
      return NextResponse.json({ ok: true, booking, message: "Already confirmed." });
    }

    // 3) ensure no overlap with other confirmed bookings
    const { data: conflicts, error: confErr } = await supabase
      .from("bookings")
      .select("id")
      .eq("vehicle_id", booking.vehicle_id)
      .eq("status", "CONFIRMED")
      .lte("start_date", booking.end_date)
      .gte("end_date", booking.start_date)
      .neq("id", booking.id)
      .limit(1);

    if (confErr) return new NextResponse(confErr.message, { status: 400 });
    if (conflicts && conflicts.length > 0) {
      return new NextResponse("Cannot confirm: dates overlap an existing confirmed booking.", { status: 409 });
    }

    // 4) update to CONFIRMED
    const { data: updated, error: updErr } = await supabase
      .from("bookings")
      .update({ status: "CONFIRMED" })
      .match({ id: booking.id })
      .select()
      .limit(1);

    if (updErr) return new NextResponse(updErr.message, { status: 400 });

    return NextResponse.json({ ok: true, booking: updated?.[0] });
  } catch (e: any) {
    return new NextResponse(e?.message || "Server error", { status: 500 });
  }
}
