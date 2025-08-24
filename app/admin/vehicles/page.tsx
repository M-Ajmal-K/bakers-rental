"use client"

import type React from "react"
import { useState, useEffect, useCallback, memo, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminAuthGuard } from "@/components/admin-auth-guard"
import { Car, Plus, Edit, Trash2, Upload, LogOut, AlertTriangle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

/* ------------------------ Supabase ------------------------ */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = SUPABASE_URL && SUPABASE_ANON ? createClient(SUPABASE_URL, SUPABASE_ANON) : null
const STORAGE_BUCKET = "vehicle-photos"

if (!supabase) {
  console.warn("[Vehicles] Supabase client is NOT configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.")
}

/* ------------------------ UI constants ------------------------ */
const categories = ["SUV", "Van", "Compact", "Pickup", "Luxury"]
const transmissionTypes = ["Automatic", "Manual"]
const fuelTypes = ["Petrol", "Diesel", "Hybrid", "Electric"]

/* ------------------------ Types ------------------------ */
type VehicleId = string | number

interface Vehicle {
  // DB-backed
  id: VehicleId
  name: string
  brand: string
  model: string
  year: number
  pricePerDay: number
  licensePlate: string
  available: boolean
  image: string | null
  imagePath?: string | null

  // UI-only
  category: string
  passengers: number
  transmission: string
  fuel: string
  features: string[]
}

type FormState = {
  name: string
  brand: string
  model: string
  year: string
  pricePerDay: string
  licensePlate: string
  available: boolean
  category: string
  passengers: string
  transmission: string
  fuel: string
  features: string
}

/* ------------------------ Form ------------------------ */
const VehicleForm = memo(function VehicleForm({
  formData,
  setFormData,
  onSubmit,
  isEdit = false,
  onFilePicked,
}: {
  formData: FormState
  setFormData: React.Dispatch<React.SetStateAction<FormState>>
  onSubmit: (e: React.FormEvent) => void
  isEdit?: boolean
  onFilePicked: (file: File | null) => void
}) {
  const uploadRef = useRef<HTMLInputElement>(null)

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <Label htmlFor="name" className="text-white">Vehicle Name</Label>
          <Input id="name" value={formData.name} onChange={(e) => setFormData(s => ({ ...s, name: e.target.value }))} required />
        </div>
        <div>
          <Label htmlFor="category" className="text-white">Category</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData(s => ({ ...s, category: value }))}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <Label htmlFor="brand" className="text-white">Brand</Label>
          <Input id="brand" value={formData.brand} onChange={(e) => setFormData(s => ({ ...s, brand: e.target.value }))} required />
        </div>
        <div>
          <Label htmlFor="model" className="text-white">Model</Label>
          <Input id="model" value={formData.model} onChange={(e) => setFormData(s => ({ ...s, model: e.target.value }))} required />
        </div>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div>
          <Label htmlFor="pricePerDay" className="text-white">Price per Day ($)</Label>
          <Input id="pricePerDay" type="number" value={formData.pricePerDay} onChange={(e) => setFormData(s => ({ ...s, pricePerDay: e.target.value }))} required />
        </div>
        <div>
          <Label htmlFor="passengers" className="text-white">Passengers</Label>
          <Input id="passengers" type="number" value={formData.passengers} onChange={(e) => setFormData(s => ({ ...s, passengers: e.target.value }))} required />
        </div>
        <div>
          <Label htmlFor="year" className="text-white">Year</Label>
          <Input id="year" type="number" value={formData.year} onChange={(e) => setFormData(s => ({ ...s, year: e.target.value }))} required />
        </div>
      </div>

      {/* Row 4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <Label htmlFor="transmission" className="text-white">Transmission</Label>
          <Select value={formData.transmission} onValueChange={(value) => setFormData(s => ({ ...s, transmission: value }))}>
            <SelectTrigger><SelectValue placeholder="Select transmission" /></SelectTrigger>
            <SelectContent>
              {transmissionTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="fuel" className="text-white">Fuel</Label>
          <Select value={formData.fuel} onValueChange={(value) => setFormData(s => ({ ...s, fuel: value }))}>
            <SelectTrigger><SelectValue placeholder="Select fuel type" /></SelectTrigger>
            <SelectContent>
              {fuelTypes.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* License Plate */}
      <div>
        <Label htmlFor="licensePlate" className="text-white">License Plate</Label>
        <Input id="licensePlate" value={formData.licensePlate} onChange={(e) => setFormData(s => ({ ...s, licensePlate: e.target.value }))} required />
      </div>

      {/* Image upload */}
      <div>
        <Label className="text-white">Vehicle Image</Label>
        <div className="flex gap-2">
          <input ref={uploadRef} type="file" accept="image/*" className="hidden" id="image-upload-input" onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)} />
          <Button type="button" variant="outline" size="sm" onClick={() => uploadRef.current?.click()}>
            <Upload className="h-4 w-4" />
          </Button>
          <span className="text-white/70 text-sm self-center">PNG/JPG/WEBP up to 10MB</span>
        </div>
      </div>

      {/* Features */}
      <div>
        <Label htmlFor="features" className="text-white">Features (comma-separated)</Label>
        <Input id="features" value={formData.features} onChange={(e) => setFormData(s => ({ ...s, features: e.target.value }))} />
      </div>

      {/* Availability */}
      <div className="flex items-center space-x-2">
        <input type="checkbox" id="available" checked={formData.available} onChange={(e) => setFormData(s => ({ ...s, available: e.target.checked }))} />
        <Label htmlFor="available" className="text-white">Available for booking</Label>
      </div>

      <div className="flex gap-2 pt-2 sm:pt-4">
        <Button type="submit">{isEdit ? "Update Vehicle" : "Add Vehicle"}</Button>
      </div>
    </form>
  )
})
