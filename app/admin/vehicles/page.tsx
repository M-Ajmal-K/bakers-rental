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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminAuthGuard } from "@/components/admin-auth-guard"
import { Car, Plus, Edit, Trash2, Upload, LogOut } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

// ---- Supabase client from env (falls back to mock if not present) ----
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = SUPABASE_URL && SUPABASE_ANON ? createClient(SUPABASE_URL, SUPABASE_ANON) : null
const STORAGE_BUCKET = "vehicle-images"

// ---- Mock vehicle data (fallback only) ----
const initialVehicles = [
  {
    id: 1,
    name: "Toyota RAV4",
    brand: "Toyota",
    model: "RAV4",
    image: "/placeholder-7vroz.png",
    pricePerDay: 85,
    passengers: 5,
    transmission: "Automatic",
    fuel: "Petrol",
    available: true,
    description: "Reliable SUV perfect for family adventures",
    features: ["Air Conditioning", "GPS", "Bluetooth"],
    year: 2022,
    licensePlate: "FJ-1234",
  },
  {
    id: 2,
    name: "Honda Odyssey",
    brand: "Honda",
    model: "Odyssey",
    image: "/placeholder-xywqi.png",
    pricePerDay: 120,
    passengers: 8,
    transmission: "Automatic",
    fuel: "Petrol",
    available: false,
    description: "Spacious van ideal for large groups",
    features: ["Air Conditioning", "GPS", "USB Charging", "Extra Storage"],
    year: 2021,
    licensePlate: "FJ-5678",
  },
  {
    id: 3,
    name: "Nissan X-Trail",
    brand: "Nissan",
    model: "X-Trail",
    image: "/nissan-x-trail-adventure.png",
    pricePerDay: 90,
    passengers: 7,
    transmission: "Automatic",
    fuel: "Petrol",
    available: true,
    description: "Adventure-ready SUV with 4WD capability",
    features: ["4WD", "Air Conditioning", "GPS", "Roof Rails"],
    year: 2023,
    licensePlate: "FJ-9012",
  },
  {
    id: 4,
    name: "Toyota Hiace",
    brand: "Toyota",
    model: "Hiace",
    image: "/toyota-hiace-van.png",
    pricePerDay: 110,
    passengers: 12,
    transmission: "Manual",
    fuel: "Diesel",
    available: true,
    description: "Large capacity van for group transportation",
    features: ["Air Conditioning", "Large Cargo Space", "Sliding Doors"],
    year: 2020,
    licensePlate: "FJ-3456",
  },
]

// Options kept for UI (not stored in DB)
const transmissionTypes = ["Automatic", "Manual"]
const fuelTypes = ["Petrol", "Diesel", "Hybrid", "Electric"]

type VehicleId = string | number

interface Vehicle {
  id: VehicleId
  name: string           // DB: title
  brand: string          // DB
  model: string          // DB
  category?: string      // derived display
  image: string | null   // public URL from storage path
  pricePerDay: number    // DB: rental_price
  passengers: number     // UI-only
  transmission: string   // UI-only
  fuel: string           // UI-only
  available: boolean     // DB
  description: string    // UI-only
  features: string[]     // UI-only
  year: number           // DB
  licensePlate: string   // DB: registration_number
}

type FormState = {
  name: string            // title
  brand: string
  model: string
  pricePerDay: string     // rental_price
  year: string
  licensePlate: string
  image: string           // optional URL (preview only)
  passengers: string
  transmission: string
  fuel: string
  available: boolean
  description: string
  features: string
}

