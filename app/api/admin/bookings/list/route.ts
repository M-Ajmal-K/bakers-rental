import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")
  }
  return { url, serviceKey }
}

function adminClient() {
  const { url, serviceKey } = getEnv()
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function GET() {
  const supabase = adminClient()

  // 1) Fetch bookings
  const { data: bookings, error: e1 } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false })

  if (e1) {
    return new NextResponse(e1.message ?? "Failed to load bookings", { status: 400 })
  }

  const rows = bookings ?? []
  const vehicleIds = Array.from(new Set(rows.map((r: any) => r.vehicle_id).filter(Boolean)))

  // 2) Fetch vehicle meta
  let vehicleMap: Record<string, { title: string; registration_number: string | null }> = {}
  if (vehicleIds.length > 0) {
    const { data: vehicles, error: e2 } = await supabase
      .from("vehicles")
      .select("id, title, registration_number")
      .in("id", vehicleIds)

    if (e2) {
      return new NextResponse(e2.message ?? "Failed to load vehicles", { status: 400 })
    }

    vehicleMap = (vehicles || []).reduce((acc: Record<string, { title: string; registration_number: string | null }>, v: any) => {
      acc[v.id] = { title: v.title || "(Untitled Vehicle)", registration_number: v.registration_number ?? null }
      return acc
    }, {})
  }

  // 3) Return combined payload
  const items = rows.map((r: any) => ({
    ...r,
    _vehicle: vehicleMap[r.vehicle_id] || { title: "(Unknown Vehicle)", registration_number: null },
  }))

  return NextResponse.json({ items })
}
