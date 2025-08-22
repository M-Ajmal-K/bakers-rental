"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Car, CalendarIcon, MapPin, User, CheckCircle, Sparkles, Edit } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

// Mock vehicle data (same as vehicles page)
const vehicles = [
  { id: 1, name: "Toyota RAV4", category: "SUV", pricePerDay: 85, available: true },
  { id: 2, name: "Honda Odyssey", category: "Van", pricePerDay: 120, available: false, nextAvailable: "2024-08-25" },
  { id: 3, name: "Nissan X-Trail", category: "SUV", pricePerDay: 90, available: true },
  { id: 4, name: "Toyota Hiace", category: "Van", pricePerDay: 110, available: true },
  { id: 5, name: "Suzuki Swift", category: "Compact", pricePerDay: 55, available: false, nextAvailable: "2024-08-23" },
  { id: 6, name: "Ford Ranger", category: "Pickup", pricePerDay: 95, available: true },
  { id: 7, name: "Hyundai Tucson", category: "SUV", pricePerDay: 80, available: false, nextAvailable: "2024-08-26" },
  { id: 8, name: "Toyota Corolla", category: "Compact", pricePerDay: 60, available: true },
]

const locations = [
  "Nadi Airport",
  "Suva City Center",
  "Denarau Island",
  "Coral Coast",
  "Pacific Harbour",
  "Lautoka",
  "Savusavu",
  "Labasa",
]

