export type VehicleId = string | number;

/** One image record tied to a vehicle (from public.images + storage path) */
export interface VehicleImage {
  id: string;            // images.id (uuid)
  path: string;          // storage path: vehicle-photos/<vehicle_id>/<uuid>.jpg
  url: string;           // public URL resolved from `path`
  isPrimary: boolean;    // exactly one per vehicle (enforced by unique index)
  sortOrder: number;     // manual ordering for gallery
  createdAt?: string;    // optional display
}

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

  /** 🔽 Legacy single image fields (kept for backward compatibility) */
  image: string | null;         // public URL (legacy primary image)
  imagePath?: string | null;    // storage path (legacy)

  /** 🔽 New multi-image gallery */
  images?: VehicleImage[];      // full gallery
  primaryImageUrl?: string;     // convenience: first primary image URL (fallback to `image`)
  
  // UI-only fields
  category: string;
  passengers: number;
  transmission: string;
  fuel: string;
  features: string[];
}

/** Admin form state */
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

  /** 🔽 New (optional) fields for multi-image editing UI.
   * We’ll wire these in the form step so they’re safe to add now.
   */
  primaryImageId?: string;           // which gallery image is primary
  // We’ll represent images in the form as a light structure so we can handle
  // new uploads + existing ones together without breaking types elsewhere.
  images?: Array<{
    id?: string;                     // existing DB id
    file?: File;                     // new upload
    path?: string;                   // storage path for existing
    url?: string;                    // resolved public URL for existing
    isPrimary?: boolean;
    sortOrder?: number;
    toDelete?: boolean;              // mark existing for deletion
  }>;
};

// UI dropdowns
export const categories = ["SUV", "Van", "Compact", "Pickup", "Luxury"];
export const transmissionTypes = ["Automatic", "Manual"];
export const fuelTypes = ["Petrol", "Diesel", "Hybrid", "Electric"];
