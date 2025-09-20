import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";            // keep the service key safe
export const dynamic = "force-dynamic";     // no caching

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return { url, serviceKey };
}

function adminClient() {
  const { url, serviceKey } = getEnv();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Simple GET so you can visit /api/bookings/create in the browser to verify the route is alive
export async function GET() {
  try {
    getEnv();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Env error", { status: 500 });
  }
}

type Payload = {
  vehicle_id: string;
  start_date: string;       // "YYYY-MM-DD"
  end_date: string;         // "YYYY-MM-DD"
  pickup_location: string;
  dropoff_location: string;
  customer_name: string;
  contact_number: string;
  email: string;
  total_price?: number | null;
};

// Helpers
function isMultipart(req: Request) {
  const ct = req.headers.get("content-type") || "";
  return ct.toLowerCase().includes("multipart/form-data");
}

function getFileExtension(name?: string | null) {
  if (!name) return "";
  const idx = name.lastIndexOf(".");
  if (idx === -1) return "";
  return name.slice(idx); // includes dot
}

export async function POST(req: Request) {
  const supabase = adminClient();

  let body: Payload;
  let licenseFile: File | null = null;

  // Accept both JSON and multipart/form-data
  if (isMultipart(req)) {
    const form = await req.formData();
    const payloadRaw = form.get("payload");
    if (typeof payloadRaw !== "string") {
      return new NextResponse("Missing 'payload' in multipart form", { status: 400 });
    }
    try {
      body = JSON.parse(payloadRaw) as Payload;
    } catch {
      return new NextResponse("Invalid JSON in 'payload'", { status: 400 });
    }
    const maybeFile = form.get("license");
    if (maybeFile instanceof File) {
      licenseFile = maybeFile;
    }
  } else {
    try {
      body = await req.json();
    } catch {
      return new NextResponse("Invalid JSON", { status: 400 });
    }
  }

  const {
    vehicle_id,
    start_date,
    end_date,
    pickup_location,
    dropoff_location,
    customer_name,
    contact_number,
    email,
    total_price = null,
  } = body || ({} as Payload);

  // minimal validation
  if (
    !vehicle_id ||
    !start_date ||
    !end_date ||
    !pickup_location ||
    !dropoff_location ||
    !customer_name ||
    !contact_number ||
    !email
  ) {
    return new NextResponse("Missing required fields", { status: 400 });
  }

  // generate a mostly-unique booking code (you can replace this with DB default/sequence if preferred)
  const code = `BR-${Date.now().toString().slice(-6)}`;

  // Insert booking (without license fields yet)
  const insertRow = {
    vehicle_id,
    start_date,
    end_date,
    pickup_location,
    dropoff_location,
    customer_name,
    contact_number,
    email,
    total_price,
    status: "PENDING",
    code,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("bookings")
    .insert(insertRow)
    .select("id, code, status")
    .single();

  if (insertError || !inserted) {
    return new NextResponse(insertError?.message ?? "Insert failed", { status: 400 });
  }

  // If a license file is provided, upload to private bucket and update the row
  if (licenseFile) {
    try {
      const bookingId = inserted.id as string;
      const ext = getFileExtension(licenseFile.name) || (licenseFile.type === "image/png" ? ".png" : ".jpg");
      const objectPath = `licenses/${bookingId}/license-${Date.now()}${ext}`;

      const arrayBuf = await licenseFile.arrayBuffer();

      const { error: uploadErr } = await supabase.storage
        .from("licenses")
        .upload(objectPath, arrayBuf, {
          contentType: licenseFile.type || "application/octet-stream",
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadErr) {
        // We won't fail the whole booking if upload fails; return 207-like info
        console.error("[create] license upload failed:", uploadErr.message);
      } else {
        // Store STORAGE PATH in bookings. (Bucket is private; we'll serve signed URLs later.)
        const { error: updateErr } = await supabase
          .from("bookings")
          .update({ license_url: objectPath, license_uploaded_at: new Date().toISOString() })
          .eq("id", bookingId);

        if (updateErr) {
          console.error("[create] license URL update failed:", updateErr.message);
        }
      }
    } catch (e: any) {
      console.error("[create] license handling exception:", e?.message || e);
    }
  }

  return NextResponse.json(inserted, { status: 201 });
}
