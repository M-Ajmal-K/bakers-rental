// app/api/whatsapp/test-send/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = process.env.WABA_ACCESS_TOKEN!;
const PHONE_ID = process.env.WABA_PHONE_NUMBER_ID!;
const OWNER_FALLBACK = (process.env.WABA_OWNER_PHONE || "").replace(/\D/g, "");
const GRAPH_BASE = "https://graph.facebook.com/v23.0";

/**
 * GET /api/whatsapp/test-send?to=679XXXXXXXX&text=Hello
 * - If ?to= is omitted, uses WABA_OWNER_PHONE from env.
 */
export async function GET(req: Request) {
  try {
    if (!TOKEN || !PHONE_ID) {
      return NextResponse.json(
        { ok: false, error: "Missing WABA_ACCESS_TOKEN or WABA_PHONE_NUMBER_ID" },
        { status: 500 }
      );
    }

    const url = new URL(req.url);
    const to = (url.searchParams.get("to") || OWNER_FALLBACK).replace(/\D/g, "");
    const text = url.searchParams.get("text") || "Test from Bakers Rentals server ✅";

    if (!to) {
      return NextResponse.json({ ok: false, error: "No recipient. Add ?to=679XXXXXXX or set WABA_OWNER_PHONE." }, { status: 400 });
    }

    const body = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    };

    const res = await fetch(`${GRAPH_BASE}/${PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("[test-send] WABA error:", res.status, res.statusText, data);
      return NextResponse.json({ ok: false, status: res.status, data }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[test-send] fatal:", err?.message || err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
