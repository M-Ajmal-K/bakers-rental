"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase, STORAGE_BUCKET } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Car, Plus, LogOut, AlertTriangle, Filter } from "lucide-react";

import VehicleForm from "./VehicleForm";
import VehicleList from "./VehicleList";
import { FormState, Vehicle } from "./VehicleTypes";
import { format } from "date-fns";

/* ---------------- Filters (mirror customer side) ---------------- */
const categories = ["All", "SUV", "Van", "Compact", "Pickup", "Luxury"];
const availabilityOptions = ["All", "Available", "Unavailable"] as const;
type AvailabilityFilter = (typeof availabilityOptions)[number];

/* ---------------- Helpers for images ---------------- */
type FormImage = NonNullable<FormState["images"]>[number];

const getPublicUrl = (path: string) => {
  const prefix = `${STORAGE_BUCKET}/`;
  const key = path.startsWith(prefix) ? path.slice(prefix.length) : path;
  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(key).data.publicUrl;
};

/** Request a signed upload token + storage path from our server */
async function getSignedUpload(file: File) {
  const res = await fetch("/api/admin/storage/signed-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
    }),
  });
  const json = await res.json().catch(() => ({} as any));
  if (!res.ok || !json?.ok || !json?.path || !json?.token) {
    throw new Error(json?.error || "Failed to get signed upload URL");
  }
  return { path: String(json.path), token: String(json.token) };
}

/** Upload a file using Supabase's signed upload token */
async function uploadToSupabaseSigned(path: string, token: string, file: File) {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .uploadToSignedUrl(path, token, file);
  if (error) throw error;
}

