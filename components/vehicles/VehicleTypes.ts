export type VehicleId = string | number;

export interface Vehicle {
  id: VehicleId;
  name: string; // DB: title
  brand: string;
  model: string;
  year: number;

  // Base daily price
  pricePerDay: number; // DB: rental_price

  // Optional tiered daily prices
  pricePerDay5Plus?: number | null; // DB: rental_price_5plus (applies from day 5 to 7)
  pricePerDay8Plus?: number | null; // DB: rental_price_8plus (applies from day 8+)

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

  // Base daily price input
  pricePerDay: string;

  // Optional tiered daily price inputs
  pricePerDay5Plus?: string; // DB: rental_price_5plus
  pricePerDay8Plus?: string; // DB: rental_price_8plus

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
