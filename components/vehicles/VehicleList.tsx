"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
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
    <>
      {/* Mobile list */}
      <div className="space-y-3 sm:hidden">
        {vehicles.map((vehicle) => (
          <Card key={keyFor(vehicle)} className="glass-effect-dark border-white/10">
            <CardContent className="p-3">
              <div className="flex gap-3">
                <div className="relative w-24 h-16">
                  <Image
                    src={vehicle.image || "/placeholder.svg"}
                    alt={vehicle.name}
                    fill
                    className="rounded object-cover"
                  />
                </div>
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

                  {/* Details grid */}
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
                      <span className="opacity-80">Fuel: </span>
                      <span className="font-medium">{vehicle.fuel || "—"}</span>
                    </div>
                    <div className="rounded bg-white/5 px-2 py-1">
                      <span className="opacity-80">Price/day: </span>
                      <span className="font-medium">${vehicle.pricePerDay}</span>
                    </div>
                    <div className="rounded bg-white/5 px-2 py-1 col-span-2">
                      <span className="opacity-80">Features: </span>
                      <span className="font-medium">
                        {vehicle.features && vehicle.features.length > 0
                          ? vehicle.features.join(", ")
                          : "—"}
                      </span>
                    </div>
                    <div className="rounded bg-white/5 px-2 py-1">
                      <span className="opacity-80">Plate: </span>
                      <span className="font-mono">{vehicle.licensePlate}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(vehicle)}
                      className="btn-3d glass-effect-dark text-white border-white/20 hover:bg-white/10 h-8 px-3"
                    >
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(vehicle.id)}
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
      <div className="hidden sm:block">
        <Card className="card-3d border-0 glass-effect-dark">
          <CardHeader>
            <CardTitle className="text-white text-2xl">
              Fleet Overview ({vehicles.length} vehicles)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-white/80 whitespace-nowrap">Vehicle</TableHead>
                    <TableHead className="text-white/80 whitespace-nowrap">Category</TableHead>
                    <TableHead className="text-white/80 whitespace-nowrap">Transmission</TableHead>
                    <TableHead className="text-white/80 whitespace-nowrap">Fuel</TableHead>
                    <TableHead className="text-white/80 whitespace-nowrap">Price/Day</TableHead>
                    <TableHead className="text-white/80 whitespace-nowrap">Passengers</TableHead>
                    <TableHead className="text-white/80 whitespace-nowrap">Features</TableHead>
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
                          <div className="relative w-[50px] h-[40px]">
                            <Image
                              src={vehicle.image || "/placeholder.svg"}
                              alt={vehicle.name}
                              fill
                              className="rounded object-cover"
                            />
                          </div>
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
                      <TableCell className="text-white/80">{vehicle.transmission || "—"}</TableCell>
                      <TableCell className="text-white/80">{vehicle.fuel || "—"}</TableCell>
                      <TableCell className="font-medium text-white">${vehicle.pricePerDay}</TableCell>
                      <TableCell className="text-white/80">{vehicle.passengers}</TableCell>
                      <TableCell className="text-white/80">
                        {vehicle.features && vehicle.features.length > 0
                          ? vehicle.features.join(", ")
                          : "—"}
                      </TableCell>
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
                      <TableCell className="font-mono text-sm text-white/80">
                        {vehicle.licensePlate}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(vehicle)}
                            className="btn-3d glass-effect-dark text-white border-white/20 hover:bg-white/10"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDelete(vehicle.id)}
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
    </>
  );
}
