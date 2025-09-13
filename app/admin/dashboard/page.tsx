"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// Removed AdminAuthGuard — middleware + cookie check now handle protection
import { Car, Calendar, Settings, LogOut, BarChart3, TrendingUp, Shield } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"

function DashboardContent() {
  const [adminUser, setAdminUser] = useState("")
  const [authLoading, setAuthLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({ vehicles: 0, bookings: 0, revenue: 0 })
  const router = useRouter()

  const fmtFJD = new Intl.NumberFormat("en-FJ", {
    style: "currency",
    currency: "FJD",
    maximumFractionDigits: 2,
  })

  // ✅ Verify cookie session with the server; redirect to login if missing/invalid
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/admin/session", {
          method: "GET",
          credentials: "include",
          headers: { "Cache-Control": "no-store" },
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data?.authed) {
          if (!cancelled) router.replace("/admin/login")
          return
        }
        // Optional label for the welcome chip; keep your local value if set
        const name = localStorage.getItem("adminUser") || "Admin"
        if (!cancelled) {
          setAdminUser(name)
          setAuthLoading(false)
        }
      } catch {
        if (!cancelled) router.replace("/admin/login")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    const handleVisibility = () => {
      const elements = document.querySelectorAll(".fade-in-up")
      elements.forEach((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect()
        if (rect.top < window.innerHeight - 100) {
          el.classList.add("animate")
        }
      })
    }

    window.addEventListener("scroll", handleVisibility)
    handleVisibility()
    return () => window.removeEventListener("scroll", handleVisibility)
  }, [])

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/session", { method: "DELETE", credentials: "include" })
    } catch {
      // ignore
    } finally {
      // Clean any old local flags (harmless if absent)
      localStorage.removeItem("adminAuth")
      localStorage.removeItem("adminUser")
      router.replace("/admin/login")
    }
  }

  // Load live metrics
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { count: vehicleCount, error: vErr } = await supabase
          .from("vehicles")
          .select("*", { count: "exact", head: true })
        if (vErr) throw vErr

        const { count: bookingCount, error: bErr } = await supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("status", "confirmed")
        if (bErr) throw bErr

        const { data: revRows, error: rErr } = await supabase
          .from("bookings")
          .select("total_price")
          .eq("status", "confirmed")
        if (rErr) throw rErr

        const revenue = (revRows || []).reduce((sum, r: any) => {
          const v = Number(r?.total_price ?? 0)
          return sum + (Number.isFinite(v) ? v : 0)
        }, 0)

        if (!cancelled) {
          setMetrics({
            vehicles: vehicleCount || 0,
            bookings: bookingCount || 0,
            revenue,
          })
        }
      } catch (err) {
        console.error("[AdminDashboard] metrics error:", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Aurora Neon palette for icon tiles
  const iconGradients = [
    "bg-gradient-to-br from-cyan-500 to-sky-500",
    "bg-gradient-to-br from-violet-500 to-fuchsia-500",
    "bg-gradient-to-br from-emerald-500 to-teal-500",
  ]

  const statCards = [
    {
      title: "Total Vehicles",
      value: loading ? "—" : String(metrics.vehicles),
      icon: Car,
      hint: "From vehicles table",
    },
    {
      title: "Active Bookings",
      value: loading ? "—" : String(metrics.bookings),
      icon: Calendar,
      hint: "Confirmed only",
    },
    {
      title: "Revenue (All Time)",
      value: loading ? "—" : fmtFJD.format(metrics.revenue),
      icon: BarChart3,
      hint: "From confirmed bookings",
    },
  ]

  // While verifying auth, keep your branded loading view
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto"></div>
          <p className="text-cyan-100/80 mt-3">Preparing your dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Aurora background accents (non-intrusive, performant) */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl" />

      {/* Page gradient base */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950" />

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-slate-950/70 via-slate-900/40 to-slate-950/70 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-fuchsia-500 shadow-lg shadow-cyan-500/10 flex items-center justify-center">
                <Car className="h-6 w-6 text-white drop-shadow" />
              </div>
              <div>
                <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-fuchsia-100 bg-clip-text text-transparent">
                  Bakers Rentals
                </span>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-cyan-300/80" />
                  <span className="text-sm text-cyan-100/80 font-medium">Admin Dashboard</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur">
                <span className="text-cyan-100/80 text-sm">Welcome, </span>
                <span className="text-white font-medium">{adminUser}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="btn-3d bg-white/5 hover:bg-white/10 border-white/10 text-white backdrop-blur"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <section className="py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="fade-in-up mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3 drop-shadow">
              Admin Dashboard
            </h1>
            <p className="text-cyan-100/80 text-lg">
              Manage your premium vehicle rental business
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {statCards.map((stat, index) => (
              <div key={stat.title} className="fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <Card className="border-0 bg-white/[0.04] backdrop-blur-xl ring-1 ring-white/10 hover:ring-white/20 transition-all shadow-xl shadow-black/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-5">
                      <div
                        className={`w-14 h-14 ${iconGradients[index % iconGradients.length]} rounded-xl flex items-center justify-center shadow-lg shadow-black/20`}
                      >
                        <stat.icon className="h-7 w-7 text-white" />
                      </div>
                      <TrendingUp className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-cyan-100/70 text-sm font-medium mb-1">{stat.title}</p>
                      <p className="text-3xl font-extrabold text-white mb-1">{stat.value}</p>
                      <p className="text-cyan-100/60 text-xs">{stat.hint}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {/* Action cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            <div className="fade-in-up" style={{ animationDelay: "0.5s" }}>
              <Card className="h-full border-0 bg-white/[0.04] backdrop-blur-xl ring-1 ring-white/10 hover:ring-white/20 transition-all shadow-xl shadow-black/20">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-white text-xl">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-500 flex items-center justify-center shadow-lg shadow-black/20">
                      <Car className="h-6 w-6 text-white" />
                    </div>
                    Vehicle Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-cyan-100/80 mb-6 flex-1">
                    Add, edit, and manage your premium vehicle fleet with advanced controls
                  </p>
                  <Button asChild className="btn-3d bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-white font-bold shadow-lg shadow-cyan-500/20">
                    <Link href="/admin/vehicles">Manage Fleet</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="fade-in-up" style={{ animationDelay: "0.6s" }}>
              <Card className="h-full border-0 bg-white/[0.04] backdrop-blur-xl ring-1 ring-white/10 hover:ring-white/20 transition-all shadow-xl shadow-black/20">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-white text-xl">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-black/20">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    Booking Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-cyan-100/80 mb-6 flex-1">
                    View and manage customer bookings with advanced filtering and status updates
                  </p>
                  <Button asChild className="btn-3d bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white font-bold shadow-lg shadow-fuchsia-500/20">
                    <Link href="/admin/bookings">Manage Bookings</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="fade-in-up" style={{ animationDelay: "0.7s" }}>
              <Card className="h-full border-0 bg-white/[0.04] backdrop-blur-xl ring-1 ring-white/10 hover:ring-white/20 transition-all shadow-xl shadow-black/20">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-white text-xl">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-black/20">
                      <Settings className="h-6 w-6 text-white" />
                    </div>
                    System Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-cyan-100/80 mb-6 flex-1">
                    Manage vehicle categories, locations, and system configurations
                  </p>
                  <Button
                    asChild
                    variant="outline"
                    className="btn-3d bg-white/5 hover:bg-white/10 border-white/10 text-white font-bold backdrop-blur"
                  >
                    <Link href="/admin/categories">System Settings</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="fade-in-up" style={{ animationDelay: "0.8s" }}>
            <Card className="border-0 bg-white/[0.04] backdrop-blur-xl ring-1 ring-white/10 shadow-xl shadow-black/20">
              <CardHeader>
                <CardTitle className="text-white text-2xl">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between py-4 border-b border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-400/15 flex items-center justify-center ring-1 ring-emerald-400/30">
                        <Calendar className="h-5 w-5 text-emerald-300" />
                      </div>
                      <div>
                        <p className="font-medium text-white">New booking received</p>
                        <p className="text-sm text-cyan-100/80">Toyota RAV4 - John Smith</p>
                      </div>
                    </div>
                    <span className="text-sm text-cyan-100/70">2 hours ago</span>
                  </div>

                  <div className="flex items-center justify-between py-4 border-b border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-sky-400/15 flex items-center justify-center ring-1 ring-sky-400/30">
                        <Car className="h-5 w-5 text-sky-300" />
                      </div>
                      <div>
                        <p className="font-medium text-white">Vehicle returned</p>
                        <p className="text-sm text-cyan-100/80">Honda Odyssey - Sarah Johnson</p>
                      </div>
                    </div>
                    <span className="text-sm text-cyan-100/70">5 hours ago</span>
                  </div>

                  <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-fuchsia-400/15 flex items-center justify-center ring-1 ring-fuchsia-400/30">
                        <Settings className="h-5 w-5 text-fuchsia-300" />
                      </div>
                      <div>
                        <p className="font-medium text-white">New vehicle added</p>
                        <p className="text-sm text-cyan-100/80">Ford Ranger - Pickup category</p>
                      </div>
                    </div>
                    <span className="text-sm text-cyan-100/70">1 day ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function AdminDashboardPage() {
  // No AdminAuthGuard wrapper; route is protected by middleware + in-page cookie check
  return <DashboardContent />
}
