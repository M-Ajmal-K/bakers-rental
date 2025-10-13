// app/api/whatsapp/webhook/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendText, sendOwnerApprovalButtons, sendImageById } from "@/lib/waba";

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

/**
 * Extract first booking code from text.
 * Accepts: BR-1234, BR 1234, br-000123, etc. (3–8 digits) and normalizes to BR-<digits>.
 */
function extractBookingCode(text: string): string | null {
  const m = text?.match(/\bBR[ -]?(\d{3,8})\b/i);
  return m ? `BR-${m[1]}`.toUpperCase() : null;
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

/** Apply owner action with idempotency + payment fields */
async function applyOwnerAction(
  bookingId: string,
  action: "confirm" | "decline" | "paylater"
): Promise<{ changed: boolean; after?: any }> {
  // Pull all fields we might update / reference for messages
  const { data: current, error: getErr } = await supabaseAdmin
    .from("bookings")
    .select(
      "id, code, status, contact_number, start_date, end_date, pickup_time, dropoff_time, payment_status, amount_paid, deposit_amount"
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (getErr) throw getErr;
  if (!current) throw new Error("Booking not found");

  const curStatus = String(current.status || "").toLowerCase();
  const curPay = String(current.payment_status || "unpaid") as
    | "unpaid"
    | "deposit_paid"
    | "pay_later"
    | "paid_in_full";
  const curPaid = Number(current.amount_paid ?? 0);
  const deposit = Number(current.deposit_amount ?? 200);

  // Desired fields per action
  let next: Partial<typeof current> = {};
  if (action === "confirm") {
    next.status = "confirmed";
    next.payment_status = "deposit_paid";
    next.amount_paid = Math.max(curPaid, deposit);
  } else if (action === "paylater") {
    next.status = "confirmed";
    next.payment_status = "pay_later";
    // leave amount_paid as-is
  } else {
    // decline -> use 'cancelled' to match your UI/status filters
    next.status = "cancelled";
    // optional: next.payment_status = "unpaid";
  }

  const willChange =
    (next.status && next.status !== curStatus) ||
    (typeof next.payment_status !== "undefined" && next.payment_status !== curPay) ||
    (typeof next.amount_paid !== "undefined" && next.amount_paid !== curPaid);

  if (!willChange) return { changed: false, after: current };

  const { data: updated, error: updErr } = await supabaseAdmin
    .from("bookings")
    .update(next)
    .eq("id", bookingId)
    .select(
      "id, code, status, contact_number, start_date, end_date, pickup_time, dropoff_time, payment_status, amount_paid, deposit_amount"
    )
    .maybeSingle();

  if (updErr) throw updErr;
  return { changed: true, after: updated || current };
}

/** Send customer message based on final state */
async function notifyCustomerForAction(after: any, action: "confirm" | "decline" | "paylater") {
  const to = digits(after?.contact_number || "");
  if (!to) return;

  if (action === "confirm") {
    const paid = Number(after?.amount_paid ?? 0);
    const dep = Number(after?.deposit_amount ?? 200);
    const msg = [
      `✅ Booking ${after.code} confirmed (deposit recorded).`,
      `Paid: $${paid.toFixed(2)} FJD (Deposit: $${dep.toFixed(2)})`,
      `Pickup: ${after.start_date || "?"} • ${after.pickup_time || "--:--"}`,
      `Drop-off: ${after.end_date || "?"} • ${after.dropoff_time || "--:--"}`,
      `Reply here if you need anything.`,
    ].join("\n");
    await sendText(to, msg);
  } else if (action === "paylater") {
    const msg = [
      `📝 Booking ${after.code} approved as *Pay Later*.`,
      `You can pay the balance before or at pickup.`,
      `Pickup: ${after.start_date || "?"} • ${after.pickup_time || "--:--"}`,
      `If you prefer to pay a deposit now, reply with your receipt and we'll mark it confirmed.`,
    ].join("\n");
    await sendText(to, msg);
  } else {
    const msg = [
      `❌ Booking ${after.code} was cancelled.`,
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

    const entries: any[] = payload.entry || [];
    for (const entry of entries) {
      const changes: any[] = entry.changes || [];
      for (const ch of changes) {
        if (ch.field !== "messages") continue;

        const value = ch.value || {};

        // Log delivery-status updates for debugging
        const statuses: any[] = Array.isArray(value.statuses) ? value.statuses : [];
        if (statuses.length) {
          console.log("[WA STATUS FULL]", JSON.stringify(statuses, null, 2));
        }

        const messages: any[] = value.messages || [];

        for (const msg of messages) {
          // 1) Owner clicking an interactive button (Confirm/Decline/Pay Later)
          const buttonPayload =
            msg?.button?.payload ||
            msg?.interactive?.button_reply?.id ||
            null;

          if (buttonPayload) {
            // Only trust owner's clicks
            if (!isFromOwner(msg)) {
              continue;
            }

            const m = String(buttonPayload).match(/^(confirm|decline|paylater):(.+)$/);
            if (!m) continue;

            const action = m[1] as "confirm" | "decline" | "paylater";
            const bookingId = m[2];

            try {
              const { changed, after } = await applyOwnerAction(bookingId, action);

              if (changed) {
                await sendText(
                  OWNER_PHONE,
                  `✓ ${after.code} ${action === "confirm" ? "confirmed (deposit paid)" : action === "paylater" ? "set to Pay Later" : "cancelled"}. Customer will be notified.`
                );
                await notifyCustomerForAction(after, action);
              } else {
                await sendText(
                  OWNER_PHONE,
                  `ℹ️ No change for ${after?.code || bookingId}. It was already in that state.`
                );
              }
            } catch (e: any) {
              await sendText(
                OWNER_PHONE,
                `❌ Failed to update booking ${bookingId}: ${e?.message || e}`
              );
            }

            continue; // next message
          }

          // 2) Customer message (text and/or image)
          const from = digits(msg.from || "");
          const type = msg.type;

          // Grab text from different shapes
          const textBody =
            type === "text"
              ? (msg.text?.body || "")
              : type === "interactive"
              ? (msg?.interactive?.list_reply?.title || msg?.interactive?.button_reply?.title || "")
              : type === "image"
              ? (msg?.image?.caption || "")
              : "";

          // If there is an image, forward it to owner immediately (so they can see the receipt),
          // regardless of whether we recognized a code. We'll try to parse code from caption too.
          const incomingImageId: string | undefined =
            type === "image" ? msg?.image?.id : undefined;

          if (incomingImageId) {
            const caption = textBody || `Image from ${from}`;
            // This re-sends the MEDIA by ID to the owner (no re-upload).
            await sendImageById(
              OWNER_PHONE,
              incomingImageId,
              `Payment image from ${from}${extractBookingCode(caption) ? ` • ${extractBookingCode(caption)}` : ""}`
            );
          }

          // Try extract booking code from whatever text we have (plain text or image caption).
          const code = extractBookingCode(textBody || "");
          if (!code) {
            // No recognizable booking code; you might choose to alert owner here,
            // but we'll stay silent to avoid noise.
            continue;
          }

          // Load booking by code
          const { booking, vehicle } = await loadBookingByCode(code);
          if (!booking) {
            await sendText(
              OWNER_PHONE,
              `ℹ️ Message from ${from} mentioned ${code}, but no booking was found.`
            );
            continue;
          }

          // Basic guard: only escalate if still pending
          if (booking.status && String(booking.status).toLowerCase() !== "pending") {
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

          // Auto-ack to customer
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
