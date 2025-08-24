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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
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
  console.warn(
    "[Vehicles] Supabase client is NOT configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  )
}

/* ------------------------ UI constants ------------------------ */
const categories = ["SUV", "Van", "Compact", "Pickup", "Luxury"]
const transmissionTypes = ["Automatic", "Manual"]
const fuelTypes = ["Petrol", "Diesel", "Hybrid", "Electric"]

/* ------------------------ Types ------------------------ */
type VehicleId = string | number

interface Vehicle {
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
      {/* ... form unchanged ... */}
      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="licensePlate" className="text-white text-sm sm:text-base">
          License Plate
        </Label>
        <Input
          id="licensePlate"
          placeholder="FJ-1234"
          value={formData.licensePlate}
          onChange={(e) => setFormData((s) => ({ ...s, licensePlate: e.target.value }))}
          required
          className="text-white placeholder:text-white/60 h-10 sm:h-11"
        />
      </div>
      {/* ... rest of form unchanged ... */}
    </form>
  )
})

/* ------------------------ Page content ------------------------ */
function VehicleManagementContent() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)

  const [formData, setFormData] = useState<FormState>({
    name: "", brand: "", model: "", year: "", pricePerDay: "",
    licensePlate: "", available: true,
    category: "", passengers: "", transmission: "", fuel: "", features: "",
  })

  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      if (!supabase) return
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, registration_number, title, brand, model, year, rental_price, image_path, available, created_at")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[Vehicles] Supabase select error:", error)
        return
      }

      const mapped: Vehicle[] = (data || []).map((v: any) => {
        let publicUrl: string | null = null
        if (v.image_path) {
          const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(v.image_path)
          publicUrl = pub?.publicUrl ?? null
        }
        return {
          id: v.id,
          name: v.title,
          brand: v.brand ?? "",
          model: v.model ?? "",
          year: Number(v.year ?? 0),
          pricePerDay: Number(v.rental_price ?? 0),
          licensePlate: v.registration_number ?? "",
          available: Boolean(v.available),
          image: publicUrl,
          imagePath: v.image_path ?? null,
          category: "",
          passengers: 5,
          transmission: "Automatic",
          fuel: "Petrol",
          features: [],
        }
      })
      setVehicles(mapped)
    }
    load()
  }, [])

  const resetForm = useCallback(() => {
    setFormData({
      name: "", brand: "", model: "", year: "", pricePerDay: "",
      licensePlate: "", available: true,
      category: "", passengers: "", transmission: "", fuel: "", features: "",
    })
    setPickedFile(null)
  }, [])

  const uploadImage = useCallback(async (file: File) => {
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/storage/upload", { method: "POST", body: fd })
    if (!res.ok) throw new Error("Upload failed")
    const data = await res.json()
    return { publicUrl: data.publicUrl as string, path: data.path as string }
  }, [])

  /* ------------------------ Add ------------------------ */
  const handleAddVehicle = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return alert("Supabase is not configured.")

    const normalizedPlate = formData.licensePlate.trim().toUpperCase()

    // ✅ check duplicates
    const { data: existing } = await supabase
      .from("vehicles")
      .select("id")
      .eq("registration_number", normalizedPlate)
      .maybeSingle()

    if (existing) {
      alert(`A vehicle with license plate ${normalizedPlate} already exists.`)
      return
    }

    let image_path: string | null = null
    let publicUrl: string | null = null
    if (pickedFile) {
      try {
        const up = await uploadImage(pickedFile)
        image_path = up.path
        publicUrl = up.publicUrl
      } catch (err: any) {
        alert(err?.message || "Image upload failed.")
        return
      }
    }

    const payload = {
      registration_number: normalizedPlate,
      title: formData.name,
      brand: formData.brand,
      model: formData.model,
      year: Number(formData.year),
      rental_price: Number(formData.pricePerDay),
      image_path,
      available: formData.available,
    }

    const { data, error } = await supabase.from("vehicles").insert(payload).select().single()
    if (error) {
      console.error(error)
      alert("Failed to add vehicle. Please try again.")
      return
    }

    setVehicles((prev) => [
      {
        id: data.id,
        name: data.title,
        brand: data.brand,
        model: data.model,
        year: data.year,
        pricePerDay: data.rental_price,
        licensePlate: data.registration_number,
        available: data.available,
        image: publicUrl,
        imagePath: data.image_path,
        category: formData.category,
        passengers: Number(formData.passengers || 5),
        transmission: formData.transmission,
        fuel: formData.fuel,
        features: formData.features.split(",").map(f => f.trim()).filter(Boolean)
      },
      ...prev,
    ])
    setIsAddDialogOpen(false)
    resetForm()
  }, [formData, pickedFile, uploadImage, resetForm])

  /* ------------------------ Edit ------------------------ */
  const handleEditVehicle = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingVehicle || !supabase) return

    const normalizedPlate = formData.licensePlate.trim().toUpperCase()

    // ✅ check duplicates excluding self
    const { data: existing } = await supabase
      .from("vehicles")
      .select("id")
      .eq("registration_number", normalizedPlate)
      .neq("id", editingVehicle.id)
      .maybeSingle()

    if (existing) {
      alert(`Another vehicle already has the license plate ${normalizedPlate}.`)
      return
    }

    let newPublicUrl: string | null = editingVehicle.image
    let newImagePath: string | null = null
    if (pickedFile) {
      try {
        const up = await uploadImage(pickedFile)
        newPublicUrl = up.publicUrl
        newImagePath = up.path
      } catch (err: any) {
        alert(err?.message || "Image upload failed. Keeping previous image.")
      }
    }

    const payload: any = {
      registration_number: normalizedPlate,
      title: formData.name,
      brand: formData.brand,
      model: formData.model,
      year: Number(formData.year),
      rental_price: Number(formData.pricePerDay),
      available: formData.available,
    }
    if (newImagePath) payload.image_path = newImagePath

    const { error } = await supabase.from("vehicles").update(payload).eq("id", editingVehicle.id)
    if (error) {
      console.error(error)
      alert("Failed to update vehicle. Please try again.")
      return
    }

    setVehicles((prev) =>
      prev.map((v) =>
        v.id === editingVehicle.id
          ? { ...v, name: formData.name, brand: formData.brand, model: formData.model,
              year: Number(formData.year), pricePerDay: Number(formData.pricePerDay),
              licensePlate: normalizedPlate, available: formData.available,
              image: newPublicUrl, imagePath: newImagePath ?? v.imagePath,
              category: formData.category, passengers: Number(formData.passengers || v.passengers),
              transmission: formData.transmission, fuel: formData.fuel,
              features: formData.features.split(",").map(f => f.trim()).filter(Boolean) }
          : v
      )
    )
    setIsEditDialogOpen(false)
    setEditingVehicle(null)
    resetForm()
  }, [editingVehicle, formData, pickedFile, uploadImage, resetForm])

  /* ------------------------ Delete + UI remain unchanged ------------------------ */
  // ... your delete handler and JSX remain exactly the same ...
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-accent via-primary/20 to-secondary/20">
      {/* ✅ All your UI code stays unchanged */}
      {/* nav, table, dialogs etc. */}
    </div>
  )
}

export default function VehicleManagementPage() {
  return (
    <AdminAuthGuard>
      <VehicleManagementContent />
    </AdminAuthGuard>
  )
}
