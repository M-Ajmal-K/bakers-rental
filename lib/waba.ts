// lib/waba.ts
// WhatsApp Cloud API helpers (text + interactive buttons)

const GRAPH_API_VERSION = "v23.0"; // keep in sync with your webhook/test UI version
const BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const ACCESS_TOKEN = process.env.WABA_ACCESS_TOKEN || "";
const PHONE_NUMBER_ID = process.env.WABA_PHONE_NUMBER_ID || "";

function requireEnv(name: string, value: string) {
  if (!value) throw new Error(`Missing required env: ${name}`);
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  requireEnv("WABA_ACCESS_TOKEN", ACCESS_TOKEN);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as any;

  if (!res.ok) {
    // Surface WABA error details if present
    const err = data?.error ? JSON.stringify(data.error) : res.statusText;
    throw new Error(`[WABA] ${res.status} ${err}`);
  }
  return data as T;
}

/* ------------------------------------------------------------------ */
/* Basic senders                                                       */
/* ------------------------------------------------------------------ */

/**
 * Send a plain text message via WhatsApp Cloud API.
 * Notes:
 * - For non-template outbound messages, the recipient must have
 *   recently messaged your business (24h session window).
 */
export async function sendText(toE164Digits: string, body: string) {
  requireEnv("WABA_PHONE_NUMBER_ID", PHONE_NUMBER_ID);

  const url = `${BASE}/${PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: toE164Digits, // digits only, no '+'
    type: "text",
    text: { body },
  };

  return postJSON<any>(url, payload);
}

/**
 * Exported alias — some places prefer this name.
 */
export async function sendPlainText(toE164Digits: string, text: string) {
  return sendText(toE164Digits, text);
}

/** Button definition for interactive messages */
export type WabaButton = {
  /** Developer-defined payload we get back in the webhook on click */
  id: string;
  /** What the user sees on the button (WABA hard limit ~20 chars) */
  title: string;
};

/**
 * Send up to 3 interactive reply buttons in one message.
 * - `headerText` is optional (short, ~60 chars).
 * - `bodyText` is the main copy (limit ~1024 chars).
 * - `buttons` shows up to 3 reply buttons (each title ~20 chars).
 */
export async function sendButtons(
  toE164Digits: string,
  bodyText: string,
  buttons: WabaButton[],
  headerText?: string
) {
  requireEnv("WABA_PHONE_NUMBER_ID", PHONE_NUMBER_ID);

  const url = `${BASE}/${PHONE_NUMBER_ID}/messages`;

  const shaped = buttons.slice(0, 3).map((b) => ({
    type: "reply",
    reply: {
      id: b.id,
      title: b.title.slice(0, 20), // enforce WA UI limit
    },
  }));

  const payload: any = {
    messaging_product: "whatsapp",
    to: toE164Digits,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText.slice(0, 1024) },
      action: { buttons: shaped },
    },
  };

  if (headerText) {
    payload.interactive.header = {
      type: "text",
      text: headerText.slice(0, 60),
    };
  }

  return postJSON<any>(url, payload);
}

/* ------------------------------------------------------------------ */
/* Owner approval flow helper                                          */
/* ------------------------------------------------------------------ */

/**
 * Convenience: send the owner a 2-button Approve/Decline prompt
 * for a specific booking.
 */
export async function sendOwnerApprovalButtons(params: {
  ownerPhoneE164Digits: string; // e.g. "6792813118"
  bookingId: string;            // internal UUID/id
  bookingCode: string;          // human code like BR-123456
  summaryText: string;          // short summary: dates/vehicle/locations/etc.
}) {
  const { ownerPhoneE164Digits, bookingId, bookingCode, summaryText } = params;

  const header = `Booking ${bookingCode}`.slice(0, 60);
  const body = `${summaryText}\n\nTap a button:`.slice(0, 1024);

  const buttons: WabaButton[] = [
    { id: `confirm:${bookingId}`, title: "✅ Confirm" },
    { id: `decline:${bookingId}`, title: "❌ Decline" },
  ];

  return sendButtons(ownerPhoneE164Digits, body, buttons, header);
}
