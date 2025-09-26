// app/api/whatsapp/webhook/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Meta webhook verification (one-time when you register the webhook URL).
 * Meta will call GET with hub.challenge. We must echo it back if the verify token matches.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && challenge) {
    if (token === (process.env.WABA_WEBHOOK_VERIFY_TOKEN || "")) {
      // ✅ Echo challenge so Meta accepts the webhook
      return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    return NextResponse.json({ error: "Verification token mismatch" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Webhook receiver for WhatsApp messages and interactive replies.
 * For now we just acknowledge; we’ll add real handling in later steps.
 */
export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => null);
    // TEMP: log in server output to verify events arrive
    console.log("[WABA webhook] incoming:", JSON.stringify(payload, null, 2));
  } catch (e) {
    console.error("[WABA webhook] error parsing body:", e);
  }
  // Always 200 quickly so Meta doesn’t retry
  return NextResponse.json({ ok: true });
}