/* ------------------------ Memoized vehicle form ------------------------ */
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="name" className="text-white text-sm sm:text-base">Title</Label>
          <Input
            id="name"
            placeholder="e.g., Premium SUV"
            value={formData.name}
            onChange={(e) => setFormData((s) => ({ ...s, name: e.target.value }))}
            required
            className="text-white placeholder:text-white/60 h-10 sm:h-11"
          />
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="brand" className="text-white text-sm sm:text-base">Brand</Label>
          <Input
            id="brand"
            placeholder="e.g., Toyota"
            value={formData.brand}
            onChange={(e) => setFormData((s) => ({ ...s, brand: e.target.value }))}
            required
            className="text-white placeholder:text-white/60 h-10 sm:h-11"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="model" className="text-white text-sm sm:text-base">Model</Label>
          <Input
            id="model"
            placeholder="e.g., RAV4"
            value={formData.model}
            onChange={(e) => setFormData((s) => ({ ...s, model: e.target.value }))}
            required
            className="text-white placeholder:text-white/60 h-10 sm:h-11"
          />
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="licensePlate" className="text-white text-sm sm:text-base">Registration Number</Label>
          <Input
            id="licensePlate"
            placeholder="e.g., FJ-1234"
            value={formData.licensePlate}
            onChange={(e) => setFormData((s) => ({ ...s, licensePlate: e.target.value }))}
            required
            className="text-white placeholder:text-white/60 h-10 sm:h-11"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="pricePerDay" className="text-white text-sm sm:text-base">Price per Day ($)</Label>
          <Input
            id="pricePerDay"
            type="number"
            placeholder="85"
            value={formData.pricePerDay}
            onChange={(e) => setFormData((s) => ({ ...s, pricePerDay: e.target.value }))}
            required
            className="text-white placeholder:text-white/60 h-10 sm:h-11"
          />
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="year" className="text-white text-sm sm:text-base">Year</Label>
          <Input
            id="year"
            type="number"
            placeholder="2023"
            value={formData.year}
            onChange={(e) => setFormData((s) => ({ ...s, year: e.target.value }))}
            required
            className="text-white placeholder:text-white/60 h-10 sm:h-11"
          />
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <Label className="text-white text-sm sm:text-base">Availability</Label>
          <div className="flex items-center space-x-2 h-10 sm:h-11">
            <input
              type="checkbox"
              id="available"
              checked={formData.available}
              onChange={(e) => setFormData((s) => ({ ...s, available: e.target.checked }))}
              className="rounded border-border"
            />
            <Label htmlFor="available" className="text-white text-sm sm:text-base">Available for booking</Label>
          </div>
        </div>
      </div>

      {/* Upload takes precedence over URL if provided */}
      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="image" className="text-white text-sm sm:text-base">Vehicle Image</Label>
        <div className="flex gap-2">
          <Input
            id="image"
            placeholder="(Optional) Image URL — upload preferred"
            value={formData.image}
            onChange={(e) => setFormData((s) => ({ ...s, image: e.target.value }))}
            className="text-white placeholder:text-white/60 h-10 sm:h-11"
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={uploadRef}
            onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => uploadRef.current?.click()}
            title="Upload image from your device"
          >
            <Upload className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ——— UI-only extras retained ——— */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="passengers" className="text-white text-sm sm:text-base">Passengers (UI)</Label>
          <Input
            id="passengers"
            type="number"
            placeholder="5"
            value={formData.passengers}
            onChange={(e) => setFormData((s) => ({ ...s, passengers: e.target.value }))}
            className="text-white placeholder:text-white/60 h-10 sm:h-11"
          />
        </div>
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="transmission" className="text-white text-sm sm:text-base">Transmission (UI)</Label>
          <Select
            value={formData.transmission}
            onValueChange={(value) => setFormData((s) => ({ ...s, transmission: value }))}
          >
            <SelectTrigger className="text-white placeholder:text-white/60 h-10 sm:h-11">
              <SelectValue placeholder="Select transmission" />
            </SelectTrigger>
            <SelectContent>
              {transmissionTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="fuel" className="text-white text-sm sm:text-base">Fuel (UI)</Label>
          <Select value={formData.fuel} onValueChange={(value) => setFormData((s) => ({ ...s, fuel: value }))}>
            <SelectTrigger className="text-white placeholder:text-white/60 h-10 sm:h-11">
              <SelectValue placeholder="Select fuel type" />
            </SelectTrigger>
            <SelectContent>
              {fuelTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="description" className="text-white text-sm sm:text-base">Description (UI)</Label>
        <Textarea
          id="description"
          placeholder="Brief description (not stored in DB schema yet)..."
          value={formData.description}
          onChange={(e) => setFormData((s) => ({ ...s, description: e.target.value }))}
          rows={3}
          className="text-white placeholder:text-white/60"
        />
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="features" className="text-white text-sm sm:text-base">Features (UI, comma-separated)</Label>
        <Input
          id="features"
          placeholder="Air Conditioning, GPS, Bluetooth"
          value={formData.features}
          onChange={(e) => setFormData((s) => ({ ...s, features: e.target.value }))}
          className="text-white placeholder:text-white/60 h-10 sm:h-11"
        />
      </div>

      <div className="flex gap-2 pt-2 sm:pt-4">
        <Button type="submit" className="bg-primary hover:bg-primary/90 h-10 sm:h-11 px-4 sm:px-5">
          {isEdit ? "Update Vehicle" : "Add Vehicle"}
        </Button>
        <Button type="button" variant="outline" className="h-10 sm:h-11 px-4 sm:px-5">
          Cancel
        </Button>
      </div>
    </form>
  )
})

