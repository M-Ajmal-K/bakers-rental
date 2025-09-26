// lib/waba.ts
// Minimal WhatsApp Cloud API helpers

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
      "Authorization": `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as any;

  if (!res.ok) {
    // Surface WABA error details if present
    const err = data?.error ? JSON.stringify(data.error) : res.statusText;
    throw new Error(`[WABA] ${res.status} ${err}`);
  }
  return data as T;
}

/**
 * Send a plain text message via WhatsApp Cloud API.
 * Notes:
 * - For non-template outbound messages, the recipient must have
 *   recently messaged your business (24h session window).
 * - For testing, send "hi" from that phone to your business number first,
 *   or use a template message instead.
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
