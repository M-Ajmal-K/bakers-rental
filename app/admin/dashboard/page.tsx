"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminAuthGuard } from "@/components/admin-auth-guard"
import { Car, Calendar, Settings, LogOut, BarChart3, TrendingUp, Shield } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"

function DashboardContent() {
  const [adminUser, setAdminUser] = useState("")
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({ vehicles: 0, bookings: 0, revenue: 0 })
  const router = useRouter()

  const fmtFJD = new Intl.NumberFormat("en-FJ", {
    style: "currency",
    currency: "FJD",
    maximumFractionDigits: 2,
  })

  useEffect(() => {
    const user = localStorage.getItem("adminUser")
    if (user) setAdminUser(user)

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

  const handleLogout = () => {
    localStorage.removeItem("adminAuth")
    localStorage.removeItem("adminUser")
    router.push("/admin/login")
  }

  // Load live metrics
  useEffect(() => {
    const load = async () => {
      try {
        // Vehicles count
        const { count: vehicleCount, error: vErr } = await supabase
          .from("vehicles")
          .select("*", { count: "exact", head: true })
        if (vErr) throw vErr

        // Confirmed bookings count
        const { count: bookingCount, error: bErr } = await supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("status", "confirmed")
        if (bErr) throw bErr

        // Revenue (sum total_price for confirmed bookings)
        const { data: revRows, error: rErr } = await supabase
          .from("bookings")
          .select("total_price")
          .eq("status", "confirmed")
        if (rErr) throw rErr

        const revenue = (revRows || []).reduce((sum, r: any) => {
          const v = Number(r?.total_price ?? 0)
          return sum + (Number.isFinite(v) ? v : 0)
        }, 0)

        setMetrics({
          vehicles: vehicleCount || 0,
          bookings: bookingCount || 0,
          revenue,
        })
      } catch (err) {
        console.error("[AdminDashboard] metrics error:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Three cards: Vehicles, Bookings, Revenue (removed Customers)
  const statCards = [
    {
      title: "Total Vehicles",
      value: loading ? "—" : String(metrics.vehicles),
      icon: Car,
      color: "gradient-primary",
      hint: "From vehicles table",
    },
    {
      title: "Active Bookings",
      value: loading ? "—" : String(metrics.bookings),
      icon: Calendar,
      color: "gradient-secondary",
      hint: "Confirmed only",
    },
    {
      title: "Revenue (All Time)",
      value: loading ? "—" : fmtFJD.format(metrics.revenue),
      icon: BarChart3,
      color: "gradient-primary",
      hint: "From confirmed bookings",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent via-primary/20 to-secondary/20">
      <nav className="sticky top-0 z-50 glass-effect-dark border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
                <Car className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold text-white">Bakers Rentals</span>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-white/80" />
                  <span className="text-sm text-white/80 font-medium">Admin Dashboard</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="glass-effect-dark px-4 py-2 rounded-lg">
                <span className="text-white/80 text-sm">Welcome, </span>
                <span className="text-white font-medium">{adminUser}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="btn-3d glass-effect-dark text-white border-white/20 hover:bg-white/10 bg-transparent"
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
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">Admin Dashboard</h1>
            <p className="text-white/80 text-xl">Manage your premium vehicle rental business</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {statCards.map((stat, index) => (
              <div key={stat.title} className="fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <Card className="card-3d tilt-3d border-0 glass-effect-dark group">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`w-14 h-14 ${stat.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                      >
                        <stat.icon className="h-7 w-7 text-white" />
                      </div>
                      <TrendingUp className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white/70 text-sm font-medium mb-1">{stat.title}</p>
                      <p className="text-3xl font-bold text-white mb-2">{stat.value}</p>
                      <p className="text-white/60 text-xs">{stat.hint}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            <div className="fade-in-up" style={{ animationDelay: "0.5s" }}>
              <Card className="card-3d tilt-3d border-0 glass-effect-dark group h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-white text-xl">
                    <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Car className="h-6 w-6 text-white" />
                    </div>
                    Vehicle Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-white/70 mb-6 flex-1">
                    Add, edit, and manage your premium vehicle fleet with advanced controls
                  </p>
                  <Button asChild className="btn-3d bg-white text-primary hover:bg-white/90 font-bold">
                    <Link href="/admin/vehicles">Manage Fleet</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="fade-in-up" style={{ animationDelay: "0.6s" }}>
              <Card className="card-3d tilt-3d border-0 glass-effect-dark group h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-white text-xl">
                    <div className="w-12 h-12 gradient-secondary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    Booking Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-white/70 mb-6 flex-1">
                    View and manage customer bookings with advanced filtering and status updates
                  </p>
                  <Button asChild className="btn-3d bg-white text-secondary hover:bg-white/90 font-bold">
                    <Link href="/admin/bookings">Manage Bookings</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="fade-in-up" style={{ animationDelay: "0.7s" }}>
              <Card className="card-3d tilt-3d border-0 glass-effect-dark group h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-white text-xl">
                    <div className="w-12 h-12 gradient-accent rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Settings className="h-6 w-6 text-white" />
                    </div>
                    System Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-white/70 mb-6 flex-1">
                    Manage vehicle categories, locations, and system configurations
                  </p>
                  <Button
                    asChild
                    variant="outline"
                    className="btn-3d glass-effect-dark text-white border-white/20 hover:bg-white/10 font-bold bg-transparent"
                  >
                    <Link href="/admin/categories">System Settings</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="fade-in-up" style={{ animationDelay: "0.8s" }}>
            <Card className="card-3d border-0 glass-effect-dark">
              <CardHeader>
                <CardTitle className="text-white text-2xl">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between py-4 border-b border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">New booking received</p>
                        <p className="text-sm text-white/70">Toyota RAV4 - John Smith</p>
                      </div>
                    </div>
                    <span className="text-sm text-white/60">2 hours ago</span>
                  </div>
                  <div className="flex items-center justify-between py-4 border-b border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <Car className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">Vehicle returned</p>
                        <p className="text-sm text-white/70">Honda Odyssey - Sarah Johnson</p>
                      </div>
                    </div>
                    <span className="text-sm text-white/60">5 hours ago</span>
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <Settings className="h-5 w-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">New vehicle added</p>
                        <p className="text-sm text-white/70">Ford Ranger - Pickup category</p>
                      </div>
                    </div>
                    <span className="text-sm text-white/60">1 day ago</span>
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
  return (
    <AdminAuthGuard>
      <DashboardContent />
    </AdminAuthGuard>
  )
}
