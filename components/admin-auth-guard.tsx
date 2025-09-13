"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Car } from "lucide-react"

interface AdminAuthGuardProps {
  children: React.ReactNode
}

export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    let cancelled = false

    const checkAuth = async () => {
      try {
        // Ask server if we're authenticated (cookie-based)
        const res = await fetch("/api/admin/session", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        })

        const data = await res.json().catch(() => ({}))
        const authed = !!data?.authed

        if (cancelled) return
        setIsAuthenticated(authed)

        if (!authed) {
          // Not authenticated → go to login
          router.replace("/admin/login")
        } else {
          // Optional: keep this for any UI pieces reading localStorage
          try {
            localStorage.setItem("adminAuth", "true")
          } catch {}
        }
      } catch (error) {
        console.error("Auth check error:", error)
        if (cancelled) return
        setIsAuthenticated(false)
        router.replace("/admin/login")
      }
    }

    checkAuth()
    return () => {
      cancelled = true
    }
  }, [router, isMounted])

  if (!isMounted || isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-accent via-primary to-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Car className="h-8 w-8 text-white" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/80 font-medium">Authenticating...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // We already redirected; render nothing to avoid flash
    return null
  }

  return <>{children}</>
}
