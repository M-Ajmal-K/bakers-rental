import { supabase } from "../supabaseClient";

export async function getVehicles() {
  const { data, error } = await supabase.from("vehicles").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addVehicle(vehicle: {
  brand: string;
  model: string;
  year: number;
  registration_number: string;
  seats: number;
  price_per_day: number;
  image_url: string;
}) {
  const { data, error } = await supabase.from("vehicles").insert(vehicle).select();
  if (error) throw error;
  return data;
}
