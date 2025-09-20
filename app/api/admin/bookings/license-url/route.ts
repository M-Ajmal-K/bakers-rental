import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return { url, serviceKey };
}

function adminClient() {
  const { url, serviceKey } = getEnv();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// GET /api/admin/bookings/license-url?path=<storage-object-path>
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path")?.trim();
    if (!path) {
      return new NextResponse("Missing `path`", { status: 400 });
    }

    // (Optional) basic safety: ensure it points to our licenses folder
    if (!path.startsWith("licenses/")) {
      return new NextResponse("Invalid path", { status: 400 });
    }

    const supabase = adminClient();

    // Create a short-lived signed URL (e.g., 5 minutes = 300 seconds)
    const { data, error } = await supabase.storage
      .from("licenses")
      .createSignedUrl(path, 300);

    if (error || !data?.signedUrl) {
      return new NextResponse(error?.message || "Could not sign URL", { status: 404 });
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (e: any) {
    return new NextResponse(e?.message || "Internal error", { status: 500 });
  }
}
