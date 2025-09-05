"use client"

import { useEffect, useState, memo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { Car, Calendar, Edit, Trash2, LogOut, Filter, Eye, Phone, Mail } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

/* -------------------------------------------------------------------------- */
/*                             Types / Status Map                              */
/* -------------------------------------------------------------------------- */

const bookingStatuses = ["all", "pending", "confirmed", "completed", "cancelled"] as const

// Themed for dark UI (visual-only change)
const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-200 ring-1 ring-yellow-400/30",
  confirmed: "bg-green-500/15 text-green-200 ring-1 ring-green-400/30",
  completed: "bg-blue-500/15 text-blue-200 ring-1 ring-blue-400/30",
  cancelled: "bg-red-500/15 text-red-200 ring-1 ring-red-400/30",
  active: "bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-400/30",
}

type BookingStatus = typeof bookingStatuses[number]

interface Booking {
  id: string
  bookingRef: string
  customerName: string
  customerEmail: string
  customerPhone: string
  vehicleId: string
  vehicleName: string
  vehiclePlate: string
  pickupDate: string
  returnDate: string
  pickupLocation: string
  dropoffLocation: string
  totalAmount: number
  status: BookingStatus | string
  createdAt: string
  notes: string
}

/* ---------------- Mobile card for bookings (UI unchanged) ----------------- */
const MobileBookingCard = memo(function MobileBookingCard({
  booking,
  onView,
  onEdit,
  onDelete,
  getStatusBadge,
  calculateDays,
}: {
  booking: Booking
  onView: (b: Booking) => void
  onEdit: (b: Booking) => void
  onDelete: (id: string) => void
  getStatusBadge: (s: string) => JSX.Element
  calculateDays: (a: string, b: string) => number
}) {
  return (
    <Card className="border-0 bg-white/[0.03] backdrop-blur-md ring-1 ring-white/10">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-white/70">{format(new Date(booking.createdAt), "MMM dd, yyyy")}</p>
            <h3 className="text-base font-semibold text-white">{booking.bookingRef}</h3>
          </div>
          {getStatusBadge(String(booking.status))}
        </div>

        <div className="text-sm text-white/80 space-y-1">
          <p className="font-medium text-white">{booking.customerName}</p>
          <p className="truncate">{booking.customerEmail}</p>
          <p className="truncate">{booking.customerPhone}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white/5 rounded p-2">
            <p className="text-white/60">Vehicle</p>
            <p className="font-medium text-white">{booking.vehicleName}</p>
            {booking.vehiclePlate && <p className="text-white/70 text-xs mt-0.5">Plate: {booking.vehiclePlate}</p>}
          </div>
          <div className="bg-white/5 rounded p-2">
            <p className="text-white/60">Amount</p>
            <p className="font-semibold text-white">${booking.totalAmount}</p>
          </div>
          <div className="bg-white/5 rounded p-2 col-span-2">
            <p className="text-white/60">Dates</p>
            <p className="text-white">
              {format(new Date(booking.pickupDate), "MMM dd")} – {format(new Date(booking.returnDate), "MMM dd")} ·{" "}
              {calculateDays(booking.pickupDate, booking.returnDate)} day
              {calculateDays(booking.pickupDate, booking.returnDate) !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="bg-white/5 rounded p-2">
            <p className="text-white/60">Pickup</p>
            <p className="text-white truncate">{booking.pickupLocation}</p>
          </div>
          <div className="bg-white/5 rounded p-2">
            <p className="text-white/60">Drop-off</p>
            <p className="text-white truncate">{booking.dropoffLocation}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(booking)}
            className="h-8 px-3 bg-white/5 hover:bg-white/10 border-white/10 text-white"
          >
            <Eye className="h-3.5 w-3.5 mr-1" /> View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(booking)}
            className="h-8 px-3 bg-white/5 hover:bg-white/10 border-white/10 text-white"
          >
            <Edit className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(booking.id)}
            className="h-8 px-3 bg-red-500/10 hover:bg-red-500/15 border-red-400/30 text-red-200"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
})

