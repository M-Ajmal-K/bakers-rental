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
        <div className="text-center fade-in-up animate">
          <div className="relative mb-8">
            <div className="w-32 h-32 gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <CheckCircle className="h-16 w-16 text-white" />
            </div>
            <div className="absolute -top-4 -right-4">
              <Sparkles className="h-8 w-8 text-secondary animate-pulse" />
            </div>
            <div className="absolute -bottom-4 -left-4">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" style={{ animationDelay: "0.5s" }} />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">Booking Confirmed!</h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-md mx-auto">
            Your vehicle reservation has been successfully confirmed. You will receive a confirmation email shortly.
          </p>
          <Button asChild className="btn-3d bg-primary hover:bg-primary/90 text-lg px-8 py-6">
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
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center space-x-2 group">
                <Car className="h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
                <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Bakers Rentals
                </span>
              </Link>
            </div>
          </div>
        </nav>

        <section className="py-20 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="fade-in-up">
              <Card className="card-3d border-0 bg-gradient-to-br from-card to-card/50">
                <CardHeader className="text-center pb-8">
                  <div className="w-20 h-20 gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-10 w-10 text-white" />
                  </div>
                  <CardTitle className="text-3xl text-foreground mb-4">Booking Summary</CardTitle>
                  <p className="text-muted-foreground text-lg">Please review your booking details carefully</p>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="border-0 bg-gradient-to-br from-primary/5 to-primary/10">
                      <CardContent className="p-6">
                        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                          <Car className="h-5 w-5 text-primary" />
                          Vehicle Details
                        </h3>
                        <div className="space-y-3">
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
                      <CardContent className="p-6">
                        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                          <CalendarIcon className="h-5 w-5 text-secondary" />
                          Rental Period
                        </h3>
                        <div className="space-y-3">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="border-0 bg-gradient-to-br from-accent/5 to-accent/10">
                      <CardContent className="p-6">
                        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-accent" />
                          Locations
                        </h3>
                        <div className="space-y-3">
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
                      <CardContent className="p-6">
                        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                          <User className="h-5 w-5 text-primary" />
                          Customer Details
                        </h3>
                        <div className="space-y-3">
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
                      <CardContent className="p-6">
                        <h3 className="font-bold text-foreground mb-3">Special Notes</h3>
                        <p className="text-muted-foreground italic">{customerInfo.notes}</p>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="border-0 bg-gradient-to-r from-primary to-secondary">
                    <CardContent className="p-6 text-center">
                      <div className="flex justify-between items-center text-2xl font-bold text-white mb-2">
                        <span>Total Amount:</span>
                        <span>${calculateTotal()}</span>
                      </div>
                      <p className="text-white/80">
                        ({calculateDays()} day{calculateDays() !== 1 ? "s" : ""} × ${selectedVehicleData?.pricePerDay})
                      </p>
                    </CardContent>
                  </Card>

                  <div className="flex gap-4 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowSummary(false)}
                      className="flex-1 btn-3d border-primary/20 hover:bg-primary/10 text-lg py-6"
                    >
                      <Edit className="h-5 w-5 mr-2" />
                      Edit Booking
                    </Button>
                    <Button
                      onClick={handleConfirmBooking}
                      className="flex-1 btn-3d pulse-glow bg-primary hover:bg-primary/90 text-lg py-6 font-bold"
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
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
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2 group">
              <Car className="h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
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
            <Button asChild className="btn-3d bg-secondary hover:bg-secondary/90">
              <Link href="/admin">Admin</Link>
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-90" />
        <div className="absolute inset-0 bg-black/20" />

        {/* Floating animation elements */}
        <div
          className="absolute top-10 left-10 w-16 h-16 bg-white/10 rounded-full blur-xl animate-bounce"
          style={{ animationDelay: "0s", animationDuration: "3s" }}
        />
        <div
          className="absolute top-20 right-20 w-12 h-12 bg-white/10 rounded-full blur-xl animate-bounce"
          style={{ animationDelay: "1s", animationDuration: "4s" }}
        />

        <div className="relative z-10 container mx-auto max-w-4xl">
          <div className="fade-in-up text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-2xl">Book Your Perfect Ride</h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto drop-shadow-lg">
              Fill in the details below to reserve your ideal vehicle for exploring Fiji
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gradient-to-b from-background to-muted/10">
        <div className="container mx-auto max-w-6xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="fade-in-up" style={{ animationDelay: "0.1s" }}>
                  <Card className="card-3d border-0 bg-gradient-to-br from-card to-card/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-2xl">
                        <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center">
                          <CalendarIcon className="h-5 w-5 text-white" />
                        </div>
                        Rental Dates
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="pickup-date" className="text-base font-medium">
                            Pickup Date
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal h-12 btn-3d",
                                  !pickupDate && "text-muted-foreground",
                                )}
                              >
                                <CalendarIcon className="mr-3 h-5 w-5" />
                                {pickupDate ? format(pickupDate, "PPP") : "Select pickup date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
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

                        <div className="space-y-3">
                          <Label htmlFor="return-date" className="text-base font-medium">
                            Return Date
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal h-12 btn-3d",
                                  !returnDate && "text-muted-foreground",
                                )}
                              >
                                <CalendarIcon className="mr-3 h-5 w-5" />
                                {returnDate ? format(returnDate, "PPP") : "Select return date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
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
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-2xl">
                        <div className="w-10 h-10 gradient-secondary rounded-full flex items-center justify-center">
                          <Car className="h-5 w-5 text-white" />
                        </div>
                        Vehicle Selection
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <Label htmlFor="vehicle" className="text-base font-medium">
                          Choose Your Perfect Vehicle
                        </Label>
                        <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                          <SelectTrigger className="h-12 btn-3d">
                            <SelectValue placeholder="Select a vehicle from our premium fleet" />
                          </SelectTrigger>
                          <SelectContent>
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
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-2xl">
                        <div className="w-10 h-10 gradient-accent rounded-full flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-white" />
                        </div>
                        Pickup & Drop-off Locations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="pickup-location" className="text-base font-medium">
                            Pickup Location
                          </Label>
                          <Select value={pickupLocation} onValueChange={setPickupLocation}>
                            <SelectTrigger className="h-12 btn-3d">
                              <SelectValue placeholder="Select pickup location" />
                            </SelectTrigger>
                            <SelectContent>
                              {locations.map((location) => (
                                <SelectItem key={location} value={location}>
                                  {location}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="dropoff-location" className="text-base font-medium">
                            Drop-off Location
                          </Label>
                          <Select value={dropoffLocation} onValueChange={setDropoffLocation}>
                            <SelectTrigger className="h-12 btn-3d">
                              <SelectValue placeholder="Select drop-off location" />
                            </SelectTrigger>
                            <SelectContent>
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
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-2xl">
                        <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        Customer Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="name" className="text-base font-medium">
                            Full Name
                          </Label>
                          <Input
                            id="name"
                            placeholder="Enter your full name"
                            value={customerInfo.name}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                            required
                            className="h-12 btn-3d"
                          />
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="phone" className="text-base font-medium">
                            Phone Number
                          </Label>
                          <Input
                            id="phone"
                            placeholder="+679 123 4567"
                            value={customerInfo.phone}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                            required
                            className="h-12 btn-3d"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="email" className="text-base font-medium">
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your.email@example.com"
                          value={customerInfo.email}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                          required
                          className="h-12 btn-3d"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="notes" className="text-base font-medium">
                          Special Requests (Optional)
                        </Label>
                        <Textarea
                          id="notes"
                          placeholder="Any special requests or notes for your rental..."
                          value={customerInfo.notes}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                          rows={4}
                          className="btn-3d resize-none"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="fade-in-up" style={{ animationDelay: "0.5s" }}>
                  <Card className="card-3d sticky top-24 border-0 bg-gradient-to-br from-primary/5 to-secondary/5">
                    <CardHeader>
                      <CardTitle className="text-2xl text-center">Booking Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {selectedVehicleData ? (
                        <>
                          <div className="text-center">
                            <h4 className="text-xl font-bold text-foreground">{selectedVehicleData.name}</h4>
                            <p className="text-muted-foreground font-medium">{selectedVehicleData.category}</p>
                          </div>

                          <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-card/50 rounded-lg">
                              <span className="text-muted-foreground">Daily Rate:</span>
                              <span className="font-bold text-primary">${selectedVehicleData.pricePerDay}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-card/50 rounded-lg">
                              <span className="text-muted-foreground">Duration:</span>
                              <span className="font-bold">
                                {calculateDays()} day{calculateDays() !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-4 gradient-primary rounded-lg text-white">
                              <span className="text-lg font-bold">Total:</span>
                              <span className="text-2xl font-bold">${calculateTotal()}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">Select a vehicle to see pricing details</p>
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="w-full btn-3d pulse-glow bg-primary hover:bg-primary/90 text-lg py-6 font-bold"
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

      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        <div className="glass-effect-dark border-t border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="text-white">
              {selectedVehicleData && (
                <>
                  <p className="font-bold">${calculateTotal()}</p>
                  <p className="text-sm text-white/80">
                    {calculateDays()} day{calculateDays() !== 1 ? "s" : ""}
                  </p>
                </>
              )}
            </div>
            <Button
              type="submit"
              form="booking-form"
              className="btn-3d bg-white text-primary hover:bg-white/90 font-bold px-8"
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
