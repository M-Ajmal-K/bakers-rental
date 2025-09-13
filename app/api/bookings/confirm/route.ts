import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createHash, timingSafeEqual } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ----------------------------- Helpers / Env ----------------------------- */
function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminToken = process.env.ADMIN_SESSION_TOKEN;
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  if (!adminToken) {
    throw new Error("Missing ADMIN_SESSION_TOKEN env var.");
  }
  return { url, serviceKey, adminToken };
}

function adminClient() {
  const { url, serviceKey } = getEnv();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Constant-time compare using SHA-256 digests
function safeEquals(a: string, b: string) {
  const da = createHash("sha256").update(a || "").digest();
  const db = createHash("sha256").update(b || "").digest();
  return timingSafeEqual(da, db);
}

/* -------------------------------- Route --------------------------------- */
export async function POST(req: Request) {
  try {
    // 0) Admin auth via cookie
    const { adminToken } = getEnv();
    const jar = await cookies(); // <-- FIX: await cookies()
    const cookie = jar.get("admin_session")?.value || "";
    if (!cookie || !safeEquals(cookie, adminToken)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // 1) Input
    const body = await req.json().catch(() => ({}));
    const { id, code } = body || {};
    if (!id && !code) {
      return NextResponse.json({ ok: false, error: "Provide booking 'id' or 'code'." }, { status: 400 });
    }

    const supabase = adminClient();

    // 2) Find booking by id or code
    const filter = id ? { id } : { code };
    const { data: rows, error: findErr } = await supabase
      .from("bookings")
      .select("id, vehicle_id, start_date, end_date, status, code")
      .match(filter)
      .limit(1);

    if (findErr) return NextResponse.json({ ok: false, error: findErr.message }, { status: 400 });
    const booking = rows?.[0];
    if (!booking) return NextResponse.json({ ok: false, error: "Booking not found." }, { status: 404 });

    const currentStatus = String(booking.status || "").toLowerCase();

    // 3) Already confirmed?
    if (currentStatus === "confirmed") {
      return NextResponse.json({ ok: true, booking, message: "Already confirmed." });
    }

    // 4) Conflict check with other confirmed bookings on same vehicle
    const { data: conflicts, error: confErr } = await supabase
      .from("bookings")
      .select("id")
      .eq("vehicle_id", booking.vehicle_id)
      .eq("status", "confirmed")
      .lte("start_date", booking.end_date)
      .gte("end_date", booking.start_date)
      .neq("id", booking.id)
      .limit(1);

    if (confErr) return NextResponse.json({ ok: false, error: confErr.message }, { status: 400 });
    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { ok: false, error: "Cannot confirm: dates overlap an existing confirmed booking." },
        { status: 409 }
      );
    }

    // 5) Update to confirmed (lowercase for consistency)
    const { data: updated, error: updErr } = await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .match({ id: booking.id })
      .select()
      .limit(1);

    if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, booking: updated?.[0] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
