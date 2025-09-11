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

export async function POST(req: Request) {
  const supabase = adminClient();

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
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

  // generate a mostly-unique booking code (you can replace this with a DB sequence later)
  const code = `BR-${Date.now().toString().slice(-6)}`;

  // Some schemas expect uppercase status; PENDING is safe
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

  // Insert and return id + code + status for the UI
  const { data, error } = await supabase
    .from("bookings")
    .insert(insertRow)
    .select("id, code, status")
    .single();

  if (error) {
    // surface DB constraints (e.g., overlap checks)
    return new NextResponse(error.message ?? "Insert failed", { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
