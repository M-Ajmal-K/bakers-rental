import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createHash, timingSafeEqual, randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "admin_session";
const BUCKET = "vehicle-photos";

/* ------------------------------ Env / Clients ------------------------------ */
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
const str = (v: unknown) =>
  v === undefined || v === null ? undefined : String(v).trim();
const boolUndef = (v: unknown) => {
  if (v === undefined || v === null || v === "") return undefined;
  const s = String(v).toLowerCase();
  return s === "true" || s === "1" || s === "on" || s === "yes";
};
const intOrUndef = (v: unknown) => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
};
const numOrNull = (v: unknown) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const featuresArr = (v: unknown) => {
  if (Array.isArray(v)) return v;
  if (v === undefined || v === null || v === "") return undefined;
  return String(v)
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
};
const jsonParseSafe = <T = any>(v: unknown): T | undefined => {
  if (v === undefined || v === null || v === "") return undefined;
  try {
    return JSON.parse(String(v)) as T;
  } catch {
    return undefined;
  }
};

/* --------------------------------- Upload --------------------------------- */
function sanitizeName(name: string) {
  return name.replace(/[^a-z0-9.\-_]/gi, "_");
}
function publicUrlForPath(sb: ReturnType<typeof admin>, relativeKey: string) {
  // relativeKey is like "vehicles/<uuid>_<name>.jpg"
  return sb.storage.from(BUCKET).getPublicUrl(relativeKey).data.publicUrl;
}

async function uploadNewImages(
  sb: ReturnType<typeof admin>,
  vehicleId: string,
  files: File[],
  opts: { primaryIndex?: number; sortNew?: number[] }
) {
  const results: { id: string; path: string; is_primary: boolean; sort_order: number }[] = [];

  const primaryIndex =
    typeof opts.primaryIndex === "number" &&
    opts.primaryIndex >= 0 &&
    opts.primaryIndex < files.length
      ? opts.primaryIndex
      : undefined;

  const order = Array.isArray(opts.sortNew) && opts.sortNew.length === files.length
    ? opts.sortNew
    : [...files.keys()];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    // store RELATIVE key
    const key = `${vehicleId}/${randomUUID()}_${sanitizeName(f.name || "photo.jpg")}`;

    const { error: upErr } = await sb.storage.from(BUCKET).upload(key, f, {
      cacheControl: "3600",
      upsert: false,
      contentType: f.type || undefined,
    });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    const row = {
      vehicle_id: vehicleId,
      path: key, // <-- relative key (no bucket prefix)
      is_primary: primaryIndex === i, // may be false for all (we handle primary later)
      sort_order: order[i] ?? i,
    };

    const { data, error } = await sb
      .from("images")
      .insert(row)
      .select("id, path, is_primary, sort_order")
      .single();
    if (error || !data) throw new Error(`DB insert(images) failed: ${error?.message}`);

    results.push(data);
  }

  return results;
}

async function deleteImages(
  sb: ReturnType<typeof admin>,
  ids: string[]
) {
  if (!ids?.length) return;

  // fetch paths to delete from storage
  const { data: rows, error: selErr } = await sb
    .from("images")
    .select("id, path")
    .in("id", ids);
  if (selErr) throw new Error(`Select images before delete failed: ${selErr.message}`);

  // delete db rows first (safer against unique partial idx on primary)
  const { error: delErr } = await sb.from("images").delete().in("id", ids);
  if (delErr) throw new Error(`Delete images failed: ${delErr.message}`);

  // delete storage files (best effort) — paths are already relative keys
  const keys = (rows || []).map((r) => r.path);
  if (keys.length) {
    const { error: stErr } = await sb.storage.from(BUCKET).remove(keys);
    if (stErr) {
      // don't fail hard for storage removal; log-like error
      console.error("[update vehicle] storage remove error:", stErr.message);
    }
  }
}

async function setPrimaryById(
  sb: ReturnType<typeof admin>,
  vehicleId: string,
  imageId: string
) {
  // set all to false, then target to true
  const { error: allErr } = await sb
    .from("images")
    .update({ is_primary: false })
    .eq("vehicle_id", vehicleId);
  if (allErr) throw new Error(`Clearing primaries failed: ${allErr.message}`);

  const { data: row, error: oneErr } = await sb
    .from("images")
    .update({ is_primary: true })
    .eq("id", imageId)
    .select("id, path")
    .single();
  if (oneErr || !row) throw new Error(`Setting primary failed: ${oneErr?.message || "not found"}`);

  // sync legacy columns on vehicles
  const publicUrl = publicUrlForPath(sb, row.path);
  const { error: vehErr } = await sb
    .from("vehicles")
    .update({ image_path: row.path, public_url: publicUrl })
    .eq("id", vehicleId);
  if (vehErr) throw new Error(`Updating vehicle legacy image failed: ${vehErr.message}`);
}

