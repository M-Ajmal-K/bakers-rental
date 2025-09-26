// app/api/whatsapp/test-send/route.ts
import { NextResponse } from "next/server";
import { sendText } from "@/lib/waba";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/whatsapp/test-send?to=679XXXXXXXX&text=Hello
 * - If ?to= is omitted, defaults to WABA_OWNER_PHONE from env.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const to = (url.searchParams.get("to") || process.env.WABA_OWNER_PHONE || "").replace(/\D/g, "");
    const text = url.searchParams.get("text") || "Test from Bakers Rentals server ✅";

    if (!to) {
      return NextResponse.json({ error: "missing 'to' (and WABA_OWNER_PHONE not set)" }, { status: 400 });
    }

    const apiRes = await sendText(to, text);
    return NextResponse.json({ ok: true, apiRes });
  } catch (err: any) {
    console.error("[test-send] error:", err?.message || err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
