"use client";

import dynamic from "next/dynamic";
import { AdminAuthGuard } from "@/components/admin-auth-guard";

// Lazy-load the heavy admin component to improve TTI on slower devices
const VehicleManagement = dynamic(
  () => import("@/components/vehicles/VehicleManagement"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-fuchsia-500 animate-pulse mx-auto mb-4" />
          <p className="text-white/80">Loading vehicles…</p>
        </div>
      </div>
    ),
  }
);

export default function VehicleManagementPage() {
  return (
    <AdminAuthGuard>
      <VehicleManagement />
    </AdminAuthGuard>
  );
}
