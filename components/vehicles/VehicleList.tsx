"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Users, Fuel, Car } from "lucide-react";
import Image from "next/image";
import { Vehicle } from "./VehicleTypes";

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

  return (
    <section className="py-8 px-3 sm:px-6">
      <div className="container mx-auto max-w-7xl">
        {vehicles.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Car className="h-10 w-10 text-gray-800" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No vehicles found</h3>
            <p className="text-gray-500 text-base">Start by adding your first vehicle.</p>
          </div>
        ) : (
          <div
            className="
              grid gap-5 sm:gap-6 lg:gap-7
              grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
              items-stretch
            "
          >
            {vehicles.map((vehicle) => (
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
                {/* Image: fixed aspect so all cards match height */}
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={vehicle.image || "/placeholder.svg"}
                    alt={vehicle.name}
                    fill
                    className="
                      absolute inset-0 h-full w-full object-cover
                      transition-transform duration-500
                      group-hover:scale-[1.04]
                    "
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />

                  {/* Badges */}
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
                </div>

                {/* Title + price */}
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
                      <p className="text-[11px] text-gray-500 font-medium">per day</p>
                    </div>
                  </div>
                </CardHeader>

                {/* Content area is capped to keep all cards equal height */}
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

                  {/* Features (single-row to preserve height) */}
                  <div className="mt-3">
                    <p className="text-xs sm:text-sm font-bold text-gray-900 mb-2">Premium Features:</p>
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
                        <span className="text-gray-400 text-xs">No features listed</span>
                      )}
                    </div>
                  </div>

                  {/* Actions pinned to bottom for perfect alignment */}
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
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
