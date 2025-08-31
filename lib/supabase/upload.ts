import { supabase } from "../supabaseClient";

const STORAGE_BUCKET = "vehicle-photos";

/**
 * Upload a file to Supabase storage and return { path, publicUrl }.
 * Optimized: publicUrl can be saved directly in DB to avoid repeated calls.
 */
export async function uploadVehicleImage(file: File) {
  if (!supabase) throw new Error("Supabase client is not configured");

  // Unique filename to avoid collisions
  const fileName = `${Date.now()}-${crypto.randomUUID()}-${file.name}`;
  const filePath = `uploads/${fileName}`;

  // Upload to bucket
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false, // don’t overwrite if exists
    });

  if (error) throw error;

  // ✅ Resolve public URL immediately
  const { data: publicData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  if (!publicData?.publicUrl) {
    throw new Error("Failed to generate public URL");
  }

  return {
    path: filePath,       // storage path (DB: image_path)
    publicUrl: publicData.publicUrl, // store this in DB too (DB: public_url)
  };
}
