import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createHash, timingSafeEqual, randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Keep these in sync with your other admin routes */
const COOKIE_NAME = "admin_session";
const BUCKET = "vehicle-photos";

/* ------------------------------ Env / Client ------------------------------ */
function envs() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const token = process.env.ADMIN_SESSION_TOKEN!;
  if (!url || !key || !token) throw new Error("Missing envs");
  return { url, key, token };
}
function admin() {
  const { url, key } = envs();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function safeEquals(a = "", b = "") {
  const da = createHash("sha256").update(a).digest();
  const db = createHash("sha256").update(b).digest();
  return timingSafeEqual(da, db);
}

/* -------------------------------- Helpers -------------------------------- */
function sanitizeName(name: string) {
  return name.replace(/[^a-z0-9.\-_]/gi, "_");
}

/* ------------------------------- POST /create ------------------------------ */
/**
 * Body: { filename: string, contentType: string, size?: number }
 * Returns: { ok: true, path, token, publicUrl }
 *
 * Client then does:
 * supabase.storage.from(bucket).uploadToSignedUrl(path, token, file)
 */
export async function POST(req: Request) {
  try {
    // Admin cookie check
    const { token } = envs();
    const jar = await cookies();
    const val = jar.get(COOKIE_NAME)?.value || "";
    if (!safeEquals(val, token)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { filename, contentType, size } = await req.json();

    if (!filename || !contentType) {
      return NextResponse.json({ ok: false, error: "filename and contentType are required" }, { status: 400 });
    }

    // (Optional) basic guardrails to match your UI text
    if (typeof size === "number" && size > 10 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "Max file size is 10MB" }, { status: 413 });
    }
    if (!/^image\//i.test(String(contentType))) {
      return NextResponse.json({ ok: false, error: "Only image uploads are allowed" }, { status: 400 });
    }

    const sb = admin();

    // Build a clean, unique storage key (relative path)
    const key = `vehicles/${randomUUID()}_${sanitizeName(String(filename)) || "upload"}`;

    // Create signed upload URL/token (server-side, service role)
    const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(key);
    if (error || !data?.token) {
      return NextResponse.json(
        { ok: false, error: error?.message || "Could not create signed upload URL" },
        { status: 500 }
      );
    }

    // Optional: return a public URL for immediate previews after upload
    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(key);

    return NextResponse.json({
      ok: true,
      path: key,             // relative storage key
      token: data.token,     // use with uploadToSignedUrl(path, token, file)
      publicUrl: pub?.publicUrl ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
