"use client";

import { memo, useMemo, useRef, useState, useCallback } from "react";
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
import {
  Upload,
  Image as ImageIcon,
  Star,
  StarOff,
  ArrowUp,
  ArrowDown,
  Trash2,
  Loader2,
  X, // ← NEW: top-right remove icon
} from "lucide-react";
import {
  categories,
  transmissionTypes,
  fuelTypes,
  FormState,
} from "./VehicleTypes";
import { cn } from "@/lib/utils";

/** Fix TS2537: create a non-nullable element type for FormState["images"] */
type FormImage = NonNullable<FormState["images"]>[number];

const VehicleForm = memo(function VehicleForm({
  formData,
  setFormData,
  onSubmit,
  isEdit = false,
  // kept for backward compatibility; no-op now
  onFilePicked,
}: {
  formData: FormState;
  setFormData: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  isEdit?: boolean;
  onFilePicked?: (file: File | null) => void;
}) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* -------------------------- Image Helpers -------------------------- */

  const images = formData.images ?? [];

  const nextSortOrder = useMemo(() => {
    if (images.length === 0) return 0;
    const max = Math.max(
      ...images
        .filter((i) => !i.toDelete)
        .map((i) => (typeof i.sortOrder === "number" ? i.sortOrder! : 0))
    );
    return Number.isFinite(max) ? max + 1 : images.length;
  }, [images]);

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (submitting) return; // inert while submitting
      if (!files || files.length === 0) return;
      const newItems = Array.from(files).map((file, idx) => ({
        file,
        isPrimary:
          images.length === 0 && idx === 0 && !images.some((i) => i.isPrimary),
        sortOrder: nextSortOrder + idx,
      }));
      setFormData((s) => ({ ...s, images: [...(s.images ?? []), ...newItems] }));
    },
    [images, nextSortOrder, setFormData, submitting]
  );

  const setPrimary = useCallback(
    (index: number) => {
      if (submitting) return;
      setFormData((s) => {
        const arr = [...(s.images ?? [])];
        arr.forEach((img, i) => {
          if (!img.toDelete) img.isPrimary = i === index;
        });
        s.primaryImageId = arr[index]?.id; // if existing; harmless if undefined
        return { ...s, images: arr };
      });
    },
    [setFormData, submitting]
  );

  const move = useCallback(
    (index: number, dir: -1 | 1) => {
      if (submitting) return;
      setFormData((s) => {
        const arr = [...(s.images ?? [])].filter((i) => !i.toDelete);
        const target = arr[index];
        if (!target) return s;
        const swapIndex = index + dir;
        if (swapIndex < 0 || swapIndex >= arr.length) return s;

        // swap sortOrder values
        const tmp = arr[swapIndex].sortOrder ?? swapIndex;
        arr[swapIndex].sortOrder = target.sortOrder ?? index;
        arr[index].sortOrder = tmp;

        // reorder array for UI preview
        const reordered = [...(s.images ?? [])];
        const visIdxs = reordered
          .map((img, i) => (img.toDelete ? -1 : i))
          .filter((i) => i !== -1);
        const realA = visIdxs[index];
        const realB = visIdxs[swapIndex];
        const tmpItem = reordered[realA];
        reordered[realA] = reordered[realB];
        reordered[realB] = tmpItem;

        return { ...s, images: reordered };
      });
    },
    [setFormData, submitting]
  );

  const removeAt = useCallback(
    (index: number) => {
      if (submitting) return;
      setFormData((s) => {
        const arr = [...(s.images ?? [])];
        const item = arr[index];
        if (!item) return s;

        if (item.id) {
          // existing image -> soft-delete flag
          arr[index] = { ...item, toDelete: true, isPrimary: false };
        } else {
          // newly added (no id yet) -> drop it
          arr.splice(index, 1);
        }

        // ensure at least one primary remains if any images left
        if (!arr.some((i) => i.isPrimary && !i.toDelete)) {
          const first = arr.find((i) => !i.toDelete);
          if (first) first.isPrimary = true;
        }

        return { ...s, images: arr };
      });
    },
    [setFormData, submitting]
  );

  /** Use non-nullable element type to avoid TS2537 */
  const previewFor = (img: FormImage) => {
    if (img?.file) return URL.createObjectURL(img.file);
    if (img?.url) return img.url;
    return undefined;
  };

  const visibleImages = images.filter((i) => !i.toDelete);

  /* -------------------------- Submit Wrapper -------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(e);
      // parent typically closes the dialog on success; if not, we still re-enable here
    } finally {
      setSubmitting(false);
    }
  };

  /* -------------------------- Render -------------------------- */

  return (
    <form onSubmit={handleSubmit} className="relative">
      {/* Busy overlay */}
      {submitting && (
        <div className="absolute inset-0 z-20 rounded-xl bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-3 text-white font-medium px-4 py-2 rounded-lg bg-black/40 ring-1 ring-white/10">
            <Loader2 className="h-5 w-5 animate-spin" />
            Uploading vehicle… please wait
          </div>
        </div>
      )}

      {/* Wrap everything in a disabled fieldset to prevent edits while submitting */}
      <fieldset disabled={submitting} className="space-y-6">
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
              onChange={(e) => setFormData((s) => ({ ...s, name: e.target.value }))}
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
              onChange={(e) => setFormData((s) => ({ ...s, brand: e.target.value }))}
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
              onChange={(e) => setFormData((s) => ({ ...s, model: e.target.value }))}
              required
              className="text-white placeholder:text-white/60 h-12 rounded-lg"
            />
          </div>
        </div>

        {/* Row 3: Base + Tiered pricing + seats/year */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="pricePerDay" className="text-white text-sm sm:text-base">
              Price per Day ($)
            </Label>
            <Input
              id="pricePerDay"
              type="number"
              placeholder="85"
              value={formData.pricePerDay}
              onChange={(e) => setFormData((s) => ({ ...s, pricePerDay: e.target.value }))}
              required
              className="text-white placeholder:text-white/60 h-12 rounded-lg"
            />
            <p className="text-[11px] text-white/60">
              Applies to days 1–4 (and whenever tiers are not set)
            </p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="pricePerDay5Plus"
              className="text-white text-sm sm:text-base"
            >
              Price per Day – 5-7 days ($)
            </Label>
            <Input
              id="pricePerDay5Plus"
              type="number"
              placeholder="e.g., 80"
              value={formData.pricePerDay5Plus ?? ""}
              onChange={(e) =>
                setFormData((s) => ({ ...s, pricePerDay5Plus: e.target.value }))
              }
              className="text-white placeholder:text-white/60 h-12 rounded-lg"
            />
            <p className="text-[11px] text-white/60">
              Optional. Applies from day 5 through day 7.
            </p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="pricePerDay8Plus"
              className="text-white text-sm sm:text-base"
            >
              Price per Day – 8+ days ($)
            </Label>
            <Input
              id="pricePerDay8Plus"
              type="number"
              placeholder="e.g., 75"
              value={formData.pricePerDay8Plus ?? ""}
              onChange={(e) =>
                setFormData((s) => ({ ...s, pricePerDay8Plus: e.target.value }))
              }
              className="text-white placeholder:text-white/60 h-12 rounded-lg"
            />
            <p className="text-[11px] text-white/60">Optional. Applies from day 8 onward.</p>
          </div>
        </div>

        {/* Row 4 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="passengers" className="text-white text-sm sm:text-base">
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
              onChange={(e) => setFormData((s) => ({ ...s, year: e.target.value }))}
              required
              className="text-white placeholder:text-white/60 h-12 rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transmission" className="text-white text-sm sm:text-base">
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
        </div>

        {/* Row 5 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="fuel" className="text-white text-sm sm:text-base">
              Fuel Type
            </Label>
            <Select
              value={formData.fuel}
              onValueChange={(value) => setFormData((s) => ({ ...s, fuel: value }))}
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

          {/* License Plate */}
          <div className="space-y-2">
            <Label htmlFor="licensePlate" className="text-white text-sm sm:text-base">
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
        </div>

        {/* ---------------------- Multi-Image Gallery ---------------------- */}
        <div className="space-y-3">
          <Label className="text-white text-sm sm:text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Vehicle Photos (primary + gallery)
          </Label>

          {/* Dropzone + Picker */}
          <div
            className={cn(
              "rounded-xl border border-white/20 bg-black/20 p-4 flex flex-col items-center justify-center text-center",
              "transition-colors",
              isDragging ? "border-primary/60 bg-primary/10" : "",
              submitting ? "opacity-70 pointer-events-none" : ""
            )}
            onDragOver={(e) => {
              if (submitting) return;
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              if (submitting) return;
              e.preventDefault();
              setIsDragging(false);
              addFiles(e.dataTransfer.files);
            }}
          >
            <input
              ref={uploadRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              id="image-upload-input"
              onChange={(e) => addFiles(e.target.files)}
              disabled={submitting}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 px-4"
              onClick={() => uploadRef.current?.click()}
              title="Upload images from your device"
              disabled={submitting}
            >
              <Upload className="h-4 w-4 mr-2" />
              Add images
            </Button>
            <p className="text-white/70 text-xs mt-2">
              PNG/JPG/WEBP up to 10MB each. Tip: drag &amp; drop multiple files here.
            </p>
          </div>

          {/* Thumbnails */}
          {images.filter((i) => !i.toDelete).length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images
                .filter((i) => !i.toDelete)
                .map((img, idx) => {
                  const preview = previewFor(img);
                  const isPrimary = !!img.isPrimary;

                  // find actual index in full array (including deleted)
                  const actualIndex = (formData.images ?? []).findIndex((x) => x === img);

                  return (
                    <div
                      key={actualIndex}
                      className={cn(
                        "relative group rounded-lg overflow-hidden border",
                        isPrimary ? "border-primary" : "border-white/15"
                      )}
                    >
                      {/* NEW: top-right remove "X" */}
                      <button
                        type="button"
                        title="Remove image"
                        aria-label="Remove image"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeAt(actualIndex);
                        }}
                        className="absolute top-1.5 right-1.5 z-10 inline-flex items-center justify-center
                                   h-7 w-7 rounded-full bg-black/60 hover:bg-black/80
                                   ring-1 ring-white/20 text-white transition"
                        disabled={submitting}
                      >
                        <X className="h-4 w-4" />
                      </button>

                      <div className="aspect-video bg-black/30">
                        {preview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={preview} alt="Vehicle" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/60">
                            No preview
                          </div>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-100">
                        <div className="flex items-center justify-between gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={isPrimary ? "default" : "secondary"}
                            className={cn("h-7 px-2 text-xs", isPrimary ? "bg-primary" : "bg-white/20")}
                            onClick={() => setPrimary(actualIndex)}
                            title={isPrimary ? "Primary image" : "Set as primary"}
                            disabled={submitting}
                          >
                            {isPrimary ? (
                              <>
                                <Star className="h-3.5 w-3.5 mr-1" /> Primary
                              </>
                            ) : (
                              <>
                                <StarOff className="h-3.5 w-3.5 mr-1" /> Make primary
                              </>
                            )}
                          </Button>

                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="secondary"
                              className="h-7 w-7 bg-white/20"
                              onClick={() => move(idx, -1)}
                              disabled={idx === 0 || submitting}
                              title="Move left"
                            >
                              <ArrowUp className="h-3.5 w-3.5 rotate-90" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="secondary"
                              className="h-7 w-7 bg-white/20"
                              onClick={() => move(idx, 1)}
                              disabled={idx === images.filter((i) => !i.toDelete).length - 1 || submitting}
                              title="Move right"
                            >
                              <ArrowDown className="h-3.5 w-3.5 -rotate-90" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              className="h-7 w-7"
                              onClick={() => removeAt(actualIndex)}
                              title="Remove image"
                              disabled={submitting}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-white/60 text-sm">
              No images yet. Add at least one and mark a primary photo.
            </p>
          )}
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
            onChange={(e) => setFormData((s) => ({ ...s, features: e.target.value }))}
            className="text-white placeholder:text-white/60 h-12 rounded-lg"
          />
        </div>

        {/* Availability */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="available"
            checked={formData.available}
            onChange={(e) => setFormData((s) => ({ ...s, available: e.target.checked }))}
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
            disabled={submitting}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {isEdit ? "Saving…" : "Uploading…"}
              </span>
            ) : (
              <>{isEdit ? "Update Vehicle" : "Add Vehicle"}</>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 px-6 text-sm sm:text-base rounded-lg"
            disabled={submitting}
          >
            Cancel
          </Button>
        </div>
      </fieldset>
    </form>
  );
});

export default VehicleForm;
