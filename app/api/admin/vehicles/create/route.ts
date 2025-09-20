import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createHash, timingSafeEqual, randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
const isMultipart = (req: Request) =>
  (req.headers.get("content-type") || "").toLowerCase().includes("multipart/form-data");

/* ----------------------------- Coercion helpers ---------------------------- */
const str = (v: unknown) => (v === undefined || v === null ? "" : String(v)).trim();
const bool = (v: unknown) => {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").toLowerCase();
  return s === "true" || s === "1" || s === "on" || s === "yes";
};
const numOrNull = (v: unknown) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const intOrZero = (v: unknown) => {
  const n = Number.parseInt(String(v ?? "0"), 10);
  return Number.isFinite(n) ? n : 0;
};

/* --------------------------------- Upload --------------------------------- */
function sanitizeName(name: string) {
  return name.replace(/[^a-z0-9.\-_]/gi, "_");
}

type Uploaded = {
  path: string;        // relative storage key, e.g. "vehicles/abc.jpg"
  publicUrl: string;   // resolved public URL
  is_primary: boolean;
  sort_order: number;
};

/** Upload files (store **relative** keys), return keys + public URLs + flags */
async function uploadFilesFirst(
  sb: ReturnType<typeof admin>,
  files: File[],
  primaryIndex?: number,
  sortOrderIndices?: number[] | null
): Promise<Uploaded[]> {
  const list: Uploaded[] = [];

  const safePrimaryIndex =
    typeof primaryIndex === "number" && primaryIndex >= 0 && primaryIndex < files.length
      ? primaryIndex
      : 0;

  const order =
    sortOrderIndices && sortOrderIndices.length === files.length
      ? sortOrderIndices
      : [...files.keys()];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const ext = (f.name?.split(".").pop() || "jpg").toLowerCase();
    const key = `vehicles/${randomUUID()}_${sanitizeName(f.name || `photo.${ext}`)}`; // relative key

    const { error: upErr } = await sb.storage.from(BUCKET).upload(key, f, {
      cacheControl: "3600",
      upsert: false,
      contentType: f.type || undefined,
    });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    const { data } = sb.storage.from(BUCKET).getPublicUrl(key);
    list.push({
      path: key, // <-- relative
      publicUrl: data.publicUrl,
      is_primary: i === safePrimaryIndex,
      sort_order: order[i] ?? i,
    });
  }
  return list;
}

/* --------------------------------- Handler -------------------------------- */
export async function POST(req: Request) {
  try {
    const { token } = envs();
    const jar = await cookies();
    const val = jar.get(COOKIE_NAME)?.value || "";
    if (!safeEquals(val, token)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const sb = admin();

    /* ========================= MULTIPART BRANCH ========================= */
    // Disabled to avoid 413 Payload Too Large on serverless.
    if (isMultipart(req)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Multipart uploads are disabled. Upload images to Supabase Storage first, then POST JSON with image paths.",
        },
        { status: 400 }
      );
    }

    /* =========================== JSON BRANCH ============================ */
    const body = await req.json();

    // Required
    const registration_number = str(body.registration_number);
    const title = str(body.title);
    const brand = str(body.brand);
    const model = str(body.model);
    const year = intOrZero(body.year);
    const rental_price = numOrNull(body.rental_price);

    if (!registration_number || !title || !brand || !model || rental_price == null) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Images array from client (already uploaded via Storage)
    const images = Array.isArray(body.images) ? body.images : [];
    // Each item: { path: string (relative), is_primary?: boolean, sort_order?: number }
    let primaryPath: string | null = null;
    if (images.length > 0) {
      const chosen = images.find((i: any) => i?.is_primary) ?? images[0];
      primaryPath = String(chosen.path || "");
    }

    if (!primaryPath) {
      return NextResponse.json(
        { ok: false, error: "At least one image is required." },
        { status: 400 }
      );
    }

    // Compute public URL for primary (server-side)
    const { data: pub } = admin().storage.from(BUCKET).getPublicUrl(primaryPath);

    const payload = {
      registration_number,
      title,
      brand,
      model,
      year,
      rental_price,
      rental_price_5plus: numOrNull(body.rental_price_5plus),
      rental_price_8plus: numOrNull(body.rental_price_8plus),

      // legacy single-image fields (required by NOT NULL)
      image_path: primaryPath,             // relative key
      public_url: pub.publicUrl || body.public_url || null,

      available: Boolean(body.available),

      // Optional meta
      category: str(body.category),
      passengers: intOrZero(body.passengers),
      transmission: str(body.transmission),
      fuel: str(body.fuel),
      features: Array.isArray(body.features)
        ? body.features
        : body.features
        ? String(body.features).split(",").map((f: string) => f.trim()).filter(Boolean)
        : [],
    };

    const sb2 = admin();
    const { data: veh, error: vehErr } = await sb2.from("vehicles").insert(payload).select().single();
    if (vehErr || !veh) {
      return NextResponse.json({ ok: false, error: vehErr?.message || "Failed to create vehicle" }, { status: 400 });
    }

    // Insert images rows if provided
    if (images.length > 0) {
      // normalize and ensure a single primary
      let sawPrimary = false;
      const rows = images.map((i: any, idx: number) => {
        const path = String(i.path || ""); // relative
        const wantPrimary = Boolean(i.is_primary);
        const is_primary = wantPrimary && !sawPrimary;
        if (is_primary) sawPrimary = true;
        return {
          vehicle_id: String(veh.id),
          path,
          is_primary,
          sort_order: Number.isFinite(Number(i.sort_order)) ? Number(i.sort_order) : idx,
        };
      });
      if (!sawPrimary) rows[0].is_primary = true;

      const { error: insErr } = await sb2.from("images").insert(rows);
      if (insErr) {
        return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true, vehicle: veh });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
