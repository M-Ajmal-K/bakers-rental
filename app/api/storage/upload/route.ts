import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server-only
const BUCKET = "vehicle-photos";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Create a unique file name inside vehicles/
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const path = `vehicles/${fileName}`;

    // Use service role for upload
    const serverSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { error: uploadErr } = await serverSupabase.storage
      .from(BUCKET)
      .upload(path, file, {
        upsert: false,
        contentType: file.type || "image/jpeg",
      });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 400 });
    }

    const { data: pub } = serverSupabase.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json({ path, publicUrl: pub.publicUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 });
  }
}