export default function BookingPage() {
  const searchParams = useSearchParams()
  const preselectedVehicle = searchParams.get("vehicle")

  const [pickupDate, setPickupDate] = useState<Date>()
  const [returnDate, setReturnDate] = useState<Date>()
  const [selectedVehicle, setSelectedVehicle] = useState(preselectedVehicle || "")
  const [pickupLocation, setPickupLocation] = useState("")
  const [dropoffLocation, setDropoffLocation] = useState("")
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
  })
  const [showSummary, setShowSummary] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    const handleVisibility = () => {
      const elements = document.querySelectorAll(".fade-in-up")
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight - 100) {
          el.classList.add("animate")
        }
      })
    }

    window.addEventListener("scroll", handleVisibility)
    handleVisibility() // Check on mount

    return () => {
      window.removeEventListener("scroll", handleVisibility)
    }
  }, [])

  const selectedVehicleData = vehicles.find((v) => v.id.toString() === selectedVehicle)
  const availableVehicles = vehicles.filter((v) => v.available)

  const calculateDays = () => {
    if (pickupDate && returnDate) {
      const diffTime = Math.abs(returnDate.getTime() - pickupDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays || 1
    }
    return 1
  }

  const calculateTotal = () => {
    if (selectedVehicleData) {
      return selectedVehicleData.pricePerDay * calculateDays()
    }
    return 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (
      pickupDate &&
      returnDate &&
      selectedVehicle &&
      pickupLocation &&
      dropoffLocation &&
      customerInfo.name &&
      customerInfo.phone &&
      customerInfo.email
    ) {
      setShowSummary(true)
    }
  }

  const handleConfirmBooking = () => {
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      setShowSummary(false)
      // Reset form or redirect
    }, 3000)
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center fade-in-up animate px-4">
          <div className="relative mb-6 md:mb-8">
            <div className="w-24 h-24 md:w-32 md:h-32 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 animate-bounce">
              <CheckCircle className="h-12 w-12 md:h-16 md:w-16 text-white" />
            </div>
            <div className="absolute -top-3 -right-3 md:-top-4 md:-right-4">
              <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-secondary animate-pulse" />
            </div>
            <div className="absolute -bottom-3 -left-3 md:-bottom-4 md:-left-4">
              <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-primary animate-pulse" style={{ animationDelay: "0.5s" }} />
            </div>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">Booking Confirmed!</h1>
          <p className="text-base md:text-xl text-muted-foreground mb-6 md:mb-8 max-w-md mx-auto">
            Your vehicle reservation has been successfully confirmed. You will receive a confirmation email shortly.
          </p>
          <Button asChild className="btn-3d bg-primary hover:bg-primary/90 text-base md:text-lg px-6 md:px-8 py-4 md:py-6">
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (showSummary) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="sticky top-0 z-50 glass-effect border-b border-border/20">
          <div className="container mx-auto px-4 py-3 md:py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center space-x-2 group">
                <Car className="h-7 w-7 md:h-8 md:w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
                <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Bakers Rentals
                </span>
              </Link>
            </div>
          </div>
        </nav>

        <section className="py-10 md:py-20 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="fade-in-up">
              <Card className="card-3d border-0 bg-gradient-to-br from-card to-card/50">
                <CardHeader className="text-center pb-6 md:pb-8">
                  <div className="w-16 h-16 md:w-20 md:h-20 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                    <CheckCircle className="h-8 w-8 md:h-10 md:w-10 text-white" />
                  </div>
                  <CardTitle className="text-2xl md:text-3xl text-foreground mb-2 md:mb-4">Booking Summary</CardTitle>
                  <p className="text-muted-foreground text-sm md:text-lg">Please review your booking details carefully</p>
                </CardHeader>
                <CardContent className="space-y-6 md:space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <Card className="border-0 bg-gradient-to-br from-primary/5 to-primary/10">
                      <CardContent className="p-4 md:p-6">
                        <h3 className="font-bold text-foreground mb-3 md:mb-4 flex items-center gap-2 text-base md:text-lg">
                          <Car className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                          Vehicle Details
                        </h3>
                        <div className="space-y-2 md:space-y-3 text-sm md:text-base">
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Vehicle:</span>
                            <span className="font-medium">{selectedVehicleData?.name}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Category:</span>
                            <span className="font-medium">{selectedVehicleData?.category}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Daily Rate:</span>
                            <span className="font-bold text-primary">${selectedVehicleData?.pricePerDay}</span>
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-0 bg-gradient-to-br from-secondary/5 to-secondary/10">
                      <CardContent className="p-4 md:p-6">
                        <h3 className="font-bold text-foreground mb-3 md:mb-4 flex items-center gap-2 text-base md:text-lg">
                          <CalendarIcon className="h-4 w-4 md:h-5 md:w-5 text-secondary" />
                          Rental Period
                        </h3>
                        <div className="space-y-2 md:space-y-3 text-sm md:text-base">
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Pickup:</span>
                            <span className="font-medium">{pickupDate && format(pickupDate, "PPP")}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Return:</span>
                            <span className="font-medium">{returnDate && format(returnDate, "PPP")}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="font-bold text-secondary">
                              {calculateDays()} day{calculateDays() !== 1 ? "s" : ""}
                            </span>
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <Card className="border-0 bg-gradient-to-br from-accent/5 to-accent/10">
                      <CardContent className="p-4 md:p-6">
                        <h3 className="font-bold text-foreground mb-3 md:mb-4 flex items-center gap-2 text-base md:text-lg">
                          <MapPin className="h-4 w-4 md:h-5 md:w-5 text-accent" />
                          Locations
                        </h3>
                        <div className="space-y-2 md:space-y-3 text-sm md:text-base">
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Pickup:</span>
                            <span className="font-medium">{pickupLocation}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Drop-off:</span>
                            <span className="font-medium">{dropoffLocation}</span>
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-0 bg-gradient-to-br from-primary/5 to-secondary/5">
                      <CardContent className="p-4 md:p-6">
                        <h3 className="font-bold text-foreground mb-3 md:mb-4 flex items-center gap-2 text-base md:text-lg">
                          <User className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                          Customer Details
                        </h3>
                        <div className="space-y-2 md:space-y-3 text-sm md:text-base">
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Name:</span>
                            <span className="font-medium">{customerInfo.name}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Phone:</span>
                            <span className="font-medium">{customerInfo.phone}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-medium">{customerInfo.email}</span>
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {customerInfo.notes && (
                    <Card className="border-0 bg-gradient-to-r from-muted/20 to-muted/10">
                      <CardContent className="p-4 md:p-6">
                        <h3 className="font-bold text-foreground mb-2 md:mb-3 text-base md:text-lg">Special Notes</h3>
                        <p className="text-muted-foreground italic text-sm md:text-base">{customerInfo.notes}</p>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="border-0 bg-gradient-to-r from-primary to-secondary">
                    <CardContent className="p-4 md:p-6 text-center">
                      <div className="flex justify-between items-center text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">
                        <span>Total Amount:</span>
                        <span>${calculateTotal()}</span>
                      </div>
                      <p className="text-white/80 text-xs md:text-base">
                        ({calculateDays()} day{calculateDays() !== 1 ? "s" : ""} × ${selectedVehicleData?.pricePerDay})
                      </p>
                    </CardContent>
                  </Card>

                  <div className="flex gap-3 md:gap-4 pt-2 md:pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowSummary(false)}
                      className="flex-1 btn-3d border-primary/20 hover:bg-primary/10 text-sm md:text-lg py-3 md:py-6"
                    >
                      <Edit className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                      Edit Booking
                    </Button>
                    <Button
                      onClick={handleConfirmBooking}
                      className="flex-1 btn-3d pulse-glow bg-primary hover:bg-primary/90 text-sm md:text-lg py-3 md:py-6 font-bold"
                    >
                      <CheckCircle className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                      Confirm Booking
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 glass-effect border-b border-border/20">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2 group">
              <Car className="h-7 w-7 md:h-8 md:w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
              <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Bakers Rentals
              </span>
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/" className="text-foreground hover:text-primary transition-all duration-300 hover:scale-105">
                Home
              </Link>
              <Link
                href="/vehicles"
                className="text-foreground hover:text-primary transition-all duration-300 hover:scale-105"
              >
                Vehicles
              </Link>
              <Link href="/booking" className="text-primary font-medium scale-105">
                Book Now
              </Link>
            </div>
            <Button asChild className="btn-3d bg-secondary hover:bg-secondary/90 px-3 py-2 md:px-4 md:py-2">
              <Link href="/admin">Admin</Link>
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative py-10 md:py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-90" />
        <div className="absolute inset-0 bg-black/20" />

        {/* Floating animation elements - hide on mobile */}
        <div
          className="hidden sm:block absolute top-10 left-10 w-16 h-16 bg-white/10 rounded-full blur-xl animate-bounce"
          style={{ animationDelay: "0s", animationDuration: "3s" }}
        />
        <div
          className="hidden sm:block absolute top-20 right-20 w-12 h-12 bg-white/10 rounded-full blur-xl animate-bounce"
          style={{ animationDelay: "1s", animationDuration: "4s" }}
        />

        <div className="relative z-10 container mx-auto max-w-3xl md:max-w-4xl">
          <div className="fade-in-up text-center">
            <h1 className="text-3xl md:text-6xl font-bold text-white mb-3 md:mb-6 drop-shadow-2xl">
              Book Your Perfect Ride
            </h1>
            <p className="text-base md:text-2xl text-white/90 mb-6 md:mb-8 max-w-2xl mx-auto drop-shadow-lg">
              Fill in the details below to reserve your ideal vehicle for exploring Fiji
            </p>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-20 px-4 bg-gradient-to-b from-background to-muted/10">
        <div className="container mx-auto max-w-3xl md:max-w-6xl">
          {/* id added so the bottom sticky submit works on mobile */}
          <form id="booking-form" onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              <div className="lg:col-span-2 space-y-6 md:space-y-8">
                <div className="fade-in-up" style={{ animationDelay: "0.1s" }}>
                  <Card className="card-3d border-0 bg-gradient-to-br from-card to-card/50">
                    <CardHeader className="pb-4 md:pb-6">
                      <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
                        <div className="w-9 h-9 md:w-10 md:h-10 gradient-primary rounded-full flex items-center justify-center">
                          <CalendarIcon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                        </div>
                        Rental Dates
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 md:space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                        <div className="space-y-2.5 md:space-y-3">
                          <Label htmlFor="pickup-date" className="text-sm md:text-base font-medium">
                            Pickup Date
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal h-11 md:h-12 btn-3d text-sm md:text-base",
                                  !pickupDate && "text-muted-foreground",
                                )}
                              >
                                <CalendarIcon className="mr-3 h-4 w-4 md:h-5 md:w-5" />
                                {pickupDate ? format(pickupDate, "PPP") : "Select pickup date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[calc(100vw-2rem)] sm:w-auto p-0"
                              align="start"
                              sideOffset={8}
                            >
                              <Calendar
                                mode="single"
                                selected={pickupDate}
                                onSelect={setPickupDate}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2.5 md:space-y-3">
                          <Label htmlFor="return-date" className="text-sm md:text-base font-medium">
                            Return Date
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal h-11 md:h-12 btn-3d text-sm md:text-base",
                                  !returnDate && "text-muted-foreground",
                                )}
                              >
                                <CalendarIcon className="mr-3 h-4 w-4 md:h-5 md:w-5" />
                                {returnDate ? format(returnDate, "PPP") : "Select return date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[calc(100vw-2rem)] sm:w-auto p-0"
                              align="start"
                              sideOffset={8}
                            >
                              <Calendar
                                mode="single"
                                selected={returnDate}
                                onSelect={setReturnDate}
                                disabled={(date) => date < (pickupDate || new Date())}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="fade-in-up" style={{ animationDelay: "0.2s" }}>
                  <Card className="card-3d border-0 bg-gradient-to-br from-card to-card/50">
                    <CardHeader className="pb-4 md:pb-6">
                      <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
                        <div className="w-9 h-9 md:w-10 md:h-10 gradient-secondary rounded-full flex items-center justify-center">
                          <Car className="h-4 w-4 md:h-5 md:w-5 text-white" />
                        </div>
                        Vehicle Selection
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 md:pt-2">
                      <div className="space-y-2.5 md:space-y-3">
                        <Label htmlFor="vehicle" className="text-sm md:text-base font-medium">
                          Choose Your Perfect Vehicle
                        </Label>
                        <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                          <SelectTrigger className="h-11 md:h-12 btn-3d text-sm md:text-base">
                            <SelectValue placeholder="Select a vehicle from our premium fleet" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[60vh]">
                            {availableVehicles.map((vehicle) => (
                              <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                                {vehicle.name} - {vehicle.category} (${vehicle.pricePerDay}/day)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="fade-in-up" style={{ animationDelay: "0.3s" }}>
                  <Card className="card-3d border-0 bg-gradient-to-br from-card to-card/50">
                    <CardHeader className="pb-4 md:pb-6">
                      <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
                        <div className="w-9 h-9 md:w-10 md:h-10 gradient-accent rounded-full flex items-center justify-center">
                          <MapPin className="h-4 w-4 md:h-5 md:w-5 text-white" />
                        </div>
                        Pickup & Drop-off Locations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 md:space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                        <div className="space-y-2.5 md:space-y-3">
                          <Label htmlFor="pickup-location" className="text-sm md:text-base font-medium">
                            Pickup Location
                          </Label>
                          <Select value={pickupLocation} onValueChange={setPickupLocation}>
                            <SelectTrigger className="h-11 md:h-12 btn-3d text-sm md:text-base">
                              <SelectValue placeholder="Select pickup location" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[60vh]">
                              {locations.map((location) => (
                                <SelectItem key={location} value={location}>
                                  {location}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2.5 md:space-y-3">
                          <Label htmlFor="dropoff-location" className="text-sm md:text-base font-medium">
                            Drop-off Location
                          </Label>
                          <Select value={dropoffLocation} onValueChange={setDropoffLocation}>
                            <SelectTrigger className="h-11 md:h-12 btn-3d text-sm md:text-base">
                              <SelectValue placeholder="Select drop-off location" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[60vh]">
                              {locations.map((location) => (
                                <SelectItem key={location} value={location}>
                                  {location}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="fade-in-up" style={{ animationDelay: "0.4s" }}>
                  <Card className="card-3d border-0 bg-gradient-to-br from-card to-card/50">
                    <CardHeader className="pb-4 md:pb-6">
                      <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
                        <div className="w-9 h-9 md:w-10 md:h-10 gradient-primary rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 md:h-5 md:w-5 text-white" />
                        </div>
                        Customer Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 md:space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                        <div className="space-y-2.5 md:space-y-3">
                          <Label htmlFor="name" className="text-sm md:text-base font-medium">
                            Full Name
                          </Label>
                          <Input
                            id="name"
                            placeholder="Enter your full name"
                            value={customerInfo.name}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                            required
                            className="h-11 md:h-12 btn-3d text-sm md:text-base"
                          />
                        </div>

                        <div className="space-y-2.5 md:space-y-3">
                          <Label htmlFor="phone" className="text-sm md:text-base font-medium">
                            Phone Number
                          </Label>
                          <Input
                            id="phone"
                            placeholder="+679 123 4567"
                            value={customerInfo.phone}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                            required
                            className="h-11 md:h-12 btn-3d text-sm md:text-base"
                          />
                        </div>
                      </div>

                      <div className="space-y-2.5 md:space-y-3">
                        <Label htmlFor="email" className="text-sm md:text-base font-medium">
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your.email@example.com"
                          value={customerInfo.email}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                          required
                          className="h-11 md:h-12 btn-3d text-sm md:text-base"
                        />
                      </div>

                      <div className="space-y-2.5 md:space-y-3">
                        <Label htmlFor="notes" className="text-sm md:text-base font-medium">
                          Special Requests (Optional)
                        </Label>
                        <Textarea
                          id="notes"
                          placeholder="Any special requests or notes for your rental..."
                          value={customerInfo.notes}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                          rows={4}
                          className="btn-3d resize-none text-sm md:text-base"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Summary column (stays below form on mobile) */}
              <div className="lg:col-span-1">
                <div className="fade-in-up" style={{ animationDelay: "0.5s" }}>
                  <Card className="card-3d lg:sticky lg:top-24 border-0 bg-gradient-to-br from-primary/5 to-secondary/5">
                    <CardHeader className="pb-4 md:pb-6">
                      <CardTitle className="text-xl md:text-2xl text-center">Booking Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 md:space-y-6">
                      {selectedVehicleData ? (
                        <>
                          <div className="text-center">
                            <h4 className="text-lg md:text-xl font-bold text-foreground">{selectedVehicleData.name}</h4>
                            <p className="text-muted-foreground font-medium text-sm md:text-base">
                              {selectedVehicleData.category}
                            </p>
                          </div>

                          <div className="space-y-3 md:space-y-4">
                            <div className="flex justify-between items-center p-3 bg-card/50 rounded-lg text-sm md:text-base">
                              <span className="text-muted-foreground">Daily Rate:</span>
                              <span className="font-bold text-primary">${selectedVehicleData.pricePerDay}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-card/50 rounded-lg text-sm md:text-base">
                              <span className="text-muted-foreground">Duration:</span>
                              <span className="font-bold">
                                {calculateDays()} day{calculateDays() !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-4 gradient-primary rounded-lg text-white">
                              <span className="text-base md:text-lg font-bold">Total:</span>
                              <span className="text-xl md:text-2xl font-bold">${calculateTotal()}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <Car className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
                          <p className="text-muted-foreground text-sm md:text-base">
                            Select a vehicle to see pricing details
                          </p>
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="w-full btn-3d pulse-glow bg-primary hover:bg-primary/90 text-sm md:text-lg py-3 md:py-6 font-bold"
                      >
                        Review Booking
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Mobile sticky footer submit */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        <div className="glass-effect-dark border-t border-white/10 p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div className="text-white">
              {selectedVehicleData && (
                <>
                  <p className="font-bold text-base md:text-lg">${calculateTotal()}</p>
                  <p className="text-xs md:text-sm text-white/80">
                    {calculateDays()} day{calculateDays() !== 1 ? "s" : ""}
                  </p>
                </>
              )}
            </div>
            <Button
              type="submit"
              form="booking-form"
              className="btn-3d bg-white text-primary hover:bg-white/90 font-bold px-5 md:px-8 py-2.5 md:py-3"
              disabled={!selectedVehicleData}
            >
              Review Booking
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
