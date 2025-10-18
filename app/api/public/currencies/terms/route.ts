import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Server-side Supabase client (read-only via RLS policy)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const revalidate = 300; // ISR: cache JSON for 5 minutes

export async function GET() {
  // fetch the most recent published terms row
  const { data, error } = await supabase
    .from("terms")
    .select("title, content_md, version, updated_at")
    .eq("is_published", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[terms api] select error:", error);
    return NextResponse.json({ error: "Failed to load terms." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "No published terms found." },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      title: data.title,
      content_md: data.content_md,
      version: data.version,
      updated_at: data.updated_at,
    },
    {
      headers: {
        // Helpful cache headers for CDNs/browsers
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