/* -------------------------------------------------------------------------- */
/*                           Main content (admin UI)                           */
/* -------------------------------------------------------------------------- */

function BookingManagementContent() {
  const router = useRouter()

  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [editFormData, setEditFormData] = useState({ status: "", notes: "" })
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Ensure fade-ins are visible
  useEffect(() => {
    const activate = () => {
      document.querySelectorAll<HTMLElement>(".fade-in-up").forEach((el) => el.classList.add("animate"))
    }
    activate()
    window.addEventListener("scroll", activate)
    return () => window.removeEventListener("scroll", activate)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("adminAuth")
    localStorage.removeItem("adminUser")
    router.push("/admin/login")
  }

  /* --------------------------- Fetch real bookings -------------------------- */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        // 1) Pull bookings
        const { data: rawBookings } = await supabase
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false })
          .throwOnError()

        const rows = rawBookings || []
        const vehicleIds = Array.from(new Set(rows.map((r: any) => r.vehicle_id).filter(Boolean)))

        // 2) Pull vehicle titles + registration_number
        let vehicleMap: Record<string, { title: string; plate: string }> = {}
        if (vehicleIds.length > 0) {
          const { data: vehData } = await supabase
            .from("vehicles")
            .select("id, title, registration_number")
            .in("id", vehicleIds)
            .throwOnError()

          vehicleMap = (vehData || []).reduce((acc: Record<string, { title: string; plate: string }>, v: any) => {
            acc[v.id] = { title: v.title || "(Untitled Vehicle)", plate: v.registration_number ?? "" }
            return acc
          }, {})
        }

        // 3) Map DB rows to UI Booking shape
        const mapped: Booking[] = rows.map((r: any) => {
          const id: string = r.id
          const created = r.created_at || new Date().toISOString()
          const ref = `BK-${format(new Date(created), "yyyy")}-${String(id).slice(0, 6).toUpperCase()}`
          const vehMeta = vehicleMap[r.vehicle_id] || { title: "(Unknown Vehicle)", plate: "" }
          return {
            id,
            bookingRef: ref,
            customerName: r.customer_name ?? "",
            customerEmail: r.customer_email ?? "",
            customerPhone: r.customer_phone ?? "",
            vehicleId: r.vehicle_id,
            vehicleName: vehMeta.title,
            vehiclePlate: vehMeta.plate,
            pickupDate: r.start_date,
            returnDate: r.end_date,
            pickupLocation: r.pickup_location ?? "",
            dropoffLocation: r.dropoff_location ?? "",
            totalAmount: Number(r.total_price ?? 0),
            status: r.status ?? "pending",
            createdAt: created,
            notes: "",
          }
        })

        setBookings(mapped)
        setFilteredBookings(mapped)
      } catch (err: any) {
        const msg =
          err?.message ||
          "Failed to load bookings. If Row Level Security is enabled, ensure a SELECT policy allows reading bookings."
        console.error("[Admin/Bookings] fetch bookings error detail:", err)
        setLoadError(msg)
        setBookings([])
        setFilteredBookings([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter bookings on changes (include plate in search)
  useEffect(() => {
    let filtered = bookings
    if (statusFilter !== "all") filtered = filtered.filter((b) => String(b.status) === statusFilter)
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (b) =>
          b.customerName.toLowerCase().includes(q) ||
          b.bookingRef.toLowerCase().includes(q) ||
          b.vehicleName.toLowerCase().includes(q) ||
          b.vehiclePlate.toLowerCase().includes(q),
      )
    }
    setFilteredBookings(filtered)
  }, [bookings, statusFilter, searchTerm])

  const handleViewBooking = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsViewDialogOpen(true)
  }

  const handleEditBooking = (booking: Booking) => {
    setSelectedBooking(booking)
    setEditFormData({ status: String(booking.status), notes: booking.notes })
    setIsEditDialogOpen(true)
  }

  // Local-only (MVP)
  const handleUpdateBooking = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBooking) return
    const updated = { ...selectedBooking, status: editFormData.status, notes: editFormData.notes }
    setBookings((prev) => prev.map((b) => (b.id === selectedBooking.id ? updated : b)))
    setIsEditDialogOpen(false)
    setSelectedBooking(null)
  }

  // Local-only (MVP)
  const handleDeleteBooking = (id: string) => {
    if (confirm("Are you sure you want to delete this booking (local-only)?")) {
      setBookings((prev) => prev.filter((b) => b.id !== id))
    }
  }

  const getStatusBadge = (status: string) => {
    const colorClass = statusColors[status] || "bg-white/10 text-white ring-1 ring-white/15"
    return (
      <Badge className={`${colorClass} capitalize`} variant="secondary">
        {status}
      </Badge>
    )
  }

  const calculateDays = (pickupDate: string, returnDate: string) => {
    const pickup = new Date(pickupDate)
    const ret = new Date(returnDate)
    const diff = Math.abs(ret.getTime() - pickup.getTime())
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days || 1
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Aurora background accents */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950" />

      {/* Top nav (themed) */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-slate-950/70 via-slate-900/40 to-slate-950/70 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <Link href="/admin/dashboard" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-black/20 group-hover:scale-110 transition-transform duration-300">
                <Car className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div>
                <span className="text-xl md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-fuchsia-100 bg-clip-text text-transparent leading-none">
                  Bakers Rentals
                </span>
                <p className="text-xs md:text-sm text-cyan-100/80">Booking Management</p>
              </div>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="h-9 md:h-10 px-3 md:px-4 bg-white/5 hover:bg-white/10 border-white/10 text-white"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </nav>

      <section className="py-8 md:py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="fade-in-up mb-8 md:mb-12">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-2 md:mb-4 drop-shadow">
              Booking Management
            </h1>
            <p className="text-cyan-100/80 text-base md:text-xl">
              {loading ? "Loading bookings…" : "View and manage customer reservations"}
            </p>
          </div>

          {/* Optional inline error */}
          {loadError && (
            <div className="fade-in-up mb-6">
              <Card className="border-0 bg-white/[0.04] backdrop-blur-xl ring-1 ring-white/10">
                <CardContent className="p-4 text-sm text-red-200">{loadError}</CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <div className="fade-in-up mb-6 md:mb-8" style={{ animationDelay: "0.2s" }}>
            <Card className="border-0 bg-white/[0.04] backdrop-blur-xl ring-1 ring-white/10">
              <CardHeader className="pb-3 md:pb-4">
                <CardTitle className="flex items-center gap-2 md:gap-3 text-white text-lg md:text-xl">
                  <Filter className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  Advanced Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                  <div className="flex-1">
                    <Label htmlFor="search" className="text-white/80 font-medium text-sm md:text-base">
                      Search Bookings
                    </Label>
                    <Input
                      id="search"
                      placeholder="Search by customer, ref, vehicle, or plate..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="mt-2 h-10 md:h-11 bg-white/5 border-white/10 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="w-full md:w-48">
                    <Label htmlFor="status" className="text-white/80 font-medium text-sm md:text-base">
                      Status Filter
                    </Label>
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BookingStatus | "all")}>
                      <SelectTrigger className="mt-2 h-10 md:h-11 bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900/90 backdrop-blur-xl border-white/10 text-white">
                        {bookingStatuses.map((status) => (
                          <SelectItem key={status} value={status} className="hover:bg-white/10">
                            {status === "all" ? "All Statuses" : status.charAt(0).toUpperCase() + status.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile: Card list */}
          <div className="grid gap-4 md:hidden">
            {filteredBookings.map((booking) => (
              <MobileBookingCard
                key={booking.id}
                booking={booking}
                onView={handleViewBooking}
                onEdit={handleEditBooking}
                onDelete={handleDeleteBooking}
                getStatusBadge={getStatusBadge}
                calculateDays={calculateDays}
              />
            ))}
            {!loading && filteredBookings.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-white/40 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-1">No bookings found</h3>
                <p className="text-white/70 text-sm">Try adjusting your filters to see more results</p>
              </div>
            )}
          </div>

          {/* Desktop/Tablet: Table */}
          <div className="fade-in-up hidden md:block" style={{ animationDelay: "0.4s" }}>
            <Card className="border-0 bg-white/[0.04] backdrop-blur-xl ring-1 ring-white/10">
              <CardHeader>
                <CardTitle className="text-white text-2xl">
                  {loading ? "Loading…" : `All Bookings (${filteredBookings.length})`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className="text-white/80">Booking Ref</TableHead>
                        <TableHead className="text-white/80">Customer</TableHead>
                        <TableHead className="text-white/80">Vehicle</TableHead>
                        <TableHead className="text-white/80">Plate</TableHead>
                        <TableHead className="text-white/80">Dates</TableHead>
                        <TableHead className="text-white/80">Amount</TableHead>
                        <TableHead className="text-white/80">Status</TableHead>
                        <TableHead className="text-white/80">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.map((booking) => (
                        <TableRow key={booking.id} className="border-white/10 hover:bg-white/5">
                          <TableCell>
                            <div>
                              <p className="font-medium text-white">{booking.bookingRef}</p>
                              <p className="text-sm text-white/70">
                                {format(new Date(booking.createdAt), "MMM dd, yyyy")}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-white">{booking.customerName}</p>
                              <p className="text-sm text-white/70">{booking.customerEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-white">{booking.vehicleName}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-white">{booking.vehiclePlate || "-"}</p>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="text-white">
                                {format(new Date(booking.pickupDate), "MMM dd")} -{" "}
                                {format(new Date(booking.returnDate), "MMM dd")}
                              </p>
                              <p className="text-white/70">
                                {calculateDays(booking.pickupDate, booking.returnDate)} day
                                {calculateDays(booking.pickupDate, booking.returnDate) !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-white">${booking.totalAmount}</TableCell>
                          <TableCell>{getStatusBadge(String(booking.status))}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewBooking(booking)}
                                className="bg-white/5 hover:bg-white/10 border-white/10 text-white"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditBooking(booking)}
                                className="bg-white/5 hover:bg-white/10 border-white/10 text-white"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteBooking(booking.id)}
                                className="bg-red-500/10 hover:bg-red-500/15 border-red-400/30 text-red-200"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {!loading && filteredBookings.length === 0 && (
                  <div className="text-center py-12">
                    <Calendar className="h-16 w-16 text-white/40 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No bookings found</h3>
                    <p className="text-white/70">Try adjusting your filters to see more results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* View Dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent
              forceMount
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
              className="max-w-xl md:max-w-2xl bg-white/[0.04] backdrop-blur-xl ring-1 ring-white/10 text-white"
            >
              <DialogHeader>
                <DialogTitle className="text-white text-xl md:text-2xl">Booking Details</DialogTitle>
              </DialogHeader>
              {selectedBooking && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-white mb-3">Booking Information</h3>
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="text-white/70">Reference:</span> {selectedBooking.bookingRef}
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="text-white/70">Status:</span> {getStatusBadge(String(selectedBooking.status))}
                        </p>
                        <p>
                          <span className="text-white/70">Created:</span>{" "}
                          {format(new Date(selectedBooking.createdAt), "PPP")}
                        </p>
                        <p>
                          <span className="text-white/70">Total Amount:</span> ${selectedBooking.totalAmount}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-white mb-3">Customer Details</h3>
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="text-white/70">Name:</span> {selectedBooking.customerName}
                        </p>
                        <p className="flex items-center gap-2 break-all">
                          <Mail className="h-4 w-4 text-white/70" />
                          {selectedBooking.customerEmail}
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-white/70" />
                          {selectedBooking.customerPhone}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-white mb-3">Vehicle & Dates</h3>
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="text-white/70">Vehicle:</span> {selectedBooking.vehicleName}
                        </p>
                        {selectedBooking.vehiclePlate && (
                          <p>
                            <span className="text-white/70">Plate:</span> {selectedBooking.vehiclePlate}
                          </p>
                        )}
                        <p>
                          <span className="text-white/70">Pickup:</span>{" "}
                          {format(new Date(selectedBooking.pickupDate), "PPP")}
                        </p>
                        <p>
                          <span className="text-white/70">Return:</span>{" "}
                          {format(new Date(selectedBooking.returnDate), "PPP")}
                        </p>
                        <p>
                          <span className="text-white/70">Duration:</span>{" "}
                          {calculateDays(selectedBooking.pickupDate, selectedBooking.returnDate)} day
                          {calculateDays(selectedBooking.pickupDate, selectedBooking.returnDate) !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-white mb-3">Locations</h3>
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="text-white/70">Pickup:</span> {selectedBooking.pickupLocation}
                        </p>
                        <p>
                          <span className="text-white/70">Drop-off:</span> {selectedBooking.dropoffLocation}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedBooking.notes && (
                    <div>
                      <h3 className="font-semibold text-white mb-3">Special Notes</h3>
                      <p className="text-sm text-white bg-white/10 p-3 rounded">{selectedBooking.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Edit Dialog (local state only for now) */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent
              forceMount
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
              className="max-w-xl md:max-w-2xl bg-white/[0.04] backdrop-blur-xl ring-1 ring-white/10 text-white"
            >
              <DialogHeader>
                <DialogTitle className="text-white text-xl md:text-2xl">Edit Booking</DialogTitle>
              </DialogHeader>
              {selectedBooking && (
                <form onSubmit={handleUpdateBooking} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-status" className="text-white/80 font-medium">
                      Booking Status
                    </Label>
                    <Select
                      value={editFormData.status}
                      onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                    >
                      <SelectTrigger className="h-10 md:h-11 bg-white/5 border-white/10 text-white hover:bg-white/10">
                        <SelectValue placeholder="Choose status" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900/90 backdrop-blur-xl border-white/10 text-white">
                        <SelectItem value="pending" className="hover:bg-white/10">Pending</SelectItem>
                        <SelectItem value="confirmed" className="hover:bg-white/10">Confirmed</SelectItem>
                        <SelectItem value="completed" className="hover:bg-white/10">Completed</SelectItem>
                        <SelectItem value="cancelled" className="hover:bg-white/10">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-notes" className="text-white/80 font-medium">
                      Notes
                    </Label>
                    <Input
                      id="edit-notes"
                      placeholder="Add notes about this booking..."
                      value={editFormData.notes}
                      onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                      className="h-10 md:h-11 bg-white/5 border-white/10 text-white placeholder:text-white/50"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="submit"
                      className="h-10 md:h-11 px-4 bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-white font-bold shadow-lg shadow-cyan-500/20"
                    >
                      Update Booking
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditDialogOpen(false)
                        setSelectedBooking(null)
                      }}
                      className="h-10 md:h-11 bg-white/5 hover:bg-white/10 border-white/10 text-white"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </div>
  )
}

/* -------- Default export with built-in auth check (replaces AdminAuthGuard) -------- */
export default function BookingManagementPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    const ok = typeof window !== "undefined" && localStorage.getItem("adminAuth") === "true"
    setAuthed(ok)
    setReady(true)
    if (!ok) router.replace("/admin/login")
  }, [router])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Checking admin session…
      </div>
    )
  }
  if (!authed) return null

  return <BookingManagementContent />
}
