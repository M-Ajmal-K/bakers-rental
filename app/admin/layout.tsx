"use client"

import type { ReactNode } from "react"
import { Suspense } from "react"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
          Loading admin…
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

// Prevent static optimization on admin subtree (avoids hydration edge-cases)
export const dynamic = "force-dynamic"
