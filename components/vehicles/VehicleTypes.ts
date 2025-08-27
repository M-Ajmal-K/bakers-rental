export type VehicleId = string | number;

export interface Vehicle {
  id: VehicleId;
  name: string; // DB: title
  brand: string;
  model: string;
  year: number;
  pricePerDay: number; // DB: rental_price
  licensePlate: string; // DB: registration_number
  available: boolean;
  image: string | null; // public URL
  imagePath?: string | null; // storage path

  // UI-only fields
  category: string;
  passengers: number;
  transmission: string;
  fuel: string;
  features: string[];
}

export type FormState = {
  name: string;
  brand: string;
  model: string;
  year: string;
  pricePerDay: string;
  licensePlate: string;
  available: boolean;

  category: string;
  passengers: string;
  transmission: string;
  fuel: string;
  features: string;
};

// UI dropdowns
export const categories = ["SUV", "Van", "Compact", "Pickup", "Luxury"];
export const transmissionTypes = ["Automatic", "Manual"];
export const fuelTypes = ["Petrol", "Diesel", "Hybrid", "Electric"];