/* ------------------------ Page content ------------------------ */
function VehicleManagementContent() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)

  const [formData, setFormData] = useState<FormState>({
    name: "",
    brand: "",
    model: "",
    image: "",
    pricePerDay: "",
    passengers: "",
    transmission: "",
    fuel: "",
    available: true,
    description: "",
    features: "",
    year: "",
    licensePlate: "",
  })

  // holds the file selected from the upload button
  const [pickedFile, setPickedFile] = useState<File | null>(null)

  const router = useRouter()

  // Make fade-in sections visible (prevents "blank content" if CSS hides until animated)
  useEffect(() => {
    const activate = () => {
      document.querySelectorAll<HTMLElement>(".fade-in-up").forEach((el) => el.classList.add("animate"))
    }
    activate()
    window.addEventListener("scroll", activate)
    return () => window.removeEventListener("scroll", activate)
  }, [])

  // Load vehicles from Supabase (fallback to mock on error or if client missing)
  useEffect(() => {
    const load = async () => {
      if (!supabase) return // stay on mock

      const { data, error } = await supabase
        .from("vehicles")
        .select(
          "id, registration_number, title, brand, model, year, rental_price, image_path, available, created_at"
        )
        .order("created_at", { ascending: false })

      if (error || !data) return

      const mapped: Vehicle[] = data.map((v: any) => {
        let publicUrl: string | null = null
        if (v.image_path) {
          const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(v.image_path)
          publicUrl = pub?.publicUrl ?? null
        }
        return {
          id: v.id,
          name: v.title,
          brand: v.brand,
          model: v.model,
          category: `${v.brand} ${v.model}`,
          image: publicUrl,
          pricePerDay: Number(v.rental_price ?? 0),
          passengers: 5, // UI default
          transmission: "Automatic", // UI default
          fuel: "Petrol", // UI default
          available: Boolean(v.available),
          description: "",
          features: [],
          year: Number(v.year ?? 0),
          licensePlate: v.registration_number ?? "",
        }
      })

      setVehicles(mapped)
    }
    load()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("adminAuth")
    localStorage.removeItem("adminUser")
    router.push("/admin/login")
  }

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      brand: "",
      model: "",
      image: "",
      pricePerDay: "",
      passengers: "",
      transmission: "",
      fuel: "",
      available: true,
      description: "",
      features: "",
      year: "",
      licensePlate: "",
    })
    setPickedFile(null)
  }, [])

  // Upload image file to Supabase Storage and return { publicUrl, path }
  const uploadImage = useCallback(async (file: File) => {
    if (!supabase) return { publicUrl: "", path: "" }
    const ext = file.name.split(".").pop() || "jpg"
    const fileName = `${crypto.randomUUID()}.${ext}`
    const path = `vehicles/${fileName}`

    const { error: uploadErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    })
    if (uploadErr) throw uploadErr

    const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
    return { publicUrl: pub?.publicUrl || "", path }
  }, [])

  const handleAddVehicle = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      // Prepare optimistic entry for UI
      const localNew: Vehicle = {
        id: Math.max(0, ...vehicles.map((v) => (typeof v.id === "number" ? v.id : 0))) + 1,
        name: formData.name,
        brand: formData.brand,
        model: formData.model,
        category: `${formData.brand} ${formData.model}`,
        image: formData.image || "/placeholder.svg",
        pricePerDay: Number.parseFloat(formData.pricePerDay),
        passengers: Number.parseInt(formData.passengers || "5"),
        transmission: formData.transmission || "Automatic",
        fuel: formData.fuel || "Petrol",
        available: formData.available,
        description: formData.description,
        features: formData.features
          ? formData.features.split(",").map((f) => f.trim()).filter(Boolean)
          : [],
        year: Number.parseInt(formData.year),
        licensePlate: formData.licensePlate,
      }

      if (supabase) {
        try {
          // upload image if picked
          let image_path: string | null = null
          let publicUrl: string | null = null

          if (pickedFile) {
            const up = await uploadImage(pickedFile)
            image_path = up.path
            publicUrl = up.publicUrl
          } else if (formData.image) {
            // preview only; DB stores path, so skip storing URL in DB
            publicUrl = formData.image
          }

          const payload = {
            registration_number: formData.licensePlate,
            title: formData.name,
            brand: formData.brand,
            model: formData.model,
            year: Number.parseInt(formData.year),
            rental_price: Number.parseFloat(formData.pricePerDay),
            image_path: image_path,               // DB requires path
            available: formData.available,
          }

          const { data, error } = await supabase.from("vehicles").insert(payload).select().single()
          if (!error && data) {
            // map DB row to UI
            let dbUrl: string | null = publicUrl
            if (data.image_path && !dbUrl) {
              const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.image_path)
              dbUrl = pub?.publicUrl ?? null
            }
            const mapped: Vehicle = {
              id: data.id,
              name: data.title,
              brand: data.brand,
              model: data.model,
              category: `${data.brand} ${data.model}`,
              image: dbUrl,
              pricePerDay: Number(data.rental_price ?? 0),
              passengers: localNew.passengers,
              transmission: localNew.transmission,
              fuel: localNew.fuel,
              available: Boolean(data.available),
              description: localNew.description,
              features: localNew.features,
              year: Number(data.year ?? 0),
              licensePlate: data.registration_number ?? "",
            }
            setVehicles((prev) => [mapped, ...prev])
          } else {
            // optimistic if insert failed
            setVehicles((prev) => [localNew, ...prev])
          }
        } catch {
          setVehicles((prev) => [localNew, ...prev])
        }
      } else {
        setVehicles((prev) => [localNew, ...prev])
      }

      setIsAddDialogOpen(false)
      resetForm()
    },
    [formData, pickedFile, resetForm, uploadImage, vehicles],
  )

  const handleEditVehicle = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!editingVehicle) return

      // Upload new file if given
      let newPublicUrl: string | null = editingVehicle.image as string | null
      let newImagePath: string | null = null

      if (supabase && pickedFile) {
        try {
          const up = await uploadImage(pickedFile)
          newPublicUrl = up.publicUrl
          newImagePath = up.path
        } catch {
          // keep existing URL if upload fails
        }
      }

      // Update UI
      const updatedVehicle: Vehicle = {
        ...editingVehicle,
        name: formData.name,
        brand: formData.brand,
        model: formData.model,
        category: `${formData.brand} ${formData.model}`,
        image: newPublicUrl || editingVehicle.image || "/placeholder.svg",
        pricePerDay: Number.parseFloat(formData.pricePerDay),
        passengers: Number.parseInt(formData.passengers || "5"),
        transmission: formData.transmission || "Automatic",
        fuel: formData.fuel || "Petrol",
        available: formData.available,
        description: formData.description,
        features: formData.features
          ? formData.features.split(",").map((f) => f.trim()).filter(Boolean)
          : [],
        year: Number.parseInt(formData.year),
        licensePlate: formData.licensePlate,
      }
      setVehicles((prev) => prev.map((v) => (v.id === editingVehicle.id ? updatedVehicle : v)))

      // Persist to DB only the columns that exist
      if (supabase && typeof editingVehicle.id === "string") {
        const payload: any = {
          registration_number: updatedVehicle.licensePlate,
          title: updatedVehicle.name,
          brand: updatedVehicle.brand,
          model: updatedVehicle.model,
          year: updatedVehicle.year,
          rental_price: updatedVehicle.pricePerDay,
          available: updatedVehicle.available,
        }
        if (newImagePath) payload.image_path = newImagePath
        await supabase.from("vehicles").update(payload).eq("id", editingVehicle.id)
      }

      setIsEditDialogOpen(false)
      setEditingVehicle(null)
      resetForm()
    },
    [editingVehicle, formData, pickedFile, resetForm, uploadImage],
  )

  const handleDeleteVehicle = async (id: VehicleId) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return
    setVehicles((prev) => prev.filter((v) => v.id !== id))
    if (supabase && typeof id === "string") {
      await supabase.from("vehicles").delete().eq("id", id)
    }
  }

  const openEditDialog = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setFormData({
      name: vehicle.name,
      brand: vehicle.brand,
      model: vehicle.model,
      image: (vehicle.image as string) || "",
      pricePerDay: vehicle.pricePerDay.toString(),
      passengers: String(vehicle.passengers || 5),
      transmission: vehicle.transmission || "Automatic",
      fuel: vehicle.fuel || "Petrol",
      available: vehicle.available,
      description: vehicle.description || "",
      features: (vehicle.features || []).join(", "),
      year: vehicle.year.toString(),
      licensePlate: vehicle.licensePlate,
    })
    setPickedFile(null)
    setIsEditDialogOpen(true)
  }

  // Unique key helper (handles UUID or local numeric)
  const keyFor = (v: Vehicle) => (typeof v.id === "string" ? v.id : `local-${v.id}-${v.licensePlate}`)

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent via-primary/20 to-secondary/20">
      <nav className="sticky top-0 z-50 glass-effect-dark border-b border-white/10">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Link href="/admin/dashboard" className="flex items-center space-x-2 sm:space-x-3 group">
                <div className="w-10 h-10 sm:w-12 sm:h-12 gradient-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Car className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-bold text-white">Bakers Rentals</span>
                  <p className="text-white/80 text-xs sm:text-sm">Vehicle Management</p>
                </div>
              </Link>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="btn-3d glass-effect-dark text-white border-white/20 hover:bg-white/10 bg-transparent h-9 px-3"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </nav>

      <section className="py-8 sm:py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-6 sm:mb-12">
            <div className="fade-in-up">
              <h1 className="text-2xl sm:text-5xl font-bold text-white mb-2 sm:mb-4 drop-shadow-lg">
                Vehicle Fleet Management
              </h1>
              <p className="text-white/80 text-sm sm:text-xl">Manage your premium vehicle collection</p>
            </div>
            <div className="fade-in-up" style={{ animationDelay: "0.2s" }}>
              <Dialog open={isAddDialogOpen} onOpenChange={(o) => { setIsAddDialogOpen(o); if (!o) resetForm() }}>
                <DialogTrigger asChild>
                  <Button className="btn-3d pulse-glow bg-white text-primary hover:bg-white/90 font-bold h-9 px-3 text-sm sm:h-auto sm:px-8 sm:py-6 sm:text-lg">
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                    <span>Add Vehicle</span>
                  </Button>
                </DialogTrigger>

                <DialogContent
                  forceMount
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  onCloseAutoFocus={(e) => e.preventDefault()}
                  className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto glass-effect-dark border-white/20 backdrop-blur-md data-[state=open]:bg-black/20"
                >
                  <div className="pointer-events-none fixed inset-0 -z-10 bg-black/40 backdrop-blur-sm" />
                  <DialogHeader>
                    <DialogTitle className="text-white text-xl sm:text-2xl">Add New Vehicle</DialogTitle>
                  </DialogHeader>
                  <VehicleForm
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleAddVehicle}
                    onFilePicked={setPickedFile}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Mobile list (no horizontal scroll) */}
          <div className="space-y-3 sm:hidden">
            {vehicles.map((vehicle) => (
              <Card key={keyFor(vehicle)} className="glass-effect-dark border-white/10">
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    <Image
                      src={(vehicle.image as string) || "/placeholder.svg"}
                      alt={vehicle.name}
                      width={72}
                      height={56}
                      className="rounded object-cover w-24 h-16"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-white text-base truncate">{vehicle.name}</p>
                          <p className="text-white/70 text-xs">
                            {vehicle.brand} {vehicle.model} • {vehicle.year}
                          </p>
                        </div>
                        <Badge
                          className={
                            vehicle.available
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                          }
                        >
                          {vehicle.available ? "Available" : "Unavailable"}
                        </Badge>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-white/80">
                        <div className="rounded bg-white/5 px-2 py-1">
                          <span className="opacity-80">Price/day: </span>
                          <span className="font-medium">${vehicle.pricePerDay}</span>
                        </div>
                        <div className="rounded bg-white/5 px-2 py-1">
                          <span className="opacity-80">Plate: </span>
                          <span className="font-mono">{vehicle.licensePlate}</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(vehicle)}
                          className="btn-3d glass-effect-dark text-white border-white/20 hover:bg-white/10 h-8 px-3"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteVehicle(vehicle.id)}
                          className="btn-3d glass-effect-dark text-red-400 border-red-500/30 hover:bg-red-500/10 h-8 px-3"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop / tablet table */}
          <div className="fade-in-up hidden sm:block" style={{ animationDelay: "0.4s" }}>
            <Card className="card-3d border-0 glass-effect-dark">
              <CardHeader>
                <CardTitle className="text-white text-2xl">Fleet Overview ({vehicles.length} vehicles)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className="text-white/80 whitespace-nowrap">Vehicle</TableHead>
                        <TableHead className="text-white/80 whitespace-nowrap">Brand / Model</TableHead>
                        <TableHead className="text-white/80 whitespace-nowrap">Price/Day</TableHead>
                        <TableHead className="text-white/80 whitespace-nowrap">Year</TableHead>
                        <TableHead className="text-white/80 whitespace-nowrap">Status</TableHead>
                        <TableHead className="text-white/80 whitespace-nowrap">Registration</TableHead>
                        <TableHead className="text-white/80 whitespace-nowrap">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicles.map((vehicle) => (
                        <TableRow key={keyFor(vehicle)} className="border-white/10 hover:bg-white/5">
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Image
                                src={(vehicle.image as string) || "/placeholder.svg"}
                                alt={vehicle.name}
                                width={50}
                                height={40}
                                className="rounded object-cover"
                              />
                              <div>
                                <p className="font-medium text-white">{vehicle.name}</p>
                                <p className="text-sm text-white/70">
                                  {vehicle.year}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-white/80">{vehicle.brand} {vehicle.model}</TableCell>
                          <TableCell className="font-medium text-white">${vehicle.pricePerDay}</TableCell>
                          <TableCell className="text-white/80">{vehicle.year}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                vehicle.available
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : "bg-red-500/20 text-red-400 border-red-500/30"
                              }
                            >
                              {vehicle.available ? "Available" : "Unavailable"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm text-white/80">{vehicle.licensePlate}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(vehicle)}
                                className="btn-3d glass-effect-dark text-white border-white/20 hover:bg-white/10"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteVehicle(vehicle.id)}
                                className="btn-3d glass-effect-dark text-red-400 border-red-500/30 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          <Dialog open={isEditDialogOpen} onOpenChange={(o) => { setIsEditDialogOpen(o); if (!o) resetForm() }}>
            <DialogContent
              forceMount
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
              className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto glass-effect-dark border-white/20 backdrop-blur-md data-[state=open]:bg-black/20"
            >
              <div className="pointer-events-none fixed inset-0 -z-10 bg-black/40 backdrop-blur-sm" />
              <DialogHeader>
                <DialogTitle className="text-white text-xl sm:text-2xl">Edit Vehicle</DialogTitle>
              </DialogHeader>
              <VehicleForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleEditVehicle}
                onFilePicked={setPickedFile}
                isEdit
              />
            </DialogContent>
          </Dialog>
        </div>
      </section>
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
