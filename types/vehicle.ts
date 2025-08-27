export type VehicleId = string | number

export interface Vehicle {
  // DB-backed
  id: VehicleId
  name: string // DB: title
  brand: string
  model: string
  year: number
  pricePerDay: number // DB: rental_price
  licensePlate: string // DB: registration_number
  available: boolean
  image: string | null // public URL
  imagePath?: string | null // storage path

  // UI-only (not stored in DB)
  category: string
  passengers: number
  transmission: string
  fuel: string
  features: string[]
}

export type FormState = {
  // DB-backed
  name: string
  brand: string
  model: string
  year: string
  pricePerDay: string
  licensePlate: string
  available: boolean

  // UI-only
  category: string
  passengers: string
  transmission: string
  fuel: string
  features: string
}
