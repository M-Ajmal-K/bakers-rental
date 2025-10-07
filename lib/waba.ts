// lib/waba.ts
// WhatsApp Cloud API helpers (text + interactive buttons + image forward)

const GRAPH_API_VERSION = "v23.0"; // keep in sync with your webhook/test UI version
const BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const ACCESS_TOKEN = process.env.WABA_ACCESS_TOKEN || "";
const PHONE_NUMBER_ID = process.env.WABA_PHONE_NUMBER_ID || "";

function requireEnv(name: string, value: string) {
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
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
  });

  const data = (await res.json()) as any;

  if (!res.ok) {
    const err = data?.error ? JSON.stringify(data.error) : res.statusText;
    throw new Error(`[WABA] ${res.status} ${err}`);
  }
  return data as T;
}

/**
 * Send a plain text message via WhatsApp Cloud API.
 * For non-template outbound messages, the recipient must have messaged you within 24h.
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

/** Button definition for interactive messages */
export type WabaButton = {
  /** Developer-defined payload we get back in the webhook on click */
  id: string;
  /** What the user sees on the button (WABA hard limit ~20 chars) */
  title: string;
};

/**
 * Send up to 3 interactive reply buttons in one message.
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
      title: b.title.slice(0, 20),
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

/**
 * Convenience: send the owner a 2-button Approve/Decline prompt
 * for a specific booking.
 */
export async function sendOwnerApprovalButtons(params: {
  ownerPhoneE164Digits: string;
  bookingId: string; // internal UUID/id
  bookingCode: string; // human code like BR-123456
  summaryText: string; // short summary: dates/vehicle/amount
}) {
  const { ownerPhoneE164Digits, bookingId, bookingCode, summaryText } = params;

  const header = `Booking ${bookingCode}`;
  const body = `${summaryText}\n\nChoose an action:`.slice(0, 1024);

  const buttons: WabaButton[] = [
    { id: `confirm:${bookingId}`, title: "Confirm ✅" },
    { id: `decline:${bookingId}`, title: "Decline ❌" },
  ];

  return sendButtons(ownerPhoneE164Digits, body, buttons, header);
}

/**
 * Forward an image by its media ID to a recipient (owner).
 * Use this when a customer sends a receipt image; WA lets us reuse media by ID.
 */
export async function sendImageById(toE164Digits: string, mediaId: string, caption?: string) {
  requireEnv("WABA_PHONE_NUMBER_ID", PHONE_NUMBER_ID);

  const url = `${BASE}/${PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: toE164Digits,
    type: "image",
    image: {
      id: mediaId,
      ...(caption ? { caption: caption.slice(0, 1024) } : {}),
    },
  };

  return postJSON<any>(url, payload);
}