async function setPrimaryByPath(
  sb: ReturnType<typeof admin>,
  vehicleId: string,
  relativeKey: string
) {
  // read row by (relative) path
  const { data: row, error: selErr } = await sb
    .from("images")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .eq("path", relativeKey)
    .single();
  if (selErr || !row) throw new Error(`Primary path not found: ${selErr?.message || "missing"}`);
  await setPrimaryById(sb, vehicleId, row.id as unknown as string);
}

async function updateSortOrders(
  sb: ReturnType<typeof admin>,
  vehicleId: string,
  sortExisting: Array<{ id: string; sortOrder: number }>,
  sortNew: number[], // only used at upload time, but kept here for completeness
) {
  if (!Array.isArray(sortExisting) || sortExisting.length === 0) return;
  // batch update in chunks to avoid limits
  const chunks: Array<typeof sortExisting> = [];
  for (let i = 0; i < sortExisting.length; i += 50) {
    chunks.push(sortExisting.slice(i, i + 50));
  }
  for (const ch of chunks) {
    const ids = ch.map((x) => x.id);
    // fetch and then update one by one
    const { data: rows, error } = await sb.from("images").select("id").in("id", ids).eq("vehicle_id", vehicleId);
    if (error) throw new Error(`Fetch for sort update failed: ${error.message}`);

    const map = new Map(ch.map((x) => [x.id, x.sortOrder]));
    for (const r of rows || []) {
      const newSort = map.get(r.id as unknown as string);
      if (typeof newSort === "number") {
        const { error: upErr } = await sb.from("images").update({ sort_order: newSort }).eq("id", r.id);
        if (upErr) throw new Error(`Sort update failed: ${upErr.message}`);
      }
    }
  }
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

    /* ------------------------ MULTIPART: rich update ----------------------- */
    if (isMultipart(req)) {
      const form = await req.formData();

      const id = str(form.get("id"));
      if (!id) {
        return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
      }

      // Build vehicle update (only provided fields)
      const update: Record<string, any> = {};

      const registration_number = str(form.get("registration_number"));
      if (registration_number !== undefined) update.registration_number = registration_number;

      const title = str(form.get("title"));
      if (title !== undefined) update.title = title;

      const brand = str(form.get("brand"));
      if (brand !== undefined) update.brand = brand;

      const model = str(form.get("model"));
      if (model !== undefined) update.model = model;

      const category = str(form.get("category"));
      if (category !== undefined) update.category = category;

      const transmission = str(form.get("transmission"));
      if (transmission !== undefined) update.transmission = transmission;

      const fuel = str(form.get("fuel"));
      if (fuel !== undefined) update.fuel = fuel;

      const year = intOrUndef(form.get("year"));
      if (year !== undefined) update.year = year;

      const rental_price = numOrNull(form.get("rental_price"));
      if (rental_price !== null && rental_price !== undefined) update.rental_price = rental_price;

      const rental_price_5plus = numOrNull(form.get("rental_price_5plus"));
      if (rental_price_5plus !== undefined) update.rental_price_5plus = rental_price_5plus;

      const rental_price_8plus = numOrNull(form.get("rental_price_8plus"));
      if (rental_price_8plus !== undefined) update.rental_price_8plus = rental_price_8plus;

      const available = boolUndef(form.get("available"));
      if (available !== undefined) update.available = available;

      const passengers = intOrUndef(form.get("passengers"));
      if (passengers !== undefined) update.passengers = passengers;

      const features = featuresArr(form.get("features"));
      if (features !== undefined) update.features = features;

      // legacy image fields (optional)
      if (form.has("image_path")) update.image_path = str(form.get("image_path")) ?? null;
      if (form.has("public_url")) update.public_url = str(form.get("public_url")) ?? null;

      if (Object.keys(update).length > 0) {
        const { error: vehErr } = await sb.from("vehicles").update(update).eq("id", id);
        if (vehErr) {
          return NextResponse.json({ ok: false, error: vehErr.message }, { status: 400 });
        }
      }

      // --- Images operations ---
      const files = form.getAll("images").filter((f): f is File => f instanceof File);
      const primaryId = str(form.get("primaryId"));
      const primaryIndexRaw = form.get("primaryIndex");
      const primaryIndex =
        primaryIndexRaw !== null && primaryIndexRaw !== undefined
          ? Number(primaryIndexRaw)
          : undefined;

      const deleteIds = jsonParseSafe<string[]>(form.get("deleteIds"));
      const sortExisting = jsonParseSafe<Array<{ id: string; sortOrder: number }>>(form.get("sortExisting"));
      const sortNew = jsonParseSafe<number[]>(form.get("sortNew"));

      // 1) Delete requested
      if (Array.isArray(deleteIds) && deleteIds.length) {
        await deleteImages(sb, deleteIds);
      }

      // 2) Upload new files
      let newRows: { id: string; path: string; is_primary: boolean; sort_order: number }[] = [];
      if (files.length > 0) {
        newRows = await uploadNewImages(sb, id, files, {
          primaryIndex: typeof primaryIndex === "number" ? primaryIndex : undefined,
          sortNew: Array.isArray(sortNew) ? sortNew : undefined as any,
        });
      }

      // 3) Update sort order for existing images (optional)
      if (Array.isArray(sortExisting) && sortExisting.length > 0) {
        await updateSortOrders(sb, id, sortExisting, sortNew || []);
      }

      // 4) Handle primary selection
      if (primaryId) {
        await setPrimaryById(sb, id, primaryId);
      } else if (typeof primaryIndex === "number" && newRows[primaryIndex]) {
        await setPrimaryByPath(sb, id, newRows[primaryIndex].path);
      } else {
        // ensure there is at least one primary
        const { data: primChk, error: primErr } = await sb
          .from("images")
          .select("id, path, is_primary")
          .eq("vehicle_id", id)
          .order("is_primary", { ascending: false })
          .order("sort_order", { ascending: true })
          .limit(1);
        if (primErr) {
          return NextResponse.json({ ok: false, error: primErr.message }, { status: 400 });
        }
        const first = primChk?.[0];
        if (first && !first.is_primary) {
          await setPrimaryById(sb, id, first.id as unknown as string);
        }
      }

      // Return updated vehicle (without heavy join)
      const { data: veh } = await sb.from("vehicles").select().eq("id", id).single();
      return NextResponse.json({ ok: true, vehicle: veh });
    }

    /* --------------------------- JSON: legacy update ------------------------ */
    const body = await req.json();
    const id = body.id;
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    const update: Record<string, any> = {};

    const registration_number = str(body.registration_number);
    if (registration_number !== undefined) update.registration_number = registration_number;

    const title = str(body.title);
    if (title !== undefined) update.title = title;

    const brand = str(body.brand);
    if (brand !== undefined) update.brand = brand;

    const model = str(body.model);
    if (model !== undefined) update.model = model;

    const category = str(body.category);
    if (category !== undefined) update.category = category;

    const transmission = str(body.transmission);
    if (transmission !== undefined) update.transmission = transmission;

    const fuel = str(body.fuel);
    if (fuel !== undefined) update.fuel = fuel;

    const year = intOrUndef(body.year);
    if (year !== undefined) update.year = year;

    const rental_price = numOrNull(body.rental_price);
    if (rental_price !== null && rental_price !== undefined) update.rental_price = rental_price;

    const rental_price_5plus = numOrNull(body.rental_price_5plus);
    if (rental_price_5plus !== undefined) update.rental_price_5plus = rental_price_5plus;

    const rental_price_8plus = numOrNull(body.rental_price_8plus);
    if (rental_price_8plus !== undefined) update.rental_price_8plus = rental_price_8plus;

    const available = body.available;
    if (available !== undefined) update.available = Boolean(available);

    const passengers = intOrUndef(body.passengers);
    if (passengers !== undefined) update.passengers = passengers;

    const features = featuresArr(body.features);
    if (features !== undefined) update.features = features;

    if (body.image_path !== undefined) update.image_path = body.image_path ?? null;
    if (body.public_url !== undefined) update.public_url = body.public_url ?? null;

    const sb2 = admin();
    const { data, error } = await sb2.from("vehicles").update(update).eq("id", id).select().single();
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, vehicle: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