/** Upload a batch of new images and return their relative storage paths (same order) */
async function uploadNewImagesAndReturnPaths(newFiles: File[]) {
  const outputs: string[] = [];
  for (const f of newFiles) {
    const { path, token } = await getSignedUpload(f);
    await uploadToSupabaseSigned(path, token, f);
    outputs.push(path); // store relative key (e.g. "vehicles/uuid_name.jpg")
  }
  return outputs;
}

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // keep the extra tier prices separate so we don't have to touch Vehicle type
  const [tierById, setTierById] = useState<
    Record<string | number, { price5?: number | null; price8?: number | null }>
  >({});

  // Admin-side filters
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilter>("All");
  const [showFilters, setShowFilters] = useState(false); // mobile toggle

  const [formData, setFormData] = useState<FormState>({
    name: "",
    brand: "",
    model: "",
    year: "",
    pricePerDay: "",
    // new tier fields (string inputs)
    pricePerDay5Plus: "",
    pricePerDay8Plus: "",

    licensePlate: "",
    available: true,
    category: "",
    passengers: "",
    transmission: "",
    fuel: "",
    features: "",

    // gallery fields get populated by VehicleForm
    images: [],
    primaryImageId: undefined,
  });

  const router = useRouter();

  /* ---------------- Load vehicles + compute dynamic availability ---------------- */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!supabase) return;

      // 1) Load vehicles (include tier columns)
      const { data: vData, error: vErr } = await supabase
        .from("vehicles")
        .select(
          `
          id,
          registration_number,
          title,
          brand,
          model,
          year,
          rental_price,
          rental_price_5plus,
          rental_price_8plus,
          image_path,
          public_url,
          available,
          created_at,
          category,
          passengers,
          transmission,
          fuel,
          features
        `
        )
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (vErr) {
        console.error("[Vehicles] select error:", vErr);
        return;
      }
      const vehiclesRaw = vData || [];

      // 2) Fetch bookings that make a vehicle unavailable today
      const ids = vehiclesRaw.map((v: any) => v.id).filter(Boolean);
      let unavailSet = new Set<string>();

      if (ids.length > 0) {
        const todayLocal = format(new Date(), "yyyy-MM-dd");
        const { data: bData, error: bErr } = await supabase
          .from("bookings")
          .select("vehicle_id, start_date, end_date, status")
          .in("vehicle_id", ids)
          .in("status", ["confirmed", "CONFIRMED"]) // ← match both casings
          .lte("start_date", todayLocal)
          .gte("end_date", todayLocal);

        if (!cancelled) {
          if (bErr) {
            console.error("[Vehicles] bookings fetch error:", bErr);
          } else {
            for (const b of bData || []) {
              if (b?.vehicle_id) unavailSet.add(String(b.vehicle_id));
            }
          }
        }
      }

      // 3) Map to UI type and override availability if booked today
      if (cancelled) return;
      const mapped: Vehicle[] =
        vehiclesRaw.map((v: any) => ({
          id: v.id,
          name: v.title,
          brand: v.brand ?? "",
          model: v.model ?? "",
          year: Number(v.year ?? 0),
          pricePerDay: Number(v.rental_price ?? 0),
          licensePlate: v.registration_number ?? "",
          available: Boolean(v.available) && !unavailSet.has(String(v.id)),
          image: v.public_url ?? null,
          imagePath: v.image_path ?? null,
          category: v.category ?? "",
          passengers: Number(v.passengers ?? 0),
          transmission: v.transmission ?? "",
          fuel: v.fuel ?? "",
          features: Array.isArray(v.features)
            ? v.features
            : v.features
            ? String(v.features).split(",").map((f) => f.trim())
            : [],
        })) || [];

      // stash tier prices in a side map
      const tiers: Record<
        string | number,
        { price5?: number | null; price8?: number | null }
      > = {};
      for (const v of vehiclesRaw) {
        tiers[v.id] = {
          price5:
            v.rental_price_5plus == null ? null : Number(v.rental_price_5plus),
          price8:
            v.rental_price_8plus == null ? null : Number(v.rental_price_8plus),
        };
      }

      setTierById(tiers);
      setVehicles(mapped);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------- Derived: filtered list for admin view ---------------- */
  const filteredVehicles = vehicles.filter((v) => {
    const categoryOK =
      selectedCategory === "All" || v.category === selectedCategory;
    const availOK =
      availabilityFilter === "All"
        ? true
        : availabilityFilter === "Available"
        ? v.available
        : !v.available; // "Unavailable"
    return categoryOK && availOK;
  });

  /* ---------------- Fetch images for a vehicle when editing ---------------- */
  const fetchVehicleImages = useCallback(async (vehicleId: string | number) => {
    const { data, error } = await supabase
      .from("images")
      .select("id, path, is_primary, sort_order, created_at")
      .eq("vehicle_id", vehicleId)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[Images] fetch error:", error);
      return [] as FormImage[];
    }

    const list =
      (data || []).map((r) => ({
        id: String(r.id),
        path: r.path, // may include bucket prefix; getPublicUrl handles both
        url: r.path ? getPublicUrl(r.path) : undefined,
        isPrimary: !!r.is_primary,
        sortOrder: typeof r.sort_order === "number" ? r.sort_order : 0,
      })) ?? [];

    // Guarantee one primary (just in case)
    if (!list.some((i) => i.isPrimary) && list.length > 0) {
      list[0].isPrimary = true;
    }

    return list as FormImage[];
  }, []);

  /* ---------------- Helpers ---------------- */
  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      brand: "",
      model: "",
      year: "",
      pricePerDay: "",
      pricePerDay5Plus: "",
      pricePerDay8Plus: "",
      licensePlate: "",
      available: true,
      category: "",
      passengers: "",
      transmission: "",
      fuel: "",
      features: "",
      images: [],
      primaryImageId: undefined,
    });
  }, []);

  /* ---------------- Build JSON payload (no big files) ---------------- */
  const buildVehicleJson = (source: FormState, imagesPayload: any[]) => {
    return {
      registration_number: source.licensePlate,
      title: source.name,
      brand: source.brand,
      model: source.model,
      year: Number.parseInt(source.year || "0", 10) || 0,
      rental_price: Number.parseFloat(source.pricePerDay || "0") || 0,
      rental_price_5plus:
        source.pricePerDay5Plus !== "" && source.pricePerDay5Plus != null
          ? Number(source.pricePerDay5Plus)
          : null,
      rental_price_8plus:
        source.pricePerDay8Plus !== "" && source.pricePerDay8Plus != null
          ? Number(source.pricePerDay8Plus)
          : null,

      available: !!source.available,
      category: source.category || "",
      passengers: Number.parseInt(source.passengers || "0", 10) || 0,
      transmission: source.transmission || "",
      fuel: source.fuel || "",
      features: source.features
        ? source.features.split(",").map((f) => f.trim()).filter(Boolean)
        : [],

      // new images array understood by /api/admin/vehicles/create JSON branch
      images: imagesPayload, // [{ path, is_primary, sort_order }]
    };
  };

  /* ---------------- Add ---------------- */
  const handleAddVehicle = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!supabase) {
        alert("Supabase is not configured.");
        return;
      }

      const imgs = (formData.images ?? []).filter((i) => !i.toDelete);
      if (imgs.length === 0) {
        alert("Please add at least one photo for this vehicle.");
        return;
      }

      // 1) Upload any NEW files via signed-upload (direct-to-storage)
      const newFiles = imgs.filter((i) => i.file);
      let uploadedPaths: string[] = [];
      if (newFiles.length > 0) {
        try {
          uploadedPaths = await uploadNewImagesAndReturnPaths(
            newFiles.map((i) => i.file!) // all have file
          );
        } catch (err: any) {
          console.error("[Vehicles] signed upload failed:", err);
          alert(err?.message || "Image upload failed.");
          return;
        }
      }

      // 2) Build the images payload (use returned paths for new files)
      let newIdx = 0;
      const imagesPayload = imgs.map((img, idx) => {
        const path = img.file ? uploadedPaths[newIdx++] : (img.path || "");
        return {
          path, // relative key (e.g. "vehicles/uuid_name.jpg")
          is_primary: !!img.isPrimary,
          sort_order: typeof img.sortOrder === "number" ? img.sortOrder : idx,
        };
      });

      // Ensure there is exactly one primary
      if (!imagesPayload.some((p) => p.is_primary)) {
        imagesPayload[0].is_primary = true;
      }

      // 3) POST JSON to create endpoint (no multipart)
      const body = buildVehicleJson(formData, imagesPayload);

      const res = await fetch("/api/admin/vehicles/create", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({} as any));
      if (!res.ok || !json?.ok) {
        console.error("[Vehicles] insert error:", json);
        alert(json?.error || "Insert failed, check console for details");
        return;
      }

      const data = json.vehicle;

      const newVehicle: Vehicle = {
        id: data.id,
        name: data.title,
        brand: data.brand,
        model: data.model,
        year: Number(data.year ?? 0),
        pricePerDay: Number(data.rental_price ?? 0),
        licensePlate: data.registration_number ?? "",
        available: Boolean(data.available),
        image: data.public_url ?? null, // API sets to chosen primary
        imagePath: data.image_path ?? null,
        category: data.category ?? "",
        passengers: Number(data.passengers ?? 0),
        transmission: data.transmission ?? "",
        fuel: data.fuel ?? "",
        features: Array.isArray(data.features)
          ? data.features
          : data.features
          ? String(data.features).split(",").map((f) => f.trim())
          : [],
      };

      // keep tiers
      setTierById((m) => ({
        ...m,
        [data.id]: {
          price5:
            data.rental_price_5plus == null
              ? formData.pricePerDay5Plus
                ? Number(formData.pricePerDay5Plus)
                : null
              : Number(data.rental_price_5plus),
          price8:
            data.rental_price_8plus == null
              ? formData.pricePerDay8Plus
                ? Number(formData.pricePerDay8Plus)
                : null
              : Number(data.rental_price_8plus),
        },
      }));

      setVehicles((prev) => [newVehicle, ...prev]);
      setIsAddDialogOpen(false);
      resetForm();
    },
    [formData, resetForm]
  );

  /* ---------------- Edit (open dialog + hydrate images) ---------------- */
  const openEditDialog = async (v: Vehicle) => {
    setEditingVehicle(v);

    const tiers = tierById[v.id] || {};
    setFormData((s) => ({
      ...s,
      name: v.name,
      brand: v.brand,
      model: v.model,
      year: v.year.toString(),
      pricePerDay: v.pricePerDay.toString(),
      pricePerDay5Plus:
        tiers.price5 != null && !Number.isNaN(tiers.price5)
          ? String(tiers.price5)
          : "",
      pricePerDay8Plus:
        tiers.price8 != null && !Number.isNaN(tiers.price8)
          ? String(tiers.price8)
          : "",
      licensePlate: v.licensePlate,
      available: v.available,
      category: v.category || "",
      passengers: String(v.passengers || 0),
      transmission: v.transmission || "",
      fuel: v.fuel || "",
      features: (v.features || []).join(", "),
    }));

    // Load existing images into form gallery
    const imgs = await fetchVehicleImages(v.id);
    setFormData((s) => ({
      ...s,
      images: imgs,
      primaryImageId: imgs.find((i) => i.isPrimary)?.id,
    }));

    setIsEditDialogOpen(true);
  };

  /* ---------------- Edit (submit)
     NOTE: This still uses your existing /api/admin/vehicles/update route.
     If you want to move edit to JSON too, we can switch after create is verified. */
  const handleEditVehicle = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingVehicle || !supabase) return;

      const fd = new FormData();
      fd.set("id", String(editingVehicle.id));

      // Common fields
      fd.set("registration_number", formData.licensePlate);
      fd.set("title", formData.name);
      fd.set("brand", formData.brand);
      fd.set("model", formData.model);
      fd.set("year", String(parseInt(formData.year || "0", 10) || 0));
      fd.set("rental_price", String(parseFloat(formData.pricePerDay || "0") || 0));
      fd.set("rental_price_5plus", formData.pricePerDay5Plus || "");
      fd.set("rental_price_8plus", formData.pricePerDay8Plus || "");
      fd.set("available", String(!!formData.available));
      fd.set("category", formData.category || "");
      fd.set("passengers", String(parseInt(formData.passengers || "0", 10) || 0));
      fd.set("transmission", formData.transmission || "");
      fd.set("fuel", formData.fuel || "");
      fd.set("features", formData.features || "");

      const imgs = formData.images ?? [];
      const existing = imgs.filter((i) => i.id && !i.file);
      const newOnes = imgs.filter((i) => i.file && !i.toDelete);
      const toDeleteIds = imgs
        .filter((i) => i.toDelete && i.id)
        .map((i) => String(i.id));

      // NEW files: upload first via signed-upload, then append the **already-uploaded** files to maintain your current API
      if (newOnes.length > 0) {
        try {
          const paths = await uploadNewImagesAndReturnPaths(
            newOnes.map((i) => i.file!)
          );
          // keep index mapping so server can keep sort order
          paths.forEach((_p, idx) => {
            // we only need to tell the server there are "new files" to register in images table,
            // but since your current update API expects real File blobs, we’ll still append them.
            // If you want to fully JSON-ify update too, we can flip it next.
            const f = newOnes[idx].file!;
            fd.append("images", f);
          });
        } catch (err: any) {
          console.error("[Vehicles] signed upload (edit) failed:", err);
          alert(err?.message || "Image upload failed.");
          return;
        }
      }

      // primary logic:
      const primaryExisting = existing.find((i) => i.isPrimary && !i.toDelete);
      const primaryNewIndex = newOnes.findIndex((i) => i.isPrimary);

      if (primaryExisting?.id) {
        fd.set("primaryId", String(primaryExisting.id));
      } else if (primaryNewIndex >= 0) {
        fd.set("primaryIndex", String(primaryNewIndex));
      }

      // sorting
      const sortExisting = existing.map((i) => ({
        id: String(i.id),
        sortOrder: typeof i.sortOrder === "number" ? i.sortOrder : 0,
      }));
      const sortNew = newOnes.map((i) =>
        typeof i.sortOrder === "number" ? i.sortOrder : 0
      );

      if (sortExisting.length) fd.set("sortExisting", JSON.stringify(sortExisting));
      if (sortNew.length) fd.set("sortNew", JSON.stringify(sortNew));
      if (toDeleteIds.length) fd.set("deleteIds", JSON.stringify(toDeleteIds));

      // WRITE via server API (service role)
      const res = await fetch("/api/admin/vehicles/update", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        body: fd,
      });
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok || !json?.ok) {
        console.error("[Vehicles] update error:", json);
        alert(json?.error || "Update failed");
        return;
      }

      // Refresh that vehicle from public view to get updated public_url
      const { data: fresh, error: selErr } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", editingVehicle.id)
        .single();
      if (selErr) {
        console.warn("[Vehicles] refresh after update failed:", selErr.message);
      }

      const updated: Vehicle = {
        ...editingVehicle,
        name: formData.name,
        brand: formData.brand,
        model: formData.model,
        year: Number.parseInt(formData.year || "0"),
        pricePerDay: Number(formData.pricePerDay || "0"),
        licensePlate: formData.licensePlate,
        available: formData.available,
        image: fresh?.public_url ?? editingVehicle.image,
        imagePath: fresh?.image_path ?? editingVehicle.imagePath,
        category: formData.category,
        passengers: Number(formData.passengers || 0),
        transmission: formData.transmission,
        fuel: formData.fuel,
        features: formData.features
          ? formData.features.split(",").map((f) => f.trim()).filter(Boolean)
          : Array.isArray(editingVehicle.features)
          ? editingVehicle.features
          : [],
      };

      // update tiers map too
      setTierById((m) => ({
        ...m,
        [editingVehicle.id]: {
          price5: formData.pricePerDay5Plus
            ? Number(formData.pricePerDay5Plus)
            : null,
          price8: formData.pricePerDay8Plus
            ? Number(formData.pricePerDay8Plus)
            : null,
        },
      }));

      setVehicles((prev) =>
        prev.map((v) => (v.id === editingVehicle.id ? updated : v))
      );
      setIsEditDialogOpen(false);
      setEditingVehicle(null);
      resetForm();
    },
    [editingVehicle, formData, resetForm]
  );

  /* ---------------- Delete ---------------- */
  const handleDeleteVehicle = async (id: string | number) => {
    if (!supabase) return;
    const victim = vehicles.find((v) => v.id === id);
    if (!confirm("Are you sure you want to delete this vehicle?")) return;

    // DELETE via server API (service role)
    const res = await fetch("/api/admin/vehicles/delete", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({ id }),
    });
    const json = await res.json().catch(() => ({} as any));
    if (!res.ok || !json?.ok) {
      alert(json?.error || "Delete failed.");
      return;
    }

    // Optional: remove legacy single image from storage (kept as-is)
    if (victim?.imagePath) {
      await supabase.storage.from(STORAGE_BUCKET).remove([victim.imagePath]);
    }

    setVehicles((prev) => prev.filter((v) => v.id !== id));
    setTierById((m) => {
      const { [id]: _remove, ...rest } = m;
      return rest;
    });
  };

  /* ---------------- Logout (cookie-based) ---------------- */
  const handleLogout = async () => {
    try {
      await fetch("/api/admin/session", { method: "DELETE", credentials: "include" });
    } finally {
      router.replace("/admin/login");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Aurora background accents (theme only) */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950" />

      {/* Top bar (theme only) */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-slate-950/70 via-slate-900/40 to-slate-950/70 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Link
                href="/admin/dashboard"
                className="flex items-center space-x-2 sm:space-x-3 group"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-black/20 group-hover:scale-110 transition-transform duration-300">
                  <Car className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-fuchsia-100 bg-clip-text text-transparent">
                    Bakers Rentals
                  </span>
                  <p className="text-cyan-100/80 text-xs sm:text-sm">
                    Vehicle Management
                  </p>
                </div>
              </Link>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="btn-3d bg-white/5 hover:bg-white/10 border-white/10 text-white backdrop-blur h-9 px-3 cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </nav>

      {!supabase && (
        <div className="bg-yellow-400/10 border border-yellow-300/30 text-yellow-100 px-4 py-3">
          <div className="container mx-auto max-w-7xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Supabase is not configured. Set{" "}
            <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
          </div>
        </div>
      )}

      {/* Header & Add (theme only) */}
      <section className="py-8 sm:py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-2 sm:mb-4 drop-shadow">
                Vehicle Fleet Management
              </h1>
              <p className="text-cyan-100/80 text-sm sm:text-xl">
                Manage your premium vehicle collection
              </p>
            </div>

            <Dialog
              open={isAddDialogOpen}
              onOpenChange={(o) => {
                setIsAddDialogOpen(o);
                if (!o) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button className="btn-3d bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-white font-bold h-9 px-3 text-sm sm:h-auto sm:px-8 sm:py-6 sm:text-lg cursor-pointer shadow-lg shadow-cyan-500/20">
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                  <span>Add Vehicle</span>
                </Button>
              </DialogTrigger>
              <DialogContent
                forceMount
                aria-describedby="add-vehicle-desc"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
                className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white/[0.04] backdrop-blur-xl ring-1 ring-white/10 data-[state=open]:bg-white/10"
              >
                <DialogHeader>
                  <DialogTitle className="text-white text-xl sm:text-2xl">
                    Add New Vehicle
                  </DialogTitle>
                  <DialogDescription
                    id="add-vehicle-desc"
                    className="text-cyan-100/80"
                  >
                    Upload photos and fill in the vehicle details. Fields marked
                    * are required.
                  </DialogDescription>
                </DialogHeader>
                <VehicleForm
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={handleAddVehicle}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters (category + availability) */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters((s) => !s)}
                  className="sm:hidden bg-white/5 hover:bg-white/10 border-white/10 text-white"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
                <span className="hidden sm:inline text-cyan-100/80 text-sm">
                  Filter your fleet
                </span>
              </div>
              <div className="hidden sm:block bg-white/5 text-white/90 px-3 py-1 rounded-lg text-sm">
                {filteredVehicles.length} vehicle
                {filteredVehicles.length !== 1 ? "s" : ""} shown
              </div>
            </div>

            <div className={`${showFilters ? "block" : "hidden sm:block"}`}>
              {/* Category chips */}
              <div className="flex gap-2 overflow-x-auto whitespace-nowrap py-2 -mx-1 px-1">
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    size="sm"
                    variant={selectedCategory === cat ? "default" : "outline"}
                    onClick={() => setSelectedCategory(cat)}
                    className={
                      selectedCategory === cat
                        ? "bg-white text-slate-900 font-semibold"
                        : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                    }
                  >
                    {cat}
                  </Button>
                ))}
              </div>

              {/* Availability chips */}
              <div className="mt-3 flex gap-2 overflow-x-auto whitespace-nowrap py-2 -mx-1 px-1">
                {availabilityOptions.map((opt) => (
                  <Button
                    key={opt}
                    size="sm"
                    variant={availabilityFilter === opt ? "default" : "outline"}
                    onClick={() => setAvailabilityFilter(opt)}
                    className={
                      availabilityFilter === opt
                        ? "bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white font-semibold"
                        : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                    }
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Vehicle list */}
          <div className="rounded-2xl ring-1 ring-white/10 bg-white/[0.03] backdrop-blur-md">
            <VehicleList
              vehicles={filteredVehicles}
              onEdit={openEditDialog}
              onDelete={handleDeleteVehicle}
            />
          </div>

          {/* Edit dialog */}
          <Dialog
            open={isEditDialogOpen}
            onOpenChange={(o) => {
              setIsEditDialogOpen(o);
              if (!o) resetForm();
            }}
          >
            <DialogContent
              forceMount
              aria-describedby="edit-vehicle-desc"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
              className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white/[0.04] backdrop-blur-xl ring-1 ring-white/10 data-[state=open]:bg-white/10"
            >
              <DialogHeader>
                <DialogTitle className="text-white text-xl sm:text-2xl">
                  Edit Vehicle
                </DialogTitle>
                <DialogDescription
                  id="edit-vehicle-desc"
                  className="text-cyan-100/80"
                >
                  Update details or manage photos for this vehicle.
                </DialogDescription>
              </DialogHeader>
              <VehicleForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleEditVehicle}
                isEdit
              />
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </div>
  );
}
