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
  /**
   * Vehicle-only subtotal coming from the client UI (without location fees).
   * If client sends grand total by mistake, we still overwrite with our final calc.
   */
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
    total_price = 0, // treat as vehicle-only subtotal
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

  // ---- Look up fees from service_locations (case-insensitive, only active) ----
  const normalize = (s: string) => s.trim();

  const { data: pickupRow, error: pickupErr } = await supabase
    .from("service_locations")
    .select("name, fee_fjd")
    .ilike("name", normalize(pickup_location))
    .eq("is_active", true)
    .maybeSingle();

  if (pickupErr) {
    return new NextResponse(`Pickup lookup error: ${pickupErr.message}`, { status: 400 });
  }
  if (!pickupRow) {
    return new NextResponse(
      `Pickup location not allowed: "${pickup_location}". Please choose one of the active service locations.`,
      { status: 400 }
    );
  }

  const { data: dropRow, error: dropErr } = await supabase
    .from("service_locations")
    .select("name, fee_fjd")
    .ilike("name", normalize(dropoff_location))
    .eq("is_active", true)
    .maybeSingle();

  if (dropErr) return new NextResponse(`Drop-off lookup error: ${dropErr.message}`, { status: 400 });
  if (!dropRow) {
    return new NextResponse(
      `Drop-off location not allowed: "${dropoff_location}". Please choose one of the active service locations.`,
      { status: 400 }
    );
  }

  const pickupFeeFjd = Number(pickupRow.fee_fjd || 0);
  const dropoffFeeFjd = Number(dropRow.fee_fjd || 0);
  const finalTotal = Number(total_price || 0) + pickupFeeFjd + dropoffFeeFjd;

  // generate a mostly-unique booking code (you also have a DB default; this is fine too)
  const code = `BR-${Date.now().toString().slice(-6)}`;

  // Insert booking (no fee columns yet — we’ll add them later if you want to snapshot)
  const insertRow = {
    vehicle_id,
    start_date,
    end_date,
    pickup_location: pickupRow.name, // normalized DB value
    dropoff_location: dropRow.name,  // normalized DB value
    customer_name,
    contact_number,
    email,
    total_price: finalTotal,         // store final amount including fees
    status: "PENDING",
    code,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("bookings")
    .insert(insertRow)
    .select("id, code, status, total_price")
    .single();

  if (insertError || !inserted) {
    return new NextResponse(insertError?.message ?? "Insert failed", { status: 400 });
  }

  // If a license file is provided, upload to private bucket and update the row
  if (licenseFile) {
    try {
      const bookingId = inserted.id as string;
      const ext =
        getFileExtension(licenseFile.name) ||
        (licenseFile.type === "image/png" ? ".png" : ".jpg");
      const objectPath = `licenses/${bookingId}/license-${Date.now()}${ext}`;

      const arrayBuf = await licenseFile.arrayBuffer();

      const { error: uploadErr } = await supabase.storage
        .from("licenses")
        .upload(objectPath, arrayBuf, {
          contentType: licenseFile.type || "application/octet-stream",
          cacheControl: "3600",
          upsert: false,
        });

      if (!uploadErr) {
        await supabase
          .from("bookings")
          .update({ license_url: objectPath, license_uploaded_at: new Date().toISOString() })
          .eq("id", bookingId);
      } else {
        console.error("[create] license upload failed:", uploadErr.message);
      }
    } catch (e: any) {
      console.error("[create] license handling exception:", e?.message || e);
    }
  }

  // Return fee breakdown so UI can show it immediately
  return NextResponse.json(
    {
      id: inserted.id,
      code: inserted.code,
      status: inserted.status,
      total_price: inserted.total_price,
      pickup_fee_fjd: pickupFeeFjd,
      dropoff_fee_fjd: dropoffFeeFjd,
    },
    { status: 201 }
  );
}
