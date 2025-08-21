"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Car, MapPin, Star, Truck, Zap, Users, Phone, Mail, LocateIcon as LocationIcon } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    const handleVisibility = () => {
      const elements = document.querySelectorAll(".fade-in-up")
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight - 100) {
          el.classList.add("animate")
        }
      })
    }

    window.addEventListener("scroll", handleScroll)
    window.addEventListener("scroll", handleVisibility)
    handleVisibility() // Check on mount

    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("scroll", handleVisibility)
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 glass-effect border-b border-border/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Car className="h-8 w-8 text-primary animate-pulse" />
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Bakers Rentals
              </span>
            </div>
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

      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 animated-gradient opacity-90"
          style={{
            transform: `translateY(${scrollY * 0.5}px)`,
          }}
        />
        <div className="absolute inset-0 bg-black/20" />

        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
          style={{
            backgroundImage: "url('/hilux-sand-dunes.png')",
            transform: `translateY(${scrollY * 0.3}px)`,
          }}
        />

        {/* Floating elements for visual interest */}
        <div
          className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-bounce"
          style={{ animationDelay: "0s", animationDuration: "3s" }}
        />
        <div
          className="absolute top-40 right-20 w-16 h-16 bg-white/10 rounded-full blur-xl animate-bounce"
          style={{ animationDelay: "1s", animationDuration: "4s" }}
        />
        <div
          className="absolute bottom-40 left-20 w-24 h-24 bg-white/10 rounded-full blur-xl animate-bounce"
          style={{ animationDelay: "2s", animationDuration: "5s" }}
        />

        <div className="relative z-10 container mx-auto text-center max-w-4xl px-4">
          <div className="fade-in-up">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 drop-shadow-2xl">Bakers Rentals</h1>
            <p className="text-2xl md:text-3xl text-white/90 mb-8 font-medium drop-shadow-lg">Drive Fiji in Style</p>
            <p className="text-lg md:text-xl text-white/80 mb-12 max-w-2xl mx-auto drop-shadow-md">
              Explore the beautiful islands of Fiji with our premium vehicle rental service. From luxury SUVs to
              spacious vans, we have the perfect ride for your adventure.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button
                asChild
                size="lg"
                className="btn-3d pulse-glow bg-white text-primary hover:bg-white/90 text-xl px-12 py-8 font-bold"
              >
                <Link href="/vehicles">Book a Vehicle</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="btn-3d glass-effect text-white border-white/30 hover:bg-white/10 text-xl px-12 py-8 bg-transparent"
              >
                <Link href="/vehicles">View Fleet</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="fade-in-up text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">Why Choose Bakers Rentals?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience premium car rental service with unmatched quality and convenience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="fade-in-up" style={{ animationDelay: "0.1s" }}>
              <Card className="card-3d tilt-3d text-center p-8 h-full border-0 bg-gradient-to-br from-card to-card/50">
                <CardContent className="pt-6">
                  <div className="w-20 h-20 gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <MapPin className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">Islandwide Pickup</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Convenient pickup and drop-off locations across all major Fiji destinations
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="fade-in-up" style={{ animationDelay: "0.2s" }}>
              <Card className="card-3d tilt-3d text-center p-8 h-full border-0 bg-gradient-to-br from-card to-card/50">
                <CardContent className="pt-6">
                  <div className="w-20 h-20 gradient-secondary rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <Car className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">Wide Range of Vehicles</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    From compact cars to luxury SUVs and spacious vans for every adventure
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="fade-in-up" style={{ animationDelay: "0.3s" }}>
              <Card className="card-3d tilt-3d text-center p-8 h-full border-0 bg-gradient-to-br from-card to-card/50">
                <CardContent className="pt-6">
                  <div className="w-20 h-20 gradient-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <Star className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">Flexible Booking</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Easy online booking with flexible terms and 24/7 customer support
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="container mx-auto max-w-6xl">
          <div className="fade-in-up text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">Choose Your Perfect Ride</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover our premium fleet designed for every type of Fiji adventure
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="fade-in-up" style={{ animationDelay: "0.1s" }}>
              <Card className="card-3d group cursor-pointer border-0 overflow-hidden bg-gradient-to-br from-white to-gray-50">
                <CardContent className="p-8 text-center">
                  <div className="w-24 h-24 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Truck className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">SUVs</h3>
                  <p className="text-muted-foreground text-lg mb-6">Perfect for families and off-road adventures</p>
                  <Button className="btn-3d w-full bg-primary hover:bg-primary/90">View SUVs</Button>
                </CardContent>
              </Card>
            </div>

            <div className="fade-in-up" style={{ animationDelay: "0.2s" }}>
              <Card className="card-3d group cursor-pointer border-0 overflow-hidden bg-gradient-to-br from-white to-gray-50">
                <CardContent className="p-8 text-center">
                  <div className="w-24 h-24 gradient-secondary rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Zap className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">Hybrids</h3>
                  <p className="text-muted-foreground text-lg mb-6">Eco-friendly and fuel-efficient options</p>
                  <Button className="btn-3d w-full bg-secondary hover:bg-secondary/90">View Hybrids</Button>
                </CardContent>
              </Card>
            </div>

            <div className="fade-in-up" style={{ animationDelay: "0.3s" }}>
              <Card className="card-3d group cursor-pointer border-0 overflow-hidden bg-gradient-to-br from-white to-gray-50">
                <CardContent className="p-8 text-center">
                  <div className="w-24 h-24 gradient-accent rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">Vans</h3>
                  <p className="text-muted-foreground text-lg mb-6">Spacious vehicles for large groups</p>
                  <Button className="btn-3d w-full bg-accent hover:bg-accent/90 text-white">View Vans</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-90" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 container mx-auto text-center max-w-4xl">
          <div className="fade-in-up">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 drop-shadow-lg">
              Ready for Your Fiji Adventure?
            </h2>
            <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto drop-shadow-md">
              Book your perfect vehicle today and start exploring the paradise islands of Fiji with style and comfort
            </p>
            <Button
              asChild
              size="lg"
              className="btn-3d pulse-glow bg-white text-primary hover:bg-white/90 text-xl px-12 py-8 font-bold"
            >
              <Link href="/vehicles">Start Booking Now</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="bg-accent text-white py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="fade-in-up">
              <div className="flex items-center space-x-2 mb-6">
                <Car className="h-8 w-8 text-white" />
                <span className="text-2xl font-bold text-white">Bakers Rentals</span>
              </div>
              <p className="text-white/80 text-lg leading-relaxed">
                Your trusted partner for premium vehicle rentals in Fiji. Drive in style, explore in comfort.
              </p>
            </div>

            <div className="fade-in-up" style={{ animationDelay: "0.1s" }}>
              <h3 className="text-xl font-bold text-white mb-6">Quick Links</h3>
              <div className="space-y-3">
                <Link
                  href="/vehicles"
                  className="block text-white/80 hover:text-white transition-colors text-lg hover:translate-x-2 transform duration-300"
                >
                  Our Fleet
                </Link>
                <Link
                  href="/booking"
                  className="block text-white/80 hover:text-white transition-colors text-lg hover:translate-x-2 transform duration-300"
                >
                  Book Now
                </Link>
                <Link
                  href="/contact"
                  className="block text-white/80 hover:text-white transition-colors text-lg hover:translate-x-2 transform duration-300"
                >
                  Contact Us
                </Link>
              </div>
            </div>

            <div className="fade-in-up" style={{ animationDelay: "0.2s" }}>
              <h3 className="text-xl font-bold text-white mb-6">Contact Info</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-white/80">
                  <Phone className="h-5 w-5" />
                  <span className="text-lg">+679 123 4567</span>
                </div>
                <div className="flex items-center space-x-3 text-white/80">
                  <Mail className="h-5 w-5" />
                  <span className="text-lg">info@bakersrentals.fj</span>
                </div>
                <div className="flex items-center space-x-3 text-white/80">
                  <LocationIcon className="h-5 w-5" />
                  <span className="text-lg">Suva, Fiji</span>
                </div>

                {/* Small location map with business label */}
                <div className="pt-2">
                  <div className="w-full h-48 sm:h-56 md:h-64 rounded-xl overflow-hidden border border-white/20">
                    <iframe
                      title="Bakers Rentals Location"
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3116.161663853867!2d177.4852363!3d-18.1625008!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6e10a975790eaf95%3A0xc092707025335a!2sBakers%20Rental%20Cars!5e0!3m2!1sen!2sfj!4v1724080000000!5m2!1sen!2sfj"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                  <a
                    href="https://www.google.com/maps/place/Bakers+Rental+Cars/@-18.1625008,177.4852363,788m/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/80 underline text-sm block mt-2"
                  >
                    Open in Google Maps
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/20 mt-12 pt-8 text-center">
            <p className="text-white/60 text-lg">&copy; 2024 Bakers Rentals. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
