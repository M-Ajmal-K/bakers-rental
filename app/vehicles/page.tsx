"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Car, Users, Fuel, Calendar, Filter, Eye, Phone } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

// Mock vehicle data
const vehicles = [
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
    nextAvailable: null,
    features: ["Air Conditioning", "GPS", "Bluetooth"],
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
    nextAvailable: "2024-08-25",
    features: ["Air Conditioning", "GPS", "USB Charging", "Extra Storage"],
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
    nextAvailable: null,
    features: ["4WD", "Air Conditioning", "GPS", "Roof Rails"],
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
    nextAvailable: null,
    features: ["Air Conditioning", "Large Cargo Space", "Sliding Doors"],
  },
  {
    id: 5,
    name: "Suzuki Swift",
    category: "Compact",
    image: "/suzuki-swift-city.png",
    pricePerDay: 55,
    passengers: 4,
    transmission: "Manual",
    fuel: "Petrol",
    available: false,
    nextAvailable: "2024-08-23",
    features: ["Air Conditioning", "Bluetooth", "Fuel Efficient"],
  },
  {
    id: 6,
    name: "Ford Ranger",
    category: "Pickup",
    image: "/ford-ranger-offroad.png",
    pricePerDay: 95,
    passengers: 5,
    transmission: "Automatic",
    fuel: "Diesel",
    available: true,
    nextAvailable: null,
    features: ["4WD", "Tow Bar", "Air Conditioning", "GPS"],
  },
  {
    id: 7,
    name: "Hyundai Tucson",
    category: "SUV",
    image: "/placeholder-8o725.png",
    pricePerDay: 80,
    passengers: 5,
    transmission: "Automatic",
    fuel: "Petrol",
    available: false,
    nextAvailable: "2024-08-26",
    features: ["Air Conditioning", "GPS", "Bluetooth", "Reverse Camera"],
  },
  {
    id: 8,
    name: "Toyota Corolla",
    category: "Compact",
    image: "/toyota-corolla-sedan-reliable.png",
    pricePerDay: 60,
    passengers: 5,
    transmission: "Automatic",
    fuel: "Petrol",
    available: true,
    nextAvailable: null,
    features: ["Air Conditioning", "Bluetooth", "Fuel Efficient", "GPS"],
  },
]

const categories = ["All", "SUV", "Van", "Compact", "Pickup"]

export default function VehiclesPage() {
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [showFilters, setShowFilters] = useState(false)

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

  const filteredVehicles = vehicles.filter(
    (vehicle) => selectedCategory === "All" || vehicle.category === selectedCategory,
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
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
              <Link href="/vehicles" className="text-primary font-medium scale-105">
                Vehicles
              </Link>
              <Link
                href="/booking"
                className="text-foreground hover:text-primary transition-all duration-300 hover:scale-105"
              >
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

        <div className="relative z-10 container mx-auto max-w-6xl">
          <div className="fade-in-up text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-2xl">Our Premium Fleet</h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto drop-shadow-lg">
              Choose from our diverse range of well-maintained vehicles perfect for exploring Fiji in style
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden btn-3d glass-effect text-white border-white/30 hover:bg-white/10"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <div className={`flex flex-wrap gap-3 ${showFilters ? "block" : "hidden md:flex"}`}>
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className={
                      selectedCategory === category
                        ? "btn-3d bg-white text-primary hover:bg-white/90 font-bold"
                        : "btn-3d glass-effect text-white border-white/30 hover:bg-white/10"
                    }
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
            <div className="glass-effect px-4 py-2 rounded-lg">
              <p className="text-white/90 font-medium">
                {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? "s" : ""} available
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gradient-to-b from-background to-muted/10">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredVehicles.map((vehicle, index) => (
              <div key={vehicle.id} className="fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <Card className="card-3d tilt-3d overflow-hidden border-0 bg-gradient-to-br from-card to-card/50 group">
                  <div className="relative overflow-hidden">
                    <Image
                      src={vehicle.image || "/placeholder.svg"}
                      alt={vehicle.name}
                      width={300}
                      height={200}
                      className="w-full h-52 object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="absolute top-4 left-4">
                      <Badge className="glass-effect-dark text-white border-white/20 font-medium">
                        {vehicle.category}
                      </Badge>
                    </div>
                    <div className="absolute top-4 right-4">
                      {vehicle.available ? (
                        <Badge className="bg-green-500 hover:bg-green-500 text-white font-bold pulse-glow">
                          Available Now
                        </Badge>
                      ) : (
                        <Badge className="bg-secondary hover:bg-secondary text-white font-medium">
                          Available {formatDate(vehicle.nextAvailable!)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                        {vehicle.name}
                      </h3>
                      <div className="text-right">
                        <p className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                          ${vehicle.pricePerDay}
                        </p>
                        <p className="text-sm text-muted-foreground font-medium">per day</p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">{vehicle.passengers} passengers</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                        <div className="w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center">
                          <Fuel className="h-4 w-4 text-secondary" />
                        </div>
                        <span className="font-medium">{vehicle.fuel}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                        <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                          <Car className="h-4 w-4 text-accent" />
                        </div>
                        <span className="font-medium">{vehicle.transmission}</span>
                      </div>
                      {!vehicle.available && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="w-8 h-8 bg-destructive/10 rounded-full flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-destructive" />
                          </div>
                          <span className="font-medium">Next: {formatDate(vehicle.nextAvailable!)}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-bold text-foreground mb-3">Premium Features:</p>
                      <div className="flex flex-wrap gap-2">
                        {vehicle.features.slice(0, 3).map((feature, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs font-medium border-primary/20 hover:bg-primary/10 transition-colors"
                          >
                            {feature}
                          </Badge>
                        ))}
                        {vehicle.features.length > 3 && (
                          <Badge
                            variant="outline"
                            className="text-xs font-medium border-secondary/20 hover:bg-secondary/10 transition-colors"
                          >
                            +{vehicle.features.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        asChild
                        className="flex-1 btn-3d bg-primary hover:bg-primary/90 font-bold text-lg py-6"
                        disabled={!vehicle.available}
                      >
                        <Link href={`/booking?vehicle=${vehicle.id}`}>
                          {vehicle.available ? "Book Now" : "Reserve"}
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        className="btn-3d px-6 py-6 border-primary/20 hover:bg-primary/10 bg-transparent"
                      >
                        <Eye className="h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {filteredVehicles.length === 0 && (
            <div className="text-center py-20 fade-in-up">
              <div className="w-24 h-24 gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <Car className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">No vehicles found</h3>
              <p className="text-muted-foreground mb-8 text-lg">Try adjusting your filters to see more options</p>
              <Button
                onClick={() => setSelectedCategory("All")}
                className="btn-3d bg-primary hover:bg-primary/90 px-8 py-6 text-lg"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 gradient-secondary opacity-90" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 container mx-auto text-center max-w-4xl">
          <div className="fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 drop-shadow-lg">Need Help Choosing?</h2>
            <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto drop-shadow-md">
              Our expert team is here to help you find the perfect vehicle for your Fiji adventure
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button
                asChild
                size="lg"
                className="btn-3d bg-white text-primary hover:bg-white/90 text-xl px-10 py-8 font-bold"
              >
                <Link href="/contact">
                  <Phone className="h-5 w-5 mr-2" />
                  Contact Us
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="btn-3d glass-effect text-white border-white/30 hover:bg-white/10 text-xl px-10 py-8 bg-transparent"
              >
                <Link href="/booking">Start Booking</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
