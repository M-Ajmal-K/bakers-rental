"use client"

import type React from "react"

import { useState } from "react"
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

// Mock vehicle data with more details for admin
const initialVehicles = [
  {
    id: 1,
    name: "Toyota RAV4",
    category: "SUV",
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
    category: "Van",
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
    category: "SUV",
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
    category: "Van",
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

const categories = ["SUV", "Van", "Compact", "Pickup", "Luxury"]
const transmissionTypes = ["Automatic", "Manual"]
const fuelTypes = ["Petrol", "Diesel", "Hybrid", "Electric"]

interface Vehicle {
  id: number
  name: string
  category: string
  image: string
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

function VehicleManagementContent() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    category: "",
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
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem("adminAuth")
    localStorage.removeItem("adminUser")
    router.push("/admin/login")
  }

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
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
  }

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault()
    const newVehicle: Vehicle = {
      id: Math.max(...vehicles.map((v) => v.id)) + 1,
      name: formData.name,
      category: formData.category,
      image: formData.image || "/placeholder.svg",
      pricePerDay: Number.parseInt(formData.pricePerDay),
      passengers: Number.parseInt(formData.passengers),
      transmission: formData.transmission,
      fuel: formData.fuel,
      available: formData.available,
      description: formData.description,
      features: formData.features
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean),
      year: Number.parseInt(formData.year),
      licensePlate: formData.licensePlate,
    }
    setVehicles([...vehicles, newVehicle])
    setIsAddDialogOpen(false)
    resetForm()
  }

  const handleEditVehicle = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingVehicle) return

    const updatedVehicle: Vehicle = {
      ...editingVehicle,
      name: formData.name,
      category: formData.category,
      image: formData.image || editingVehicle.image,
      pricePerDay: Number.parseInt(formData.pricePerDay),
      passengers: Number.parseInt(formData.passengers),
      transmission: formData.transmission,
      fuel: formData.fuel,
      available: formData.available,
      description: formData.description,
      features: formData.features
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean),
      year: Number.parseInt(formData.year),
      licensePlate: formData.licensePlate,
    }

    setVehicles(vehicles.map((v) => (v.id === editingVehicle.id ? updatedVehicle : v)))
    setIsEditDialogOpen(false)
    setEditingVehicle(null)
    resetForm()
  }

  const handleDeleteVehicle = (id: number) => {
    if (confirm("Are you sure you want to delete this vehicle?")) {
      setVehicles(vehicles.filter((v) => v.id !== id))
    }
  }

  const openEditDialog = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setFormData({
      name: vehicle.name,
      category: vehicle.category,
      image: vehicle.image,
      pricePerDay: vehicle.pricePerDay.toString(),
      passengers: vehicle.passengers.toString(),
      transmission: vehicle.transmission,
      fuel: vehicle.fuel,
      available: vehicle.available,
      description: vehicle.description,
      features: vehicle.features.join(", "),
      year: vehicle.year.toString(),
      licensePlate: vehicle.licensePlate,
    })
    setIsEditDialogOpen(true)
  }

  const VehicleForm = ({ onSubmit, isEdit = false }: { onSubmit: (e: React.FormEvent) => void; isEdit?: boolean }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Vehicle Name</Label>
          <Input
            id="name"
            placeholder="e.g., Toyota RAV4"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pricePerDay">Price per Day ($)</Label>
          <Input
            id="pricePerDay"
            type="number"
            placeholder="85"
            value={formData.pricePerDay}
            onChange={(e) => setFormData({ ...formData, pricePerDay: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="passengers">Passengers</Label>
          <Input
            id="passengers"
            type="number"
            placeholder="5"
            value={formData.passengers}
            onChange={(e) => setFormData({ ...formData, passengers: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            type="number"
            placeholder="2023"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="transmission">Transmission</Label>
          <Select
            value={formData.transmission}
            onValueChange={(value) => setFormData({ ...formData, transmission: value })}
          >
            <SelectTrigger>
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

        <div className="space-y-2">
          <Label htmlFor="fuel">Fuel Type</Label>
          <Select value={formData.fuel} onValueChange={(value) => setFormData({ ...formData, fuel: value })}>
            <SelectTrigger>
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

      <div className="space-y-2">
        <Label htmlFor="licensePlate">License Plate</Label>
        <Input
          id="licensePlate"
          placeholder="FJ-1234"
          value={formData.licensePlate}
          onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">Image URL</Label>
        <div className="flex gap-2">
          <Input
            id="image"
            placeholder="https://example.com/image.jpg or /local-image.png"
            value={formData.image}
            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
          />
          <Button type="button" variant="outline" size="sm">
            <Upload className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Brief description of the vehicle..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="features">Features (comma-separated)</Label>
        <Input
          id="features"
          placeholder="Air Conditioning, GPS, Bluetooth"
          value={formData.features}
          onChange={(e) => setFormData({ ...formData, features: e.target.value })}
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="available"
          checked={formData.available}
          onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
          className="rounded border-border"
        />
        <Label htmlFor="available">Available for booking</Label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="bg-primary hover:bg-primary/90">
          {isEdit ? "Update Vehicle" : "Add Vehicle"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (isEdit) {
              setIsEditDialogOpen(false)
              setEditingVehicle(null)
            } else {
              setIsAddDialogOpen(false)
            }
            resetForm()
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent via-primary/20 to-secondary/20">
      <nav className="sticky top-0 z-50 glass-effect-dark border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard" className="flex items-center space-x-3 group">
                <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Car className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-2xl font-bold text-white">Bakers Rentals</span>
                  <p className="text-white/80 text-sm">Vehicle Management</p>
                </div>
              </Link>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="btn-3d glass-effect-dark text-white border-white/20 hover:bg-white/10 bg-transparent"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <section className="py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-12">
            <div className="fade-in-up">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
                Vehicle Fleet Management
              </h1>
              <p className="text-white/80 text-xl">Manage your premium vehicle collection</p>
            </div>
            <div className="fade-in-up" style={{ animationDelay: "0.2s" }}>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-3d pulse-glow bg-white text-primary hover:bg-white/90 text-lg px-8 py-6 font-bold">
                    <Plus className="h-5 w-5 mr-2" />
                    Add New Vehicle
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-effect-dark border-white/20">
                  <DialogHeader>
                    <DialogTitle className="text-white text-2xl">Add New Vehicle</DialogTitle>
                  </DialogHeader>
                  <VehicleForm onSubmit={handleAddVehicle} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="fade-in-up" style={{ animationDelay: "0.4s" }}>
            <Card className="card-3d border-0 glass-effect-dark">
              <CardHeader>
                <CardTitle className="text-white text-2xl">Fleet Overview ({vehicles.length} vehicles)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className="text-white/80">Vehicle</TableHead>
                        <TableHead className="text-white/80">Category</TableHead>
                        <TableHead className="text-white/80">Price/Day</TableHead>
                        <TableHead className="text-white/80">Passengers</TableHead>
                        <TableHead className="text-white/80">Status</TableHead>
                        <TableHead className="text-white/80">License</TableHead>
                        <TableHead className="text-white/80">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicles.map((vehicle) => (
                        <TableRow key={vehicle.id} className="border-white/10 hover:bg-white/5">
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
                              {vehicle.category}
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

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-effect-dark border-white/20">
              <DialogHeader>
                <DialogTitle className="text-white text-2xl">Edit Vehicle</DialogTitle>
              </DialogHeader>
              <VehicleForm onSubmit={handleEditVehicle} isEdit />
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
