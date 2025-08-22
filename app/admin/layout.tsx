"use client"

import type { ReactNode } from "react"
import { AdminAuthGuard } from "@/components/admin-auth-guard"

export default function AdminLayout({ children }: { children: ReactNode }) {
  // Centralize auth for ALL /admin/* pages
  return (
    <AdminAuthGuard>
      <div className="min-h-screen">{children}</div>
    </AdminAuthGuard>
  )
}
