"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  Users,
  Fuel,
  Filter,
  Eye,
  Phone,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { supabase, STORAGE_BUCKET } from "@/lib/supabaseClient";
import { Vehicle } from "@/components/vehicles/VehicleTypes";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const categories = ["All", "SUV", "Van", "Compact", "Pickup", "Luxury"];
const availabilityFilters = ["All", "Available", "Unavailable"] as const;
type AvailabilityFilter = (typeof availabilityFilters)[number];

type ImagesByVehicle = Record<string, string[]>;

/* Convert DB path -> public URL.
   Our images.path is usually "vehicle-photos/<key>", but getPublicUrl()
   expects a key RELATIVE to the bucket. */
const publicUrlForPath = (path: string) => {
  const prefix = `${STORAGE_BUCKET}/`;
  const key = path.startsWith(prefix) ? path.slice(prefix.length) : path;
  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(key).data.publicUrl;
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [imagesByVehicle, setImagesByVehicle] = useState<ImagesByVehicle>({});
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedAvailability, setSelectedAvailability] =
    useState<AvailabilityFilter>("All");
  const [showFilters, setShowFilters] = useState(false);

  /* Lightbox */
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeVehicleId, setActiveVehicleId] = useState<string | number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeImages = useMemo(() => {
    if (activeVehicleId == null) return [];
    return imagesByVehicle[String(activeVehicleId)] ?? [];
  }, [activeVehicleId, imagesByVehicle]);

  const openLightbox = useCallback((vehicleId: string | number, startIndex = 0) => {
    setActiveVehicleId(vehicleId);
    setActiveIndex(startIndex);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setActiveVehicleId(null);
    setActiveIndex(0);
  }, []);

  const nextImage = useCallback(() => {
    setActiveIndex((i) =>
      activeImages.length ? (i + 1) % activeImages.length : 0
    );
  }, [activeImages.length]);

  const prevImage = useCallback(() => {
    setActiveIndex((i) =>
      activeImages.length ? (i - 1 + activeImages.length) % activeImages.length : 0
    );
  }, [activeImages.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, nextImage, prevImage, closeLightbox]);

  /* ---------------- Load vehicles + override availability for today's bookings ---------------- */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // 1) Load vehicles (public) as before
      const { data, error } = await supabase
        .from("vehicles")
        .select(
          `id, registration_number, title, brand, model, year, rental_price,
           image_path, public_url, available, category, passengers, transmission, fuel, features, created_at`
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[VehiclesPage] fetch error:", error);
        if (!cancelled) setVehicles([]);
        return;
      }
      if (cancelled) return;

      // 2) Resolve images + map to UI model
      const baseMapped: Vehicle[] =
        (data || []).map((v: any) => {
          let img: string | null = v.public_url ?? null;
          if (!img && v.image_path) {
            img = publicUrlForPath(v.image_path);
          }

          return {
            id: v.id,
            name: v.title,
            brand: v.brand ?? "",
            model: v.model ?? "",
            year: Number(v.year ?? 0),
            pricePerDay: Number(v.rental_price ?? 0),
            licensePlate: v.registration_number ?? "",
            available: Boolean(v.available), // will override below
            image: img,
            imagePath: v.image_path ?? null,
            category: v.category ?? "",
            passengers: Number(v.passengers ?? 0),
            transmission: v.transmission ?? "",
            fuel: v.fuel ?? "",
            features: Array.isArray(v.features) ? v.features : [],
          } as Vehicle;
        }) || [];

      if (baseMapped.length === 0) {
        if (!cancelled) setVehicles([]);
        return;
      }

      // 3) Determine "booked today" using server API (service role) to bypass RLS
      const todayStr = format(new Date(), "yyyy-MM-dd");

      const checks = await Promise.all(
        baseMapped.map(async (v) => {
          try {
            const res = await fetch(
              `/api/availability/${v.id}?includePending=1`,
              { cache: "no-store" }
            );
            const json = await res.json().catch(() => ({}));
            const ranges: Array<{ start: string; end: string }> = json?.ranges || [];

            // Unavailable today if any range covers today's date
            const bookedToday = ranges.some(
              (r) => (r.start as string) <= todayStr && todayStr <= (r.end as string)
            );

            return { id: v.id, bookedToday };
          } catch (e) {
            console.warn("[VehiclesPage] availability check failed for", v.id, e);
            return { id: v.id, bookedToday: false };
          }
        })
      );

      const unavailableSet = new Set(
        checks.filter((c) => c.bookedToday).map((c) => String(c.id))
      );

      // 4) Override availability if booked today
      const mapped = baseMapped.map((v) => ({
        ...v,
        available: v.available && !unavailableSet.has(String(v.id)),
      }));

      // 5) Fetch gallery images (non-blocking for card render; swallow RLS issues)
      let grouped: ImagesByVehicle = {};
      try {
        const ids = mapped.map((v) => v.id);
        if (ids.length) {
          const { data: imgs, error: imgErr } = await supabase
            .from("images")
            .select("vehicle_id, path, is_primary, sort_order, created_at")
            .in("vehicle_id", ids)
            .order("is_primary", { ascending: false })
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true });

          if (imgErr) {
            console.warn("[VehiclesPage] images fetch error:", imgErr.message);
          } else {
            grouped = (imgs || []).reduce((acc: ImagesByVehicle, row: any) => {
              const vid = String(row.vehicle_id);
              const url = publicUrlForPath(row.path);
              if (!acc[vid]) acc[vid] = [];
              acc[vid].push(url);
              return acc;
            }, {});
          }
        }
      } catch (e: any) {
        console.warn("[VehiclesPage] images fetch failed:", e?.message || e);
      }

      if (!cancelled) {
        setVehicles(mapped);
        setImagesByVehicle(grouped);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------- Animation on scroll ---------------- */
  useEffect(() => {
    const handleVisibility = () => {
      const elements = document.querySelectorAll(".fade-in-up");
      elements.forEach((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
          el.classList.add("animate");
        }
      });
    };

    window.addEventListener("scroll", handleVisibility);
    handleVisibility();

    return () => {
      window.removeEventListener("scroll", handleVisibility);
    };
  }, []);

  /* ---------------- Filtering ---------------- */
  const filteredVehicles = vehicles
    .filter(
      (v) => selectedCategory === "All" || v.category === selectedCategory
    )
    .filter((v) =>
      selectedAvailability === "All"
        ? true
        : selectedAvailability === "Available"
        ? v.available
        : !v.available
    );

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
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
              <Link
                href="/"
                className="text-foreground hover:text-primary transition-all duration-300 hover:scale-105"
              >
                Home
              </Link>
              <Link
                href="/vehicles"
                className="text-primary font-medium scale-105"
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

      {/* Hero Section */}
      <section className="relative py-16 sm:py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-90" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 container mx-auto max-w-6xl">
          <div className="text-center mb-8 sm:mb-12 fade-in-up">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white mb-4 sm:mb-6 drop-shadow-2xl">
              Our Premium Fleet
            </h1>
            <p className="text-base sm:text-xl md:text-2xl text-white/90 mb-6 sm:mb-8 max-w-3xl mx-auto drop-shadow-lg">
              Choose from our diverse range of well-maintained vehicles perfect
              for exploring Fiji in style
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center justify-between">
            <div className="flex flex-col gap-3 w-full">
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
              </div>

              {/* Mobile/desktop: Categories row */}
              <div className={`w-full ${showFilters ? "block" : "hidden md:block"}`}>
                <div className="flex gap-3 overflow-x-auto whitespace-nowrap py-1 -mx-1 px-1">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={
                        selectedCategory === category ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className={
                        selectedCategory === category
                          ? "btn-3d bg-white text-primary hover:bg-white/90 font-bold whitespace-nowrap"
                          : "btn-3d glass-effect text-white border-white/30 hover:bg-white/10 whitespace-nowrap"
                      }
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Mobile/desktop: Availability row */}
              <div className={`w-full ${showFilters ? "block" : "hidden md:block"}`}>
                <div className="flex gap-3 overflow-x-auto whitespace-nowrap py-1 -mx-1 px-1">
                  {availabilityFilters.map((a) => (
                    <Button
                      key={a}
                      variant={selectedAvailability === a ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedAvailability(a)}
                      className={
                        selectedAvailability === a
                          ? "btn-3d bg-white text-primary hover:bg-white/90 font-bold whitespace-nowrap"
                          : "btn-3d glass-effect text-white border-white/30 hover:bg-white/10 whitespace-nowrap"
                      }
                    >
                      {a}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="hidden sm:block glass-effect px-4 py-2 rounded-lg">
              <p className="text-white/90 font-medium">
                {filteredVehicles.length} vehicle
                {filteredVehicles.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Vehicle Cards */}
      <section className="py-12 sm:py-20 px-4 bg-gradient-to-b from-background to-muted/10">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredVehicles.map((vehicle: Vehicle, index: number) => {
              const gallery = imagesByVehicle[String(vehicle.id)] ?? [];
              const thumbs = gallery.slice(0, 4);
              return (
                <div
                  key={vehicle.id}
                  className="fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Card className="card-3d tilt-3d overflow-hidden border-0 bg-gradient-to-br from-card to-card/50 group">
                    <div className="relative overflow-hidden">
                      <Image
                        src={vehicle.image || "/placeholder.svg"}
                        alt={vehicle.name}
                        width={300}
                        height={200}
                        className="w-full h-40 sm:h-52 object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <div className="absolute top-3 sm:top-4 left-3 sm:left-4">
                        <Badge className="glass-effect-dark text-white border-white/20 font-medium">
                          {vehicle.category || "—"}
                        </Badge>
                      </div>

                      <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                        {vehicle.available ? (
                          <Badge className="bg-green-600 hover:bg-green-600 text-white font-bold pulse-glow">
                            Available Now
                          </Badge>
                        ) : (
                          <Badge className="bg-red-600 hover:bg-red-600 text-white font-bold ring-2 ring-red-300/40 shadow-md">
                            Unavailable
                          </Badge>
                        )}
                      </div>

                      {/* Thumbnail strip (only if more than one image) */}
                      {thumbs.length > 1 && (
                        <div className="absolute bottom-2 left-2 right-2 flex gap-2 justify-end">
                          {thumbs.map((u, i) => (
                            <button
                              key={i}
                              className="relative w-10 h-10 rounded-md overflow-hidden ring-1 ring-white/30 bg-black/30 hover:ring-white transition"
                              onClick={() => openLightbox(vehicle.id, i)}
                              aria-label={`View image ${i + 1} of ${vehicle.name}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={u} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <CardHeader className="pb-3 sm:pb-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg sm:text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                          {vehicle.name}
                        </h3>
                        <div className="text-right">
                          <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            ${vehicle.pricePerDay}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                            per day
                          </p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0 space-y-4 sm:space-y-6">
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">
                            {vehicle.passengers} passengers
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-secondary/10 rounded-full flex items-center justify-center">
                            <Fuel className="h-4 w-4 text-secondary" />
                          </div>
                          <span className="font-medium">{vehicle.fuel}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-accent/10 rounded-full flex items-center justify-center">
                            <Car className="h-4 w-4 text-accent" />
                          </div>
                          <span className="font-medium">{vehicle.transmission}</span>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs sm:text-sm font-bold text-foreground mb-2 sm:mb-3">
                          Premium Features:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {vehicle.features.slice(0, 3).map(
                            (feature: string, index: number) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-[10px] sm:text-xs font-medium border-primary/20 hover:bg-primary/10 transition-colors"
                              >
                                {feature}
                              </Badge>
                            )
                          )}
                          {vehicle.features.length > 3 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] sm:text-xs font-medium border-secondary/20 hover:bg-secondary/10 transition-colors"
                            >
                              +{vehicle.features.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3 pt-1 sm:pt-2">
                        <Button
                          asChild
                          className="flex-1 btn-3d bg-primary hover:bg-primary/90 font-bold text-base sm:text-lg py-4 sm:py-6"
                          disabled={!vehicle.available}
                        >
                          <Link href={`/booking?vehicle=${vehicle.id}`}>
                            {vehicle.available ? "Book Now" : "Reserve"}
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          className="btn-3d px-4 sm:px-6 py-4 sm:py-6 border-primary/20 hover:bg-primary/10 bg-transparent"
                          onClick={() => openLightbox(vehicle.id, 0)}
                          disabled={(imagesByVehicle[String(vehicle.id)]?.length ?? 0) === 0}
                          title="View photos"
                        >
                          <Eye className="h-5 w-5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          {filteredVehicles.length === 0 && (
            <div className="text-center py-20 fade-in-up">
              <div className="w-24 h-24 gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <Car className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">
                No vehicles found
              </h3>
              <p className="text-muted-foreground mb-8 text-lg">
                Try adjusting your filters to see more options
              </p>
              <Button
                onClick={() => {
                  setSelectedCategory("All");
                  setSelectedAvailability("All");
                }}
                className="btn-3d bg-primary hover:bg-primary/90 px-8 py-6 text-lg"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Help Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 gradient-secondary opacity-90" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 container mx-auto text-center max-w-4xl">
          <div className="fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 drop-shadow-lg">
              Need Help Choosing?
            </h2>
            <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto drop-shadow-md">
              Our expert team is here to help you find the perfect vehicle for
              your Fiji adventure
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

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={(o) => (o ? setLightboxOpen(true) : closeLightbox())}>
        <DialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="max-w-4xl w-[95vw] bg-black/80 border border-white/10 p-0"
        >
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="text-white">Gallery</DialogTitle>
          </DialogHeader>

          <div className="relative mx-auto w-full aspect-[16/10]">
            {activeImages.length > 0 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeImages[activeIndex]}
                alt=""
                className="absolute inset-0 w-full h-full object-contain select-none"
                onClick={nextImage}
              />
            )}

            {activeImages.length > 1 && (
              <>
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 ring-1 ring-white/30"
                  onClick={prevImage}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 ring-1 ring-white/30"
                  onClick={nextImage}
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6 text-white" />
                </button>
              </>
            )}
          </div>

          {activeImages.length > 1 && (
            <div className="flex gap-2 px-4 pb-4 overflow-x-auto">
              {activeImages.map((u, i) => (
                <button
                  key={i}
                  className={`relative h-16 w-24 rounded-md overflow-hidden ring-2 ${
                    i === activeIndex ? "ring-primary" : "ring-white/20"
                  }`}
                  onClick={() => setActiveIndex(i)}
                  aria-label={`Go to image ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
