// app/api/whatsapp/webhook/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendText, sendOwnerApprovalButtons } from "@/lib/waba";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- helpers ---------------------------------------------------------------

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const OWNER_PHONE = (process.env.WABA_OWNER_PHONE || "").replace(/\D/g, "");
const BUSINESS_WA_ID = (process.env.WABA_PHONE_NUMBER_ID || "").replace(/\D/g, "");

/** Normalize digits-only phone (WhatsApp requires no '+') */
function digits(input?: string | null) {
  return (input || "").replace(/\D/g, "");
}

/** Extract first booking code like BR-123456 from text */
function extractBookingCode(text: string): string | null {
  const m = text?.match(/\bBR-\d{6}\b/i);
  return m ? m[0].toUpperCase() : null;
}

/** Format short summary for owner */
function formatOwnerSummary(booking: any, vehicle?: any) {
  const name = booking?.customer_name || "Unknown";
  const phone = booking?.contact_number || "-";
  const email = booking?.email || "-";
  const start = booking?.start_date;
  const end = booking?.end_date;
  const pt = booking?.pickup_time || "--:--";
  const dt = booking?.dropoff_time || "--:--";
  const pick = booking?.pickup_location || "-";
  const drop = booking?.dropoff_location || "-";
  const total = booking?.total_price != null ? Number(booking.total_price) : null;

  const vehicleStr = vehicle
    ? `${vehicle.title || vehicle.name || "Vehicle"}${
        vehicle.registration_number ? ` (${vehicle.registration_number})` : ""
      }`
    : "Vehicle";

  return [
    `Vehicle: ${vehicleStr}`,
    `Dates: ${start || "?"} • ${pt} → ${end || "?"} • ${dt}`,
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

/** Load booking by code + vehicle details */
async function loadBookingByCode(code: string) {
  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select(
      "id, code, status, customer_name, contact_number, email, vehicle_id, pickup_location, dropoff_location, start_date, end_date, pickup_time, dropoff_time, total_price"
    )
    .eq("code", code)
    .maybeSingle();

  if (error) throw error;
  if (!booking) return { booking: null, vehicle: null };

  let vehicle: any = null;
  if (booking.vehicle_id) {
    const { data: v, error: vErr } = await supabaseAdmin
      .from("vehicles")
      .select("id, title, registration_number")
      .eq("id", booking.vehicle_id)
      .maybeSingle();
    if (vErr) throw vErr;
    vehicle = v || null;
  }

  return { booking, vehicle };
}

/** Update booking status with idempotency */
async function setBookingStatus(bookingId: string, nextStatus: "confirmed" | "declined") {
  const { data: current, error: getErr } = await supabaseAdmin
    .from("bookings")
    .select("id, status")
    .eq("id", bookingId)
    .maybeSingle();
  if (getErr) throw getErr;
  if (!current) throw new Error("Booking not found");

  if (current.status === nextStatus) return { changed: false };
  // Allow moving from pending→(confirmed|declined). If it was already something else, still set.
  const { error: updErr } = await supabaseAdmin
    .from("bookings")
    .update({ status: nextStatus })
    .eq("id", bookingId);
  if (updErr) throw updErr;
  return { changed: true };
}

/** Send customer confirmation / decline message */
async function notifyCustomer(booking: any, nextStatus: "confirmed" | "declined") {
  const to = digits(booking.contact_number || "");
  if (!to) return;

  if (nextStatus === "confirmed") {
    const msg = [
      `✅ Booking ${booking.code} confirmed!`,
      `Pickup: ${booking.start_date || "?"} • ${booking.pickup_time || "--:--"}`,
      `Drop-off: ${booking.end_date || "?"} • ${booking.dropoff_time || "--:--"}`,
      `We look forward to seeing you. Reply here if you need anything.`,
    ].join("\n");
    await sendText(to, msg);
  } else {
    const msg = [
      `❌ Booking ${booking.code} was declined.`,
      `If you believe this is a mistake or want to try a different option, please reply here.`,
    ].join("\n");
    await sendText(to, msg);
  }
}

/** Is this webhook event from the owner’s phone? */
function isFromOwner(message: any) {
  const from = digits(message?.from || "");
  return OWNER_PHONE && from === OWNER_PHONE;
}

// --- GET: webhook verification ---------------------------------------------

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && challenge) {
    if (token === (process.env.WABA_WEBHOOK_VERIFY_TOKEN || "")) {
      return new NextResponse(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }
    return NextResponse.json({ error: "Verification token mismatch" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}

// --- POST: message & button handlers ---------------------------------------

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => null);
    if (!payload) return NextResponse.json({ ok: true });

    // WhatsApp wraps events like:
    // { object: "whatsapp_business_account",
    //   entry: [ { changes: [ { field: "messages", value: {...} } ] } ] }
    const entries: any[] = payload.entry || [];
    for (const entry of entries) {
      const changes: any[] = entry.changes || [];
      for (const ch of changes) {
        if (ch.field !== "messages") continue;

        const value = ch.value || {};

        // Full delivery-status log for outbound messages
        const statuses: any[] = Array.isArray(value.statuses) ? value.statuses : [];
        if (statuses.length) {
          console.log("[WA STATUS FULL]", JSON.stringify(statuses, null, 2));
        }

        const messages: any[] = value.messages || [];
        const contacts: any[] = value.contacts || [];
        // const metadata = value.metadata || {}; // contains phone_number_id, display_phone_number, etc.

        for (const msg of messages) {
          // 1) Button reply (owner tapped Confirm/Decline)
          //    Depending on WA, this can be:
          //    - msg.type === "button" with msg.button.payload
          //    - msg.type === "interactive" with msg.interactive.button_reply.id
          const buttonPayload =
            msg?.button?.payload ||
            msg?.interactive?.button_reply?.id ||
            null;

          if (buttonPayload) {
            // Only process if the click came from the OWNER phone
            if (!isFromOwner(msg)) {
              // Ignore silently (or log if needed)
              continue;
            }

            const m = String(buttonPayload).match(/^(confirm|decline):(.+)$/);
            if (!m) continue;

            const action = m[1] as "confirm" | "decline";
            const bookingId = m[2];

            // Load booking (for customer notify & code)
            const { data: booking, error } = await supabaseAdmin
              .from("bookings")
              .select(
                "id, code, status, contact_number, start_date, end_date, pickup_time, dropoff_time"
              )
              .eq("id", bookingId)
              .maybeSingle();

            if (error || !booking) {
              await sendText(OWNER_PHONE, `⚠️ Booking not found for id: ${bookingId}`);
              continue;
            }

            const nextStatus = action === "confirm" ? "confirmed" : "declined";
            try {
              const { changed } = await setBookingStatus(booking.id, nextStatus);
              if (changed) {
                await sendText(
                  OWNER_PHONE,
                  `✓ ${booking.code} ${nextStatus}. Customer will be notified.`
                );
                await notifyCustomer(booking, nextStatus);
              } else {
                await sendText(
                  OWNER_PHONE,
                  `ℹ️ ${booking.code} was already ${nextStatus}. No change made.`
                );
              }
            } catch (e: any) {
              await sendText(
                OWNER_PHONE,
                `❌ Failed to update ${booking.code}: ${e?.message || e}`
              );
            }

            continue; // proceed to next message
          }

          // 2) Customer text → detect booking code and DM owner buttons
          const type = msg.type;
          const from = digits(msg.from || "");
          const textBody =
            type === "text" ? (msg.text?.body || "") :
            type === "interactive" ? (msg?.interactive?.list_reply?.title || msg?.interactive?.button_reply?.title || "") :
            "";

          if (!textBody) continue;

          const code = extractBookingCode(textBody);
          if (!code) continue; // ignore unrelated chat

          // Load booking by code
          const { booking, vehicle } = await loadBookingByCode(code);
          if (!booking) {
            await sendText(
              OWNER_PHONE,
              `ℹ️ Message from ${from} mentioned ${code}, but no booking was found.`
            );
            continue;
          }

          // Basic guard: make sure it’s still pending (you can relax if you like)
          if (booking.status && booking.status !== "pending") {
            await sendText(
              OWNER_PHONE,
              `ℹ️ ${booking.code} is already ${booking.status}.`
            );
            continue;
          }

          const summary = formatOwnerSummary(booking, vehicle);
          await sendOwnerApprovalButtons({
            ownerPhoneE164Digits: OWNER_PHONE,
            bookingId: booking.id,
            bookingCode: booking.code,
            summaryText: summary,
          });

          // (Optional) Auto-reply to customer that the payment is under review
          await sendText(
            from,
            `Thanks! We’ve received your message for booking ${booking.code}. An agent will confirm shortly.`
          );
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[WABA webhook] error:", e);
    // Always 200 to prevent retries; log for debugging.
    return NextResponse.json({ ok: true });
  }
}
