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

// Optional ping so you can visit the route in a browser to check it's alive
export async function GET() {
  try {
    getEnv();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message || "Env error", { status: 500 });
  }
}

type Body = { id?: string };

export async function POST(req: Request) {
  try {
    const supabase = adminClient();
    const body = (await req.json().catch(() => ({}))) as Body;
    const id = body?.id?.trim();

    if (!id) return new NextResponse("Missing booking id", { status: 400 });

    // 1) Load current booking to get total_price
    const { data: booking, error: getErr } = await supabase
      .from("bookings")
      .select("id, status, total_price")
      .eq("id", id)
      .maybeSingle();

    if (getErr) return new NextResponse(getErr.message, { status: 400 });
    if (!booking) return new NextResponse("Booking not found", { status: 404 });

    const total = Number(booking.total_price ?? 0);

    // 2) Update payment fields (and optionally set status 'confirmed')
    const { data: updated, error: updErr } = await supabase
      .from("bookings")
      .update({
        payment_status: "paid_in_full",
        amount_paid: total,
        // If you want to force confirm when fully paid, uncomment next line:
        // status: "confirmed",
      })
      .eq("id", booking.id)
      .select("id, payment_status, amount_paid, total_price, status")
      .single();

    if (updErr) return new NextResponse(updErr.message, { status: 400 });

    return NextResponse.json({ ok: true, booking: updated });
  } catch (e: any) {
    console.error("[mark-paid-full] error", e);
    return new NextResponse(e?.message || "Server error", { status: 500 });
  }
}
