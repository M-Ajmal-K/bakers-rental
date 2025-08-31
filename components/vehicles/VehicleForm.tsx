"use client";

import { memo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import {
  categories,
  transmissionTypes,
  fuelTypes,
  FormState,
} from "./VehicleTypes";

const VehicleForm = memo(function VehicleForm({
  formData,
  setFormData,
  onSubmit,
  isEdit = false,
  onFilePicked,
}: {
  formData: FormState;
  setFormData: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: (e: React.FormEvent) => void;
  isEdit?: boolean;
  onFilePicked: (file: File | null) => void;
}) {
  const uploadRef = useRef<HTMLInputElement>(null);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-white text-sm sm:text-base">
            Vehicle Name
          </Label>
          <Input
            id="name"
            placeholder="e.g., Toyota RAV4"
            value={formData.name}
            onChange={(e) =>
              setFormData((s) => ({ ...s, name: e.target.value }))
            }
            required
            className="text-white placeholder:text-white/60 h-12 rounded-lg"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category" className="text-white text-sm sm:text-base">
            Category
          </Label>
          <Select
            value={formData.category}
            onValueChange={(value) =>
              setFormData((s) => ({ ...s, category: value }))
            }
          >
            <SelectTrigger className="text-white placeholder:text-white/60 h-12 rounded-lg">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="brand" className="text-white text-sm sm:text-base">
            Brand
          </Label>
          <Input
            id="brand"
            placeholder="e.g., Toyota"
            value={formData.brand}
            onChange={(e) =>
              setFormData((s) => ({ ...s, brand: e.target.value }))
            }
            required
            className="text-white placeholder:text-white/60 h-12 rounded-lg"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model" className="text-white text-sm sm:text-base">
            Model
          </Label>
          <Input
            id="model"
            placeholder="e.g., RAV4"
            value={formData.model}
            onChange={(e) =>
              setFormData((s) => ({ ...s, model: e.target.value }))
            }
            required
            className="text-white placeholder:text-white/60 h-12 rounded-lg"
          />
        </div>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label
            htmlFor="pricePerDay"
            className="text-white text-sm sm:text-base"
          >
            Price per Day ($)
          </Label>
          <Input
            id="pricePerDay"
            type="number"
            placeholder="85"
            value={formData.pricePerDay}
            onChange={(e) =>
              setFormData((s) => ({ ...s, pricePerDay: e.target.value }))
            }
            required
            className="text-white placeholder:text-white/60 h-12 rounded-lg"
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="passengers"
            className="text-white text-sm sm:text-base"
          >
            Passengers
          </Label>
          <Input
            id="passengers"
            type="number"
            placeholder="5"
            value={formData.passengers}
            onChange={(e) =>
              setFormData((s) => ({ ...s, passengers: e.target.value }))
            }
            required
            className="text-white placeholder:text-white/60 h-12 rounded-lg"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="year" className="text-white text-sm sm:text-base">
            Year
          </Label>
          <Input
            id="year"
            type="number"
            placeholder="2023"
            value={formData.year}
            onChange={(e) =>
              setFormData((s) => ({ ...s, year: e.target.value }))
            }
            required
            className="text-white placeholder:text-white/60 h-12 rounded-lg"
          />
        </div>
      </div>

      {/* Row 4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label
            htmlFor="transmission"
            className="text-white text-sm sm:text-base"
          >
            Transmission
          </Label>
          <Select
            value={formData.transmission}
            onValueChange={(value) =>
              setFormData((s) => ({ ...s, transmission: value }))
            }
          >
            <SelectTrigger className="text-white placeholder:text-white/60 h-12 rounded-lg">
              <SelectValue placeholder="Select transmission" />
            </SelectTrigger>
            <SelectContent>
              {transmissionTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fuel" className="text-white text-sm sm:text-base">
            Fuel Type
          </Label>
          <Select
            value={formData.fuel}
            onValueChange={(value) =>
              setFormData((s) => ({ ...s, fuel: value }))
            }
          >
            <SelectTrigger className="text-white placeholder:text-white/60 h-12 rounded-lg">
              <SelectValue placeholder="Select fuel type" />
            </SelectTrigger>
            <SelectContent>
              {fuelTypes.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* License Plate */}
      <div className="space-y-2">
        <Label
          htmlFor="licensePlate"
          className="text-white text-sm sm:text-base"
        >
          License Plate
        </Label>
        <Input
          id="licensePlate"
          placeholder="FJ-1234"
          value={formData.licensePlate}
          onChange={(e) =>
            setFormData((s) => ({ ...s, licensePlate: e.target.value }))
          }
          required
          className="text-white placeholder:text-white/60 h-12 rounded-lg"
        />
      </div>

      {/* Image upload */}
      <div className="space-y-2">
        <Label className="text-white text-sm sm:text-base">Vehicle Image</Label>
        <div className="flex gap-3 items-center">
          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            className="hidden"
            id="image-upload-input"
            onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 h-10 px-4"
            onClick={() => uploadRef.current?.click()}
            title="Upload image from your device"
          >
            <Upload className="h-4 w-4" />
          </Button>
          <span className="text-white/70 text-sm">
            PNG/JPG/WEBP up to 10MB
          </span>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-2">
        <Label htmlFor="features" className="text-white text-sm sm:text-base">
          Features (comma-separated)
        </Label>
        <Input
          id="features"
          placeholder="Air Conditioning, GPS, Bluetooth"
          value={formData.features}
          onChange={(e) =>
            setFormData((s) => ({ ...s, features: e.target.value }))
          }
          className="text-white placeholder:text-white/60 h-12 rounded-lg"
        />
      </div>

      {/* Availability */}
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="available"
          checked={formData.available}
          onChange={(e) =>
            setFormData((s) => ({ ...s, available: e.target.checked }))
          }
          className="rounded border-border w-4 h-4"
        />
        <Label htmlFor="available" className="text-white text-sm sm:text-base">
          Available for booking
        </Label>
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-2 sm:pt-6">
        <Button
          type="submit"
          className="bg-primary hover:bg-primary/90 h-11 px-6 text-sm sm:text-base rounded-lg"
        >
          {isEdit ? "Update Vehicle" : "Add Vehicle"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 px-6 text-sm sm:text-base rounded-lg"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
});

export default VehicleForm;
