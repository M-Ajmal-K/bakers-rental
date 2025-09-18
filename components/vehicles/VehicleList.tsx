"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Users, Fuel, Car, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { Vehicle } from "./VehicleTypes";
import { cn } from "@/lib/utils";

type Gallery = string[];

export default function VehicleList({
  vehicles,
  onEdit,
  onDelete,
}: {
  vehicles: Vehicle[];
  onEdit: (v: Vehicle) => void;
  onDelete: (id: string | number) => void;
}) {
  const keyFor = (v: Vehicle) =>
    typeof v.id === "string" ? v.id : `v-${v.id}-${v.licensePlate}`;

  // Per-card current slide index
  const [slideById, setSlideById] = useState<Record<string | number, number>>({});
  const setSlide = useCallback(
    (id: string | number, idx: number) =>
      setSlideById((s) => ({ ...s, [id]: idx })),
    []
  );

  // touch tracking per card
  const touchStartX = useRef<Record<string | number, number>>({});
  const touchDeltaX = useRef<Record<string | number, number>>({});

  const galleryFor = (v: Vehicle): Gallery => {
    // Prefer multi-images if present; otherwise use legacy single image
    if (Array.isArray(v.images) && v.images.length > 0) {
      // sort: primary first, then sortOrder asc (fallback 0)
      const sorted = [...v.images].sort((a, b) => {
        if ((b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0) !== 0) {
          return (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0);
        }
        const sa = typeof a.sortOrder === "number" ? a.sortOrder : 0;
        const sb = typeof b.sortOrder === "number" ? b.sortOrder : 0;
        return sa - sb;
      });
      const urls = sorted.map((img) => img.url || v.primaryImageUrl || v.image).filter(Boolean) as string[];
      if (urls.length > 0) return urls;
    }
    return [v.image ?? "/placeholder.svg"];
  };

  const next = (v: Vehicle) => {
    const gal = galleryFor(v);
    if (gal.length <= 1) return;
    const cur = slideById[v.id] ?? 0;
    setSlide(v.id, (cur + 1) % gal.length);
  };

  const prev = (v: Vehicle) => {
    const gal = galleryFor(v);
    if (gal.length <= 1) return;
    const cur = slideById[v.id] ?? 0;
    setSlide(v.id, (cur - 1 + gal.length) % gal.length);
  };

  const onTouchStart = (v: Vehicle) => (e: React.TouchEvent) => {
    touchStartX.current[v.id] = e.touches[0].clientX;
    touchDeltaX.current[v.id] = 0;
  };
  const onTouchMove = (v: Vehicle) => (e: React.TouchEvent) => {
    const start = touchStartX.current[v.id] ?? 0;
    touchDeltaX.current[v.id] = e.touches[0].clientX - start;
  };
  const onTouchEnd = (v: Vehicle) => () => {
    const delta = touchDeltaX.current[v.id] ?? 0;
    const threshold = 40; // px
    if (delta > threshold) prev(v);
    else if (delta < -threshold) next(v);
    touchStartX.current[v.id] = 0;
    touchDeltaX.current[v.id] = 0;
  };

  return (
    <section className="py-8 px-3 sm:px-6">
      <div className="container mx-auto max-w-7xl">
        {vehicles.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Car className="h-10 w-10 text-gray-800" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              No vehicles found
            </h3>
            <p className="text-gray-500 text-base">
              Start by adding your first vehicle.
            </p>
          </div>
        ) : (
          <div
            className="
              grid gap-5 sm:gap-6 lg:gap-7
              grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
              items-stretch
            "
          >
            {vehicles.map((vehicle) => {
              const gallery = galleryFor(vehicle);
              const active = slideById[vehicle.id] ?? 0;
              const activeIdx = Math.min(Math.max(active, 0), gallery.length - 1);
              const canSlide = gallery.length > 1;

              return (
                <Card
                  key={keyFor(vehicle)}
                  className="
                    group relative h-full overflow-hidden
                    rounded-2xl border border-gray-200 bg-white
                    shadow-sm transition-all duration-300
                    hover:shadow-2xl motion-safe:hover:-translate-y-1
                    flex flex-col
                  "
                >
                  {/* Image / Carousel */}
                  <div
                    className="relative aspect-[16/10] overflow-hidden select-none"
                    onTouchStart={onTouchStart(vehicle)}
                    onTouchMove={onTouchMove(vehicle)}
                    onTouchEnd={onTouchEnd(vehicle)}
                  >
                    {/* Slides */}
                    <div
                      className="absolute inset-0 h-full w-full"
                      // Using translateX for simple slider
                      style={{
                        transform: `translateX(-${activeIdx * 100}%)`,
                        transition: "transform 400ms ease",
                        display: "flex",
                        width: `${gallery.length * 100}%`,
                      }}
                    >
                      {gallery.map((url, i) => (
                        <div key={i} className="relative h-full w-full flex-shrink-0">
                          <Image
                            src={url}
                            alt={`${vehicle.name} - ${i + 1}`}
                            fill
                            className="
                              absolute inset-0 h-full w-full object-cover
                              transition-transform duration-500
                              group-hover:scale-[1.04]
                            "
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Category & availability badges */}
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-gray-900 text-white text-[11px] sm:text-xs font-medium px-2 py-0.5 rounded-full">
                        {vehicle.category || "—"}
                      </Badge>
                    </div>
                    <div className="absolute top-2 right-2">
                      {vehicle.available ? (
                        <Badge className="bg-green-500 text-white text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-full">
                          Available
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500 text-white text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-full">
                          Unavailable
                        </Badge>
                      )}
                    </div>

                    {/* Arrows */}
                    {canSlide && (
                      <>
                        <button
                          type="button"
                          className={cn(
                            "absolute left-2 top-1/2 -translate-y-1/2",
                            "h-8 w-8 rounded-full bg-black/50 text-white grid place-items-center",
                            "opacity-0 group-hover:opacity-100 transition-opacity"
                          )}
                          onClick={() => prev(vehicle)}
                          aria-label="Previous image"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2",
                            "h-8 w-8 rounded-full bg-black/50 text-white grid place-items-center",
                            "opacity-0 group-hover:opacity-100 transition-opacity"
                          )}
                          onClick={() => next(vehicle)}
                          aria-label="Next image"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </>
                    )}

                    {/* Dots */}
                    {canSlide && (
                      <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5">
                        {gallery.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            aria-label={`Go to slide ${i + 1}`}
                            className={cn(
                              "h-1.5 rounded-full transition-all",
                              i === activeIdx ? "w-4 bg-white" : "w-2 bg-white/60"
                            )}
                            onClick={() => setSlide(vehicle.id, i)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Title + Price */}
                  <CardHeader className="pb-2 sm:pb-3 px-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3
                        title={vehicle.name}
                        className="text-[15px] sm:text-base font-bold text-gray-900 truncate"
                      >
                        {vehicle.name}
                      </h3>
                      <div className="text-right shrink-0">
                        <p className="text-lg sm:text-xl font-extrabold text-green-700">
                          ${vehicle.pricePerDay}
                        </p>
                        <p className="text-[11px] text-gray-500 font-medium">
                          per day
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Content */}
                  <CardContent className="px-4 pt-0 pb-4 flex-1 flex flex-col justify-between">
                    {/* Quick facts */}
                    <div className="grid grid-cols-2 gap-3 text-[12px] sm:text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="h-4 w-4 text-primary" />
                        <span>{vehicle.passengers} seats</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Fuel className="h-4 w-4 text-secondary" />
                        <span>{vehicle.fuel || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Car className="h-4 w-4 text-accent" />
                        <span>{vehicle.transmission || "—"}</span>
                      </div>
                    </div>

                    {/* Features (single row) */}
                    <div className="mt-3">
                      <p className="text-xs sm:text-sm font-bold text-gray-900 mb-2">
                        Premium Features:
                      </p>
                      <div className="flex flex-wrap gap-2 min-h-[30px]">
                        {vehicle.features && vehicle.features.length > 0 ? (
                          <>
                            {vehicle.features.slice(0, 2).map((feature, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-[11px] sm:text-xs font-medium border-gray-300 text-gray-700 px-2 py-0.5 rounded-full"
                              >
                                {feature}
                              </Badge>
                            ))}
                            {vehicle.features.length > 2 && (
                              <Badge
                                variant="outline"
                                className="text-[11px] sm:text-xs font-medium border-gray-300 text-gray-700 px-2 py-0.5 rounded-full"
                              >
                                +{vehicle.features.length - 2} more
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs">
                            No features listed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Admin actions */}
                    <div className="mt-4 flex gap-2 sm:gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(vehicle)}
                        className="flex-1 text-gray-700 border-gray-300 hover:bg-gray-100 text-xs sm:text-sm"
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(vehicle.id)}
                        className="flex-1 text-red-600 border-red-300 hover:bg-red-50 text-xs sm:text-sm"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
