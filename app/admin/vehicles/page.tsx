"use client"

import type React from "react"
import { useState, useEffect, useCallback, memo, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminAuthGuard } from "@/components/admin-auth-guard"
import { Car, Plus, Edit, Trash2, Upload, LogOut } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

// ---- Supabase client (anon, safe for reads & DB insert) ----
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = SUPABASE_URL && SUPABASE_ANON ? createClient(SUPABASE_URL, SUPABASE_ANON) : null
const STORAGE_BUCKET = "vehicle-photos"

// ---- Types ----
const initialVehicles: Vehicle[] = []
type VehicleId = string | number

interface Vehicle {
  id: VehicleId
  name: string
  brand: string
  model: string
  category?: string
  image: string | null
  imagePath?: string | null
  pricePerDay: number
  passengers: number
  transmission: string
  fuel: string
  available: boolean
  description: string
  features: string[]
  year: number
  licensePlate: string
}

type FormState = {
  name: string
  brand: string
  model: string
  pricePerDay: string
  year: string
  licensePlate: string
  passengers: string
  transmission: string
  fuel: string
  available: boolean
  description: string
  features: string
}

/* ------------------------ Vehicle form ------------------------ */
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
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Title</Label>
          <Input id="name" value={formData.name} onChange={(e) => setFormData((s) => ({ ...s, name: e.target.value }))} required />
        </div>
        <div>
          <Label htmlFor="brand">Brand</Label>
          <Input id="brand" value={formData.brand} onChange={(e) => setFormData((s) => ({ ...s, brand: e.target.value }))} required />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="model">Model</Label>
          <Input id="model" value={formData.model} onChange={(e) => setFormData((s) => ({ ...s, model: e.target.value }))} required />
        </div>
        <div>
          <Label htmlFor="licensePlate">Registration Number</Label>
          <Input id="licensePlate" value={formData.licensePlate} onChange={(e) => setFormData((s) => ({ ...s, licensePlate: e.target.value }))} required />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="pricePerDay">Price per Day ($)</Label>
          <Input id="pricePerDay" type="number" value={formData.pricePerDay} onChange={(e) => setFormData((s) => ({ ...s, pricePerDay: e.target.value }))} required />
        </div>
        <div>
          <Label htmlFor="year">Year</Label>
          <Input id="year" type="number" value={formData.year} onChange={(e) => setFormData((s) => ({ ...s, year: e.target.value }))} required />
        </div>
        <div className="flex items-center space-x-2">
          <input type="checkbox" id="available" checked={formData.available} onChange={(e) => setFormData((s) => ({ ...s, available: e.target.checked }))} />
          <Label htmlFor="available">Available</Label>
        </div>
      </div>

      <div>
        <Label>Vehicle Image</Label>
        <div className="flex gap-2">
          <input type="file" accept="image/*" className="hidden" id="image-upload-input" onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)} />
          <Button type="button" variant="outline" onClick={() => document.getElementById("image-upload-input")?.click()}>
            <Upload className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Button type="submit">{isEdit ? "Update Vehicle" : "Add Vehicle"}</Button>
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
    name: "", brand: "", model: "", pricePerDay: "", passengers: "", transmission: "", fuel: "", available: true, description: "", features: "", year: "", licensePlate: "",
  })
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const router = useRouter()

  // Load vehicles from DB
  useEffect(() => {
    const load = async () => {
      if (!supabase) return
      const { data, error } = await supabase.from("vehicles").select("*").order("created_at", { ascending: false })
      if (error) { console.error(error); return }
      const mapped: Vehicle[] = (data || []).map((v: any) => {
        const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(v.image_path)
        return {
          id: v.id, name: v.title, brand: v.brand, model: v.model,
          image: pub?.publicUrl ?? null, imagePath: v.image_path,
          pricePerDay: v.rental_price, passengers: 5, transmission: "Automatic", fuel: "Petrol",
          available: v.available, description: "", features: [], year: v.year, licensePlate: v.registration_number,
        }
      })
      setVehicles(mapped)
    }
    load()
  }, [])

  const resetForm = useCallback(() => {
    setFormData({ name: "", brand: "", model: "", pricePerDay: "", passengers: "", transmission: "", fuel: "", available: true, description: "", features: "", year: "", licensePlate: "" })
    setPickedFile(null)
  }, [])

  // ✅ Secure upload via API route
  const uploadImage = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch("/api/storage/upload", { method: "POST", body: formData })
    if (!res.ok) {
      const err = await res.json()
      console.error("[Vehicles] Upload API error:", err)
      throw new Error(err.error || "Upload failed")
    }
    const data = await res.json()
    return { publicUrl: data.publicUrl as string, path: data.path as string }
  }, [])

  // Add vehicle
  const handleAddVehicle = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return

    let image_path: string | null = null
    let publicUrl: string | null = null

    try {
      if (pickedFile) {
        const up = await uploadImage(pickedFile)
        image_path = up.path
        publicUrl = up.publicUrl
      }
    } catch {
      alert("Image upload failed.")
      return
    }

    const payload = {
      registration_number: formData.licensePlate,
      title: formData.name,
      brand: formData.brand,
      model: formData.model,
      year: Number(formData.year),
      rental_price: Number(formData.pricePerDay),
      image_path,
      available: formData.available,
    }

    const { data, error } = await supabase.from("vehicles").insert(payload).select().single()
    if (error) { alert(error.message); return }

    const mapped: Vehicle = {
      id: data.id, name: data.title, brand: data.brand, model: data.model,
      category: `${data.brand} ${data.model}`, image: publicUrl, imagePath: data.image_path,
      pricePerDay: data.rental_price, passengers: 5, transmission: "Automatic", fuel: "Petrol",
      available: data.available, description: "", features: [], year: data.year, licensePlate: data.registration_number,
    }
    setVehicles((prev) => [mapped, ...prev])
    setIsAddDialogOpen(false)
    resetForm()
  }, [formData, pickedFile, uploadImage, resetForm])

  // Edit vehicle
  const handleEditVehicle = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingVehicle || !supabase) return

    let newPublicUrl: string | null = editingVehicle.image
    let newImagePath: string | null = null

    if (pickedFile) {
      try {
        const up = await uploadImage(pickedFile)
        newPublicUrl = up.publicUrl
        newImagePath = up.path
      } catch {
        alert("Image upload failed. Keeping old image.")
      }
    }

    const payload: any = {
      registration_number: formData.licensePlate,
      title: formData.name,
      brand: formData.brand,
      model: formData.model,
      year: Number(formData.year),
      rental_price: Number(formData.pricePerDay),
      available: formData.available,
    }
    if (newImagePath) payload.image_path = newImagePath

    const { error } = await supabase.from("vehicles").update(payload).eq("id", editingVehicle.id)
    if (error) { alert(error.message); return }

    const updated: Vehicle = {
      ...editingVehicle, name: formData.name, brand: formData.brand, model: formData.model,
      image: newPublicUrl, imagePath: newImagePath ?? editingVehicle.imagePath,
      pricePerDay: Number(formData.pricePerDay), available: formData.available,
      year: Number(formData.year), licensePlate: formData.licensePlate,
      passengers: 5, transmission: "Automatic", fuel: "Petrol", description: "", features: [],
    }
    setVehicles((prev) => prev.map((v) => (v.id === editingVehicle.id ? updated : v)))
    setIsEditDialogOpen(false)
    setEditingVehicle(null)
    resetForm()
  }, [editingVehicle, formData, pickedFile, uploadImage, resetForm])

  // Delete
  const handleDeleteVehicle = async (id: VehicleId) => {
    if (!supabase) return
    const victim = vehicles.find((v) => v.id === id)
    if (!confirm("Delete this vehicle?")) return

    const { error } = await supabase.from("vehicles").delete().eq("id", id)
    if (error) { alert(error.message); return }

    if (victim?.imagePath) {
      await supabase.storage.from(STORAGE_BUCKET).remove([victim.imagePath])
    }

    setVehicles((prev) => prev.filter((v) => v.id !== id))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent via-primary/20 to-secondary/20">
      <nav className="sticky top-0 z-50 flex justify-between p-4">
        <Link href="/admin/dashboard" className="text-white font-bold">Bakers Rentals</Link>
        <Button onClick={() => { localStorage.clear(); router.push("/admin/login") }}><LogOut /> Logout</Button>
      </nav>

      <section className="p-6">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus /> Add Vehicle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Vehicle</DialogTitle>
              <DialogDescription>Fill details below</DialogDescription>
            </DialogHeader>
            <VehicleForm formData={formData} setFormData={setFormData} onSubmit={handleAddVehicle} onFilePicked={setPickedFile} />
          </DialogContent>
        </Dialog>

        {/* List */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead><TableHead>Name</TableHead><TableHead>Plate</TableHead><TableHead>Price</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((v) => (
              <TableRow key={v.id}>
                <TableCell><Image src={v.image || "/placeholder.svg"} alt={v.name} width={60} height={40} /></TableCell>
                <TableCell>{v.name}</TableCell>
                <TableCell>{v.licensePlate}</TableCell>
                <TableCell>${v.pricePerDay}</TableCell>
                <TableCell><Badge>{v.available ? "Available" : "Unavailable"}</Badge></TableCell>
                <TableCell>
                  <Button size="sm" onClick={() => { setEditingVehicle(v); setFormData({ ...formData, name: v.name, brand: v.brand, model: v.model, year: v.year.toString(), pricePerDay: v.pricePerDay.toString(), licensePlate: v.licensePlate, passengers: "5", transmission: "Automatic", fuel: "Petrol", available: v.available, description: "", features: "" }); setIsEditDialogOpen(true) }}><Edit /></Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteVehicle(v.id)}><Trash2 /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Edit dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Vehicle</DialogTitle>
            </DialogHeader>
            <VehicleForm formData={formData} setFormData={setFormData} onSubmit={handleEditVehicle} onFilePicked={setPickedFile} isEdit />
          </DialogContent>
        </Dialog>
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
