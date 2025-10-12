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

  // NEW — optional helpers coming from UI:
  pickup_time?: string | null;              // "HH:mm"
  dropoff_time?: string | null;             // "HH:mm"
  start_datetime_local?: string | null;     // "YYYY-MM-DDTHH:mm" (LOCAL, no TZ suffix)
  end_datetime_local?: string | null;       // "YYYY-MM-DDTHH:mm" (LOCAL, no TZ suffix)

  /**
   * Vehicle-only subtotal coming from the client UI (without location fees).
   * If client sends grand total by mistake, we still overwrite with our final calc.
   */
  total_price?: number | null;

  // NEW — flight number from the booking form
  flight_number?: string | null;
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

function isValidYYYYMMDD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isValidHHMM(s?: string | null) {
  if (!s) return false;
  const m = /^(\d{2}):(\d{2})$/.exec(s);
  if (!m) return false;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

function compareLocalDateAndTimes(
  ymdA: string,
  hhmmA: string,
  ymdB: string,
  hhmmB: string
): number {
  // Returns -1, 0, 1 (A < B, A == B, A > B)
  const a = new Date(`${ymdA}T${hhmmA}:00`);
  const b = new Date(`${ymdB}T${hhmmB}:00`);
  const ta = a.getTime();
  const tb = b.getTime();
  return ta < tb ? -1 : ta > tb ? 1 : 0;
}

// NEW: keep flight number tidy (e.g., "FJ123", "QF-391")
function normalizeFlightNumber(s?: string | null) {
  const v = (s ?? "").toUpperCase().trim();
  // allow letters, numbers, space and dash only
  const cleaned = v.replace(/[^A-Z0-9\- ]/g, "");
  return cleaned.length ? cleaned : null;
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
    pickup_time,
    dropoff_time,
    flight_number, // NEW
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

  if (!isValidYYYYMMDD(start_date) || !isValidYYYYMMDD(end_date)) {
    return new NextResponse("Dates must be in YYYY-MM-DD format", { status: 400 });
  }

  // Times are required by the UI; validate if provided (accepting explicit "00:00" too)
  if (!isValidHHMM(pickup_time) || !isValidHHMM(dropoff_time)) {
    return new NextResponse("Pickup and drop-off times must be in HH:mm format", { status: 400 });
  }

  // If same day, enforce drop-off after pickup
  if (start_date === end_date && pickup_time && dropoff_time) {
    if (compareLocalDateAndTimes(start_date, pickup_time, end_date, dropoff_time) >= 0) {
      return new NextResponse("For the same day, drop-off time must be after pickup time", { status: 400 });
    }
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

  // Insert booking
  // - Let DB generate the code via default (booking_code_seq)
  // - Use 'pending' so exclusion constraint only applies when later marked 'confirmed'
  const insertRow: any = {
    vehicle_id,
    start_date,
    end_date,
    pickup_time: pickup_time ?? null,
    dropoff_time: dropoff_time ?? null,
    pickup_location: pickupRow.name, // normalized DB value
    dropoff_location: dropRow.name,  // normalized DB value
    customer_name,
    contact_number,
    email,
    total_price: finalTotal,         // final amount including fees
    pickup_fee_fjd: pickupFeeFjd,
    dropoff_fee_fjd: dropoffFeeFjd,
    status: "pending",
    // NEW: persist flight number
    flight_number: normalizeFlightNumber(flight_number),
  };

  const { data: inserted, error: insertError } = await supabase
    .from("bookings")
    .insert(insertRow)
    .select("id, code, status, total_price, pickup_fee_fjd, dropoff_fee_fjd")
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
      code: inserted.code,                 // from DB default
      status: inserted.status,
      total_price: inserted.total_price,   // includes fees
      pickup_fee_fjd: inserted.pickup_fee_fjd,
      dropoff_fee_fjd: inserted.dropoff_fee_fjd,
    },
    { status: 201 }
  );
}
