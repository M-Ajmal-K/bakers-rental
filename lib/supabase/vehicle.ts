import { supabase, STORAGE_BUCKET } from "../supabaseClient";

/**
 * Fetch vehicles ordered by created_at (latest first).
 * Supports pagination (default: 20).
 * Uses stored public_url for fast fetch (no extra storage calls).
 */
export async function getVehicles(limit: number = 20, offset: number = 0) {
  const { data, error } = await supabase
    .from("vehicles")
    .select(
      `id, registration_number, title, brand, model, year, rental_price,
       image_path, public_url, available, created_at,
       category, passengers, transmission, fuel, features`
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return (data || []).map((v: any) => {
    return {
      ...v,
      image_url: v.public_url ?? null, // ✅ now always prefer DB column
    };
  });
}

/**
 * Add a new vehicle to the database.
 * Store both image_path + public_url if available.
 */
export async function addVehicle(vehicle: {
  brand: string;
  model: string;
  year: number;
  registration_number: string;
  passengers: number;
  rental_price: number;
  image_path: string | null;
  public_url: string | null; // ✅ required so UI can use instantly
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
