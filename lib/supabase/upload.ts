import { supabase } from "../supabaseClient";

const STORAGE_BUCKET = "vehicle-photos";

/**
 * Upload a file to Supabase storage and return { path, publicUrl }
 */
export async function uploadVehicleImage(file: File) {
  if (!supabase) throw new Error("Supabase client is not configured");

  // Use timestamped unique file name
  const fileName = `${Date.now()}-${crypto.randomUUID()}-${file.name}`;
  const filePath = `uploads/${fileName}`;

  // Upload to bucket
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false, // don't overwrite if file already exists
    });

  if (error) throw error;

  // Resolve public URL immediately (helpful for preview/UI)
  const { data: publicData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return {
    path: filePath, // store this in DB
    publicUrl: publicData.publicUrl, // UI can show image instantly
  };
}
