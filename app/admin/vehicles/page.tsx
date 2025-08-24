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
  // eslint-disable-next-line no-console
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
  // DB-backed
  id: VehicleId
  name: string // DB: title
  brand: string // DB
  model: string // DB
  year: number // DB
  pricePerDay: number // DB: rental_price
  licensePlate: string // DB: registration_number
  available: boolean // DB
  image: string | null // public URL
  imagePath?: string | null // storage path

  // UI-only (not stored in DB yet)
  category: string
  passengers: number
  transmission: string
  fuel: string
  features: string[]
}

type FormState = {
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

/* ------------------------ Form ------------------------ */
const VehicleForm = memo(function VehicleForm({
  formData,
  setFormData,
  onSubmit,
  isEdit = false,
  onFilePicked, // file upload stays as-is
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
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="name" className="text-white text-sm sm:text-base">
            Vehicle Name
          </Label>
          <Input
            id="name"
            placeholder="e.g., Toyota RAV4"
            value={formData.name}
            onChange={(e) => setFormData((s) => ({ ...s, name: e.target.value }))}
            required
            className="text-white placeholder:text-white/60 h-10 sm:h-11"
          />
        </div>
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="category" className="text-white text-sm sm:text-base">
            Category
          </Label>
          <Select value={formData.category} onValueChange={(value) => setFormData((s) => ({ ...s, category: value }))}>
            <SelectTrigger className="text-white placeholder:text-white/60 h-10 sm:h-11">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="brand" className="text-white text-sm sm:text-base">
            Brand
          </Label>
          <Input
            id="brand"
            placeholder="e.g., Toyota"
            value={formData.brand}
            onChange={(e) => setFormData((s) => ({ ...s, brand: e.target.value }))}
            required
            className="text-white placeholder:text-white/60 h-10 sm:h-11"
          />
        </div>
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="model" className="text-white text-sm sm:text-base">
            Model
          </Label>
          <Input
            id="model"
            placeholder="e.g., RAV4"
            value={formData.model}
            onChange={(e) => setFormData((s) => ({ ...s, model: e.target.value }))}
            required
            className="text-white placeholder:text-white/60 h-10 sm:h-11"
          />
        </div>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="pricePerDay" className="text-white text-sm sm:text-base">
            Price per Day ($)
          </Label>
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
          <Label htmlFor="passengers" className="text-white text-sm sm:text-base">
            Passengers
          </Label>
          <Input
            id="passengers"
            type="number"
            placeholder="5"
            value={formData.passengers}
            onChange={(e) => setFormData((s) => ({ ...s, passengers: e.target.value }))}
            required
            className="text-white placeholder:text-white/60 h-10 sm:h-11"
          />
        </div>
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="year" className="text-white text-sm sm:text-base">
            Year
          </Label>
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
      </div>

      {/* Row 4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="transmission" className="text-white text-sm sm:text-base">
            Transmission
          </Label>
          <Select
            value={formData.transmission}
            onValueChange={(value) => setFormData((s) => ({ ...s, transmission: value }))}
          >
            <SelectTrigger className="text-white placeholder:text-white/60 h-10 sm:h-11">
              <SelectValue placeholder="Select transmission" />
            </SelectTrigger>
            <SelectContent>
              {transmissionTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="fuel" className="text-white text-sm sm:text-base">
            Fuel Type
          </Label>
          <Select value={formData.fuel} onValueChange={(value) => setFormData((s) => ({ ...s, fuel: value }))}>
            <SelectTrigger className="text-white placeholder:text-white/60 h-10 sm:h-11">
              <SelectValue placeholder="Select fuel type" />
            </SelectTrigger>
            <SelectContent>
              {fuelTypes.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 5 */}
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

      {/* Image upload */}
      <div className="space-y-1.5 sm:space-y-2">
        <Label className="text-white text-sm sm:text-base">Vehicle Image</Label>
        <div className="flex gap-2">
          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            className="hidden"
            id="image-upload-input"
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
          <span className="text-white/70 text-sm self-center">PNG/JPG/WEBP up to 10MB</span>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="features" className="text-white text-sm sm:text-base">
          Features (comma-separated)
        </Label>
        <Input
          id="features"
          placeholder="Air Conditioning, GPS, Bluetooth"
          value={formData.features}
          onChange={(e) => setFormData((s) => ({ ...s, features: e.target.value }))}
          className="text-white placeholder:text-white/60 h-10 sm:h-11"
        />
      </div>

      {/* Availability */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="available"
          checked={formData.available}
          onChange={(e) => setFormData((s) => ({ ...s, available: e.target.checked }))}
          className="rounded border-border"
        />
        <Label htmlFor="available" className="text-white text-sm sm:text-base">
          Available for booking
        </Label>
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
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)

  const [formData, setFormData] = useState<FormState>({
    name: "",
    brand: "",
    model: "",
    year: "",
    pricePerDay: "",
    licensePlate: "",
    available: true,

    category: "",
    passengers: "",
    transmission: "",
    fuel: "",
    features: "",
  })

  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const router = useRouter()

  // Fade-in helper
  useEffect(() => {
    const activate = () => {
      document.querySelectorAll<HTMLElement>(".fade-in-up").forEach((el) => el.classList.add("animate"))
    }
    activate()
    window.addEventListener("scroll", activate)
    return () => window.removeEventListener("scroll", activate)
  }, [])

  // Load vehicles from DB; UI-only fields default locally
  useEffect(() => {
    const load = async () => {
      if (!supabase) return

      const { data, error } = await supabase
        .from("vehicles")
        .select(
          "id, registration_number, title, brand, model, year, rental_price, image_path, available, created_at"
        )
        .order("created_at", { ascending: false })

      if (error) {
        // eslint-disable-next-line no-console
        console.error("[Vehicles] Supabase select error:", error)
        return
      }

      const mapped: Vehicle[] =
        (data || []).map((v: any) => {
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

            // UI-only defaults
            category: "",
            passengers: 5,
            transmission: "Automatic",
            fuel: "Petrol",
            features: [],
          }
        }) || []

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
      year: "",
      pricePerDay: "",
      licensePlate: "",
      available: true,

      category: "",
      passengers: "",
      transmission: "",
      fuel: "",
      features: "",
    })
    setPickedFile(null)
  }, [])

  // Secure upload via API route
  const uploadImage = useCallback(async (file: File) => {
    const fd = new FormData()
    fd.append("file", file)

    const res = await fetch("/api/storage/upload", { method: "POST", body: fd })
    if (!res.ok) {
      let msg = "Upload failed"
      try {
        const j = await res.json()
        msg = j.error || msg
        // eslint-disable-next-line no-console
        console.error("[Vehicles] Upload API error:", j)
      } catch {
        // ignore parse error
      }
      throw new Error(msg)
    }
    const data = await res.json()
    return { publicUrl: data.publicUrl as string, path: data.path as string }
  }, [])

  /* ------------------------ Add ------------------------ */
  const handleAddVehicle = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!supabase) {
        alert("Supabase is not configured.")
        return
      }

      // 1) Upload image first (if provided)
      let image_path: string | null = null
      let publicUrl: string | null = null
      try {
        if (pickedFile) {
          const up = await uploadImage(pickedFile)
          image_path = up.path
          publicUrl = up.publicUrl
        }
      } catch (err: any) {
        alert(err?.message || "Image upload failed.")
        return
      }

      // 2) Insert DB row (DB-backed fields only)
      const payload = {
        registration_number: formData.licensePlate,
        title: formData.name,
        brand: formData.brand,
        model: formData.model,
        year: Number.parseInt(formData.year || "0"),
        rental_price: Number.parseFloat(formData.pricePerDay || "0"),
        image_path,
        available: formData.available,
      }

      const { data, error } = await supabase.from("vehicles").insert(payload).select().single()
      if (error) {
        // eslint-disable-next-line no-console
        console.error("[Vehicles] Supabase insert error:", error)
        alert(error.message)
        return
      }

      // 3) Merge with UI-only fields for display
      const newVehicle: Vehicle = {
        id: data.id,
        name: data.title,
        brand: data.brand,
        model: data.model,
        year: Number(data.year ?? 0),
        pricePerDay: Number(data.rental_price ?? 0),
        licensePlate: data.registration_number ?? "",
        available: Boolean(data.available),
        image: publicUrl,
        imagePath: data.image_path ?? null,

        // from form (UI-only)
        category: formData.category,
        passengers: Number.parseInt(formData.passengers || "5"),
        transmission: formData.transmission || "Automatic",
        fuel: formData.fuel || "Petrol",
        features: formData.features ? formData.features.split(",").map((f) => f.trim()).filter(Boolean) : [],
      }

      setVehicles((prev) => [newVehicle, ...prev])
      setIsAddDialogOpen(false)
      resetForm()
    },
    [formData, pickedFile, uploadImage, resetForm]
  )

  /* ------------------------ Edit ------------------------ */
  const handleEditVehicle = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!editingVehicle || !supabase) return

      // Upload new image if provided
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

      // DB update (DB-backed fields only)
      const payload: any = {
        registration_number: formData.licensePlate,
        title: formData.name,
        brand: formData.brand,
        model: formData.model,
        year: Number.parseInt(formData.year || "0"),
        rental_price: Number.parseFloat(formData.pricePerDay || "0"),
        available: formData.available,
      }
      if (newImagePath) payload.image_path = newImagePath

      const { error } = await supabase.from("vehicles").update(payload).eq("id", editingVehicle.id)
      if (error) {
        // eslint-disable-next-line no-console
        console.error("[Vehicles] Supabase update error:", error)
        alert(error.message)
        return
      }

      // Merge UI view
      const updated: Vehicle = {
        ...editingVehicle,
        name: formData.name,
        brand: formData.brand,
        model: formData.model,
        year: Number.parseInt(formData.year || "0"),
        pricePerDay: Number.parseFloat(formData.pricePerDay || "0"),
        licensePlate: formData.licensePlate,
        available: formData.available,
        image: newPublicUrl,
        imagePath: newImagePath ?? editingVehicle.imagePath,

        // UI-only fields updated too
        category: formData.category,
        passengers: Number.parseInt(formData.passengers || String(editingVehicle.passengers || 5)),
        transmission: formData.transmission || editingVehicle.transmission,
        fuel: formData.fuel || editingVehicle.fuel,
        features: formData.features
          ? formData.features.split(",").map((f) => f.trim()).filter(Boolean)
          : editingVehicle.features,
      }

      setVehicles((prev) => prev.map((v) => (v.id === editingVehicle.id ? updated : v)))
      setIsEditDialogOpen(false)
      setEditingVehicle(null)
      resetForm()
    },
    [editingVehicle, formData, pickedFile, uploadImage, resetForm]
  )

  /* ------------------------ Delete ------------------------ */
  const handleDeleteVehicle = async (id: VehicleId) => {
    if (!supabase) return
    const victim = vehicles.find((v) => v.id === id)
    if (!confirm("Are you sure you want to delete this vehicle?")) return

    const { error } = await supabase.from("vehicles").delete().eq("id", id)
    if (error) {
      alert(error.message)
      return
    }

    // best-effort: delete image
    if (victim?.imagePath) {
      await supabase.storage.from(STORAGE_BUCKET).remove([victim.imagePath])
    }

    setVehicles((prev) => prev.filter((v) => v.id !== id))
  }

  const openEditDialog = (v: Vehicle) => {
    setEditingVehicle(v)
    setFormData({
      name: v.name,
      brand: v.brand,
      model: v.model,
      year: v.year.toString(),
      pricePerDay: v.pricePerDay.toString(),
      licensePlate: v.licensePlate,
      available: v.available,

      category: v.category || "",
      passengers: String(v.passengers || 5),
      transmission: v.transmission || "Automatic",
      fuel: v.fuel || "Petrol",
      features: (v.features || []).join(", "),
    })
    setPickedFile(null)
    setIsEditDialogOpen(true)
  }

  const keyFor = (v: Vehicle) => (typeof v.id === "string" ? v.id : `v-${v.id}-${v.licensePlate}`)

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent via-primary/20 to-secondary/20">
      {/* Top bar */}
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
              onClick={() => {
                localStorage.removeItem("adminAuth")
                localStorage.removeItem("adminUser")
                router.push("/admin/login")
              }}
              className="btn-3d glass-effect-dark text-white border-white/20 hover:bg-white/10 bg-transparent h-9 px-3"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </nav>

      {!supabase && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 px-4 py-3">
          <div className="container mx-auto max-w-7xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Supabase is not configured. Set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
          </div>
        </div>
      )}

      <section className="py-8 sm:py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Header & Add */}
          <div className="flex items-center justify-between mb-6 sm:mb-12">
            <div className="fade-in-up">
              <h1 className="text-2xl sm:text-5xl font-bold text-white mb-2 sm:mb-4 drop-shadow-lg">
                Vehicle Fleet Management
              </h1>
              <p className="text-white/80 text-sm sm:text-xl">Manage your premium vehicle collection</p>
            </div>
            <div className="fade-in-up" style={{ animationDelay: "0.2s" }}>
              <Dialog
                open={isAddDialogOpen}
                onOpenChange={(o) => {
                  setIsAddDialogOpen(o)
                  if (!o) resetForm()
                }}
              >
                <DialogTrigger asChild>
                  <Button className="btn-3d pulse-glow bg-white text-primary hover:bg-white/90 font-bold h-9 px-3 text-sm sm:h-auto sm:px-8 sm:py-6 sm:text-lg">
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                    <span>Add Vehicle</span>
                  </Button>
                </DialogTrigger>
                <DialogContent
                  forceMount
                  aria-describedby="add-vehicle-desc"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  onCloseAutoFocus={(e) => e.preventDefault()}
                  className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto glass-effect-dark border-white/20 backdrop-blur-md data-[state=open]:bg-black/20"
                >
                  <div className="pointer-events-none fixed inset-0 -z-10 bg-black/40 backdrop-blur-sm" />
                  <DialogHeader>
                    <DialogTitle className="text-white text-xl sm:text-2xl">Add New Vehicle</DialogTitle>
                    <DialogDescription id="add-vehicle-desc" className="text-white/80">
                      Upload a photo and fill in the vehicle details. Fields marked * are required.
                    </DialogDescription>
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

          {/* Mobile list */}
          <div className="space-y-3 sm:hidden">
            {vehicles.map((vehicle) => (
              <Card key={keyFor(vehicle)} className="glass-effect-dark border-white/10">
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    <Image
                      src={vehicle.image || "/placeholder.svg"}
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
                            {vehicle.year} • {vehicle.transmission}
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
                          <span className="opacity-80">Category: </span>
                          <span className="font-medium">{vehicle.category || "—"}</span>
                        </div>
                        <div className="rounded bg-white/5 px-2 py-1">
                          <span className="opacity-80">Seats: </span>
                          <span className="font-medium">{vehicle.passengers}</span>
                        </div>
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
                        <TableHead className="text-white/80 whitespace-nowrap">Category</TableHead>
                        <TableHead className="text-white/80 whitespace-nowrap">Price/Day</TableHead>
                        <TableHead className="text-white/80 whitespace-nowrap">Passengers</TableHead>
                        <TableHead className="text-white/80 whitespace-nowrap">Status</TableHead>
                        <TableHead className="text-white/80 whitespace-nowrap">License</TableHead>
                        <TableHead className="text-white/80 whitespace-nowrap">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicles.map((vehicle) => (
                        <TableRow key={keyFor(vehicle)} className="border-white/10 hover:bg-white/5">
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Image
                                src={vehicle.image || "/placeholder.svg"}
                                alt={vehicle.name}
                                width={50}
                                height={40}
                                className="rounded object-cover"
                              />
                              <div>
                                <p className="font-medium text-white">{vehicle.name}</p>
                                <p className="text-sm text-white/70">
                                  {vehicle.year} • {vehicle.transmission}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-white/20 text-white/80">
                              {vehicle.category || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-white">${vehicle.pricePerDay}</TableCell>
                          <TableCell className="text-white/80">{vehicle.passengers}</TableCell>
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

          {/* Edit dialog */}
          <Dialog
            open={isEditDialogOpen}
            onOpenChange={(o) => {
              setIsEditDialogOpen(o)
              if (!o) resetForm()
            }}
          >
            <DialogContent
              forceMount
              aria-describedby="edit-vehicle-desc"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
              className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto glass-effect-dark border-white/20 backdrop-blur-md data-[state=open]:bg-black/20"
            >
              <div className="pointer-events-none fixed inset-0 -z-10 bg-black/40 backdrop-blur-sm" />
              <DialogHeader>
                <DialogTitle className="text-white text-xl sm:text-2xl">Edit Vehicle</DialogTitle>
                <DialogDescription id="edit-vehicle-desc" className="text-white/80">
                  Update details or upload a new photo for this vehicle.
                </DialogDescription>
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