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
  DialogTrigger
} from "@/components/ui/dialog";
import { Car, Plus, LogOut, AlertTriangle } from "lucide-react";

import VehicleForm from "./VehicleForm";
import VehicleList from "./VehicleList";
import { FormState, Vehicle } from "./VehicleTypes";

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [formData, setFormData] = useState<FormState>({
    name: "",
    brand: "",
    model: "",
    year: "",
    pricePerDay: "",
    licensePlate: "",
    available: true,
    category: "",
    passengers: "",
    transmission: "",
    fuel: "",
    features: "",
  });

  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const router = useRouter();

  /* ---------------- Load vehicles ---------------- */
  useEffect(() => {
    const load = async () => {
      if (!supabase) return;

      const { data, error } = await supabase
        .from("vehicles")
        .select(
          "id, registration_number, title, brand, model, year, rental_price, image_path, available, created_at, category, passengers, transmission, fuel, features"
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[Vehicles] select error:", error);
        return;
      }

      const mapped: Vehicle[] =
        (data || []).map((v: any) => {
          let publicUrl: string | null = null;
          if (v.image_path) {
            const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(v.image_path);
            publicUrl = pub?.publicUrl ?? null;
          }
          return {
            id: v.id,
            name: v.title,
            brand: v.brand ?? "",
            model: v.model ?? "",
            year: Number(v.year ?? 0),
            pricePerDay: Number(v.rental_price ?? 0),
            licensePlate: v.registration_number ?? "",
            available: Boolean(v.available),
            image: publicUrl,
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
          };
        }) || [];

      setVehicles(mapped);
    };
    load();
  }, []);

  /* ---------------- Helpers ---------------- */
  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      brand: "",
      model: "",
      year: "",
      pricePerDay: "",
      licensePlate: "",
      available: true,
      category: "",
      passengers: "",
      transmission: "",
      fuel: "",
      features: "",
    });
    setPickedFile(null);
  }, []);

  const uploadImage = useCallback(async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/storage/upload", { method: "POST", body: fd });
    if (!res.ok) {
      let msg = "Upload failed";
      try {
        const j = await res.json();
        msg = j.error || msg;
        console.error("[Vehicles] Upload API error:", j);
      } catch {}
      throw new Error(msg);
    }
    const data = await res.json();
    return { publicUrl: data.publicUrl as string, path: data.path as string };
  }, []);

  /* ---------------- Add ---------------- */
  const handleAddVehicle = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!supabase) {
        alert("Supabase is not configured.");
        return;
      }

      let image_path: string | null = null;
      let publicUrl: string | null = null;
      try {
        if (pickedFile) {
          const up = await uploadImage(pickedFile);
          image_path = up.path;
          publicUrl = up.publicUrl;
        }
      } catch (err: any) {
        alert(err?.message || "Image upload failed.");
        return;
      }

      const payload = {
        registration_number: formData.licensePlate,
        title: formData.name,
        brand: formData.brand,
        model: formData.model,
        year: Number.parseInt(formData.year || "0"),
        rental_price: Number.parseFloat(formData.pricePerDay || "0"),
        image_path,
        available: formData.available,
        category: formData.category,
        passengers: Number(formData.passengers || 0),
        transmission: formData.transmission,
        fuel: formData.fuel,
        features: formData.features
          ? formData.features.split(",").map((f) => f.trim()).filter(Boolean)
          : [],
      };

      const { data, error } = await supabase.from("vehicles").insert(payload).select().single();
      if (error) {
        console.error("[Vehicles] insert error:", error);
        alert(error.message);
        return;
      }

      const newVehicle: Vehicle = {
        id: data.id,
        name: data.title,
        brand: data.brand,
        model: data.model,
        year: Number(data.year ?? 0),
        pricePerDay: Number(data.rental_price ?? 0),
        licensePlate: data.registration_number ?? "",
        available: Boolean(data.available),
        image: publicUrl,
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

      setVehicles((prev) => [newVehicle, ...prev]);
      setIsAddDialogOpen(false);
      resetForm();
    },
    [formData, pickedFile, uploadImage, resetForm]
  );

  /* ---------------- Edit ---------------- */
  const openEditDialog = (v: Vehicle) => {
    setEditingVehicle(v);
    setFormData({
      name: v.name,
      brand: v.brand,
      model: v.model,
      year: v.year.toString(),
      pricePerDay: v.pricePerDay.toString(),
      licensePlate: v.licensePlate,
      available: v.available,
      category: v.category || "",
      passengers: String(v.passengers || 0),
      transmission: v.transmission || "",
      fuel: v.fuel || "",
      features: (v.features || []).join(", "),
    });
    setPickedFile(null);
    setIsEditDialogOpen(true);
  };

  const handleEditVehicle = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingVehicle || !supabase) return;

      let newPublicUrl: string | null = editingVehicle.image;
      let newImagePath: string | null = null;
      if (pickedFile) {
        try {
          const up = await uploadImage(pickedFile);
          newPublicUrl = up.publicUrl;
          newImagePath = up.path;
        } catch (err: any) {
          alert(err?.message || "Image upload failed. Keeping previous image.");
        }
      }

      const payload: any = {
        registration_number: formData.licensePlate,
        title: formData.name,
        brand: formData.brand,
        model: formData.model,
        year: Number.parseInt(formData.year || "0"),
        rental_price: Number.parseFloat(formData.pricePerDay || "0"),
        available: formData.available,
        category: formData.category,
        passengers: Number(formData.passengers || 0),
        transmission: formData.transmission,
        fuel: formData.fuel,
        features: formData.features
          ? formData.features.split(",").map((f) => f.trim()).filter(Boolean)
          : [],
      };
      if (newImagePath) payload.image_path = newImagePath;

      const { error } = await supabase.from("vehicles").update(payload).eq("id", editingVehicle.id);
      if (error) {
        console.error("[Vehicles] update error:", error);
        alert(error.message);
        return;
      }

      const updated: Vehicle = {
        ...editingVehicle,
        name: formData.name,
        brand: formData.brand,
        model: formData.model,
        year: Number.parseInt(formData.year || "0"),
        pricePerDay: Number.parseFloat(formData.pricePerDay || "0"),
        licensePlate: formData.licensePlate,
        available: formData.available,
        image: newPublicUrl,
        imagePath: newImagePath ?? editingVehicle.imagePath,
        category: formData.category,
        passengers: Number(formData.passengers || 0),
        transmission: formData.transmission,
        fuel: formData.fuel,
        features: formData.features
          ? formData.features.split(",").map((f) => f.trim()).filter(Boolean)
          : (Array.isArray(editingVehicle.features) ? editingVehicle.features : []),
      };

      setVehicles((prev) => prev.map((v) => (v.id === editingVehicle.id ? updated : v)));
      setIsEditDialogOpen(false);
      setEditingVehicle(null);
      resetForm();
    },
    [editingVehicle, formData, pickedFile, uploadImage, resetForm]
  );

  /* ---------------- Delete ---------------- */
  const handleDeleteVehicle = async (id: string | number) => {
    if (!supabase) return;
    const victim = vehicles.find((v) => v.id === id);
    if (!confirm("Are you sure you want to delete this vehicle?")) return;

    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }

    if (victim?.imagePath) {
      await supabase.storage.from(STORAGE_BUCKET).remove([victim.imagePath]);
    }

    setVehicles((prev) => prev.filter((v) => v.id !== id));
  };

  /* ---------------- Logout ---------------- */
  const handleLogout = () => {
    localStorage.removeItem("adminAuth");
    localStorage.removeItem("adminUser");
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent via-primary/20 to-secondary/20">
      {/* Top bar */}
      <nav className="sticky top-0 z-50 glass-effect-dark border-b border-white/10">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Link href="/admin/dashboard" className="flex items-center space-x-2 sm:space-x-3 group">
                <div className="w-10 h-10 sm:w-12 sm:h-12 gradient-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Car className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-bold text-white">Bakers Rentals</span>
                  <p className="text-white/80 text-xs sm:text-sm">Vehicle Management</p>
                </div>
              </Link>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="btn-3d glass-effect-dark text-white border-white/20 hover:bg-white/10 bg-transparent h-9 px-3 cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </nav>

      {!supabase && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 px-4 py-3">
          <div className="container mx-auto max-w-7xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Supabase is not configured. Set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
          </div>
        </div>
      )}

      {/* Header & Add */}
      <section className="py-8 sm:py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-6 sm:mb-12">
            <div>
              <h1 className="text-2xl sm:text-5xl font-bold text-white mb-2 sm:mb-4 drop-shadow-lg">
                Vehicle Fleet Management
              </h1>
              <p className="text-white/80 text-sm sm:text-xl">Manage your premium vehicle collection</p>
            </div>

            <Dialog
              open={isAddDialogOpen}
              onOpenChange={(o) => {
                setIsAddDialogOpen(o);
                if (!o) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button className="btn-3d pulse-glow bg-white text-primary hover:bg-white/90 font-bold h-9 px-3 text-sm sm:h-auto sm:px-8 sm:py-6 sm:text-lg cursor-pointer">
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                  <span>Add Vehicle</span>
                </Button>
              </DialogTrigger>
              <DialogContent
                forceMount
                aria-describedby="add-vehicle-desc"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
                className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto glass-effect-dark border-white/20 backdrop-blur-md data-[state=open]:bg-black/20"
              >
                <div className="pointer-events-none fixed inset-0 -z-10 bg-black/40 backdrop-blur-sm" />
                <DialogHeader>
                  <DialogTitle className="text-white text-xl sm:text-2xl">Add New Vehicle</DialogTitle>
                  <DialogDescription id="add-vehicle-desc" className="text-white/80">
                    Upload a photo and fill in the vehicle details. Fields marked * are required.
                  </DialogDescription>
                </DialogHeader>
                <VehicleForm
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={handleAddVehicle}
                  onFilePicked={setPickedFile}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* ✅ Single source of truth for lists */}
          <VehicleList
            vehicles={vehicles}
            onEdit={openEditDialog}
            onDelete={handleDeleteVehicle}
          />

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
              className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto glass-effect-dark border-white/20 backdrop-blur-md data-[state=open]:bg-black/20"
            >
              <div className="pointer-events-none fixed inset-0 -z-10 bg-black/40 backdrop-blur-sm" />
              <DialogHeader>
                <DialogTitle className="text-white text-xl sm:text-2xl">Edit Vehicle</DialogTitle>
                <DialogDescription id="edit-vehicle-desc" className="text-white/80">
                  Update details or upload a new photo for this vehicle.
                </DialogDescription>
              </DialogHeader>
              <VehicleForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleEditVehicle}
                onFilePicked={setPickedFile}
                isEdit
              />
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </div>
  );
}
