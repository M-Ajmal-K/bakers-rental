import { supabase, STORAGE_BUCKET } from "../supabaseClient";

/**
 * Fetch all vehicles ordered by created_at (latest first).
 * Always resolve `image_path` into a public URL for rendering.
 */
export async function getVehicles() {
  const { data, error } = await supabase
    .from("vehicles")
    .select(
      `id, registration_number, title, brand, model, year, rental_price, image_path, available, created_at,
       category, passengers, transmission, fuel, features`
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((v: any) => {
    let publicUrl: string | null = null;
    if (v.image_path) {
      const { data: pub } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(v.image_path);
      publicUrl = pub?.publicUrl ?? null;
    }

    return {
      ...v,
      image_url: publicUrl, // ✅ resolved public URL for UI
    };
  });
}

/**
 * Add a new vehicle to the database.
 * Save storage path in DB (image_path).
 */
export async function addVehicle(vehicle: {
  brand: string;
  model: string;
  year: number;
  registration_number: string;
  passengers: number;
  rental_price: number;
  image_path: string | null;
  available: boolean;
  category: string;
  transmission: string;
  fuel: string;
  features?: string[];
}) {
  const payload = {
    ...vehicle,
    title: `${vehicle.brand} ${vehicle.model}`, // default title
  };

  const { data, error } = await supabase
    .from("vehicles")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a vehicle by ID.
 * Also remove its image from Supabase storage if `image_path` exists.
 */
export async function deleteVehicle(
  id: string | number,
  imagePath?: string | null
) {
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw error;

  if (imagePath) {
    await supabase.storage.from(STORAGE_BUCKET).remove([imagePath]);
  }
}
