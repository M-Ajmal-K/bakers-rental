"use client";

import { AdminAuthGuard } from "@/components/admin-auth-guard";
import VehicleManagement from "@/components/vehicles/VehicleManagement";

export default function VehicleManagementPage() {
  return (
    <AdminAuthGuard>
      <VehicleManagement />
    </AdminAuthGuard>
  );
}
