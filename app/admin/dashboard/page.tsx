"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminAuthGuard } from "@/components/admin-auth-guard"
import { Car, Users, Calendar, Settings, LogOut, BarChart3, TrendingUp, Shield } from "lucide-react"
import Link from "next/link"

function DashboardContent() {
  const [adminUser, setAdminUser] = useState("")
  const router = useRouter()

  useEffect(() => {
    const user = localStorage.getItem("adminUser")
    if (user) {
      setAdminUser(user)
    }

    const handleVisibility = () => {
      const elements = document.querySelectorAll(".fade-in-up")
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight - 100) {
          el.classList.add("animate")
        }
      })
    }

    window.addEventListener("scroll", handleVisibility)
    handleVisibility() // Check on mount

    return () => {
      window.removeEventListener("scroll", handleVisibility)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("adminAuth")
    localStorage.removeItem("adminUser")
    router.push("/admin/login")
  }

  // Mock dashboard stats
  const stats = [
    { title: "Total Vehicles", value: "8", icon: Car, color: "gradient-primary", trend: "+2 this month" },
    { title: "Active Bookings", value: "12", icon: Calendar, color: "gradient-secondary", trend: "+5 this week" },
    { title: "Total Customers", value: "45", icon: Users, color: "gradient-accent", trend: "+8 this month" },
    {
      title: "Revenue (Month)",
      value: "$3,240",
      icon: BarChart3,
      color: "gradient-primary",
      trend: "+12% vs last month",
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {stats.map((stat, index) => (
              <div key={index} className="fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
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
                      <p className="text-green-400 text-xs font-medium">{stat.trend}</p>
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
