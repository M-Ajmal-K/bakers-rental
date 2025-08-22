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

// --- Mock booking data ---
const initialBookings = [
  {
    id: 1,
    bookingRef: "BK-2024-001",
    customerName: "John Smith",
    customerEmail: "john.smith@email.com",
    customerPhone: "+679 123 4567",
    vehicleId: 1,
    vehicleName: "Toyota RAV4",
    pickupDate: "2024-08-22",
    returnDate: "2024-08-25",
    pickupLocation: "Nadi Airport",
    dropoffLocation: "Suva City Center",
    totalAmount: 255,
    status: "confirmed",
    createdAt: "2024-08-20T10:30:00Z",
    notes: "Need child seat",
  },
  {
    id: 2,
    bookingRef: "BK-2024-002",
    customerName: "Sarah Johnson",
    customerEmail: "sarah.j@email.com",
    customerPhone: "+679 234 5678",
    vehicleId: 3,
    vehicleName: "Nissan X-Trail",
    pickupDate: "2024-08-23",
    returnDate: "2024-08-26",
    pickupLocation: "Denarau Island",
    dropoffLocation: "Denarau Island",
    totalAmount: 270,
    status: "pending",
    createdAt: "2024-08-21T14:15:00Z",
    notes: "",
  },
  {
    id: 3,
    bookingRef: "BK-2024-003",
    customerName: "Mike Wilson",
    customerEmail: "mike.wilson@email.com",
    customerPhone: "+679 345 6789",
    vehicleId: 4,
    vehicleName: "Toyota Hiace",
    pickupDate: "2024-08-18",
    returnDate: "2024-08-20",
    pickupLocation: "Suva City Center",
    dropoffLocation: "Nadi Airport",
    totalAmount: 220,
    status: "completed",
    createdAt: "2024-08-16T09:45:00Z",
    notes: "Group of 10 people",
  },
  {
    id: 4,
    bookingRef: "BK-2024-004",
    customerName: "Emma Davis",
    customerEmail: "emma.davis@email.com",
    customerPhone: "+679 456 7890",
    vehicleId: 8,
    vehicleName: "Toyota Corolla",
    pickupDate: "2024-08-24",
    returnDate: "2024-08-28",
    pickupLocation: "Coral Coast",
    dropoffLocation: "Lautoka",
    totalAmount: 240,
    status: "confirmed",
    createdAt: "2024-08-22T16:20:00Z",
    notes: "First time in Fiji",
  },
  {
    id: 5,
    bookingRef: "BK-2024-005",
    customerName: "David Brown",
    customerEmail: "david.brown@email.com",
    customerPhone: "+679 567 8901",
    vehicleId: 2,
    vehicleName: "Honda Odyssey",
    pickupDate: "2024-08-25",
    returnDate: "2024-08-27",
    pickupLocation: "Pacific Harbour",
    dropoffLocation: "Savusavu",
    totalAmount: 240,
    status: "cancelled",
    createdAt: "2024-08-19T11:10:00Z",
    notes: "Family vacation cancelled",
  },
]

const bookingStatuses = ["all", "pending", "confirmed", "completed", "cancelled"] as const
const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
}

type BookingStatus = typeof bookingStatuses[number]

interface Booking {
  id: number
  bookingRef: string
  customerName: string
  customerEmail: string
  customerPhone: string
  vehicleId: number
  vehicleName: string
  pickupDate: string
  returnDate: string
  pickupLocation: string
  dropoffLocation: string
  totalAmount: number
  status: BookingStatus | string
  createdAt: string
  notes: string
}

/* ---------------- Mobile card for bookings (no logic changed) ---------------- */
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
  onDelete: (id: number) => void
  getStatusBadge: (s: string) => JSX.Element
  calculateDays: (a: string, b: string) => number
}) {
  return (
    <Card className="border-0 glass-effect-dark">
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
            className="h-8 px-3 glass-effect-dark text-white border-white/20 hover:bg-white/10"
          >
            <Eye className="h-3.5 w-3.5 mr-1" /> View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(booking)}
            className="h-8 px-3 glass-effect-dark text-white border-white/20 hover:bg-white/10"
          >
            <Edit className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(booking.id)}
            className="h-8 px-3 glass-effect-dark text-red-400 border-red-500/30 hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
})

function BookingManagementContent() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>(initialBookings)
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>(initialBookings)
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [editFormData, setEditFormData] = useState({ status: "", notes: "" })

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

  // Filter bookings on changes
  useEffect(() => {
    let filtered = bookings
    if (statusFilter !== "all") filtered = filtered.filter((b) => b.status === statusFilter)
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (b) =>
          b.customerName.toLowerCase().includes(q) ||
          b.bookingRef.toLowerCase().includes(q) ||
          b.vehicleName.toLowerCase().includes(q),
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

  const handleUpdateBooking = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBooking) return
    const updated = { ...selectedBooking, status: editFormData.status, notes: editFormData.notes }
    setBookings((prev) => prev.map((b) => (b.id === selectedBooking.id ? updated : b)))
    setIsEditDialogOpen(false)
    setSelectedBooking(null)
  }

  const handleDeleteBooking = (id: number) => {
    if (confirm("Are you sure you want to delete this booking?")) {
      setBookings((prev) => prev.filter((b) => b.id !== id))
    }
  }

  const getStatusBadge = (status: string) => {
    const colorClass = (statusColors as any)[status] || "bg-gray-100 text-gray-800"
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
    <div className="min-h-screen bg-gradient-to-br from-accent via-primary/20 to-secondary/20">
      <nav className="sticky top-0 z-50 glass-effect-dark border-b border-white/10">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <Link href="/admin/dashboard" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 md:w-12 md:h-12 gradient-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Car className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div>
                <span className="text-xl md:text-2xl font-bold text-white leading-none">Bakers Rentals</span>
                <p className="text-xs md:text-sm text-white/80">Booking Management</p>
              </div>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="h-9 md:h-10 px-3 md:px-4 btn-3d glass-effect-dark text-white border-white/20 hover:bg-white/10 bg-transparent"
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
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 md:mb-4 drop-shadow-lg">Booking Management</h1>
            <p className="text-white/80 text-base md:text-xl">View and manage customer reservations</p>
          </div>

          {/* Filters */}
          <div className="fade-in-up mb-6 md:mb-8" style={{ animationDelay: "0.2s" }}>
            <Card className="card-3d border-0 glass-effect-dark">
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
                      placeholder="Search by customer, ref, or vehicle..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="mt-2 h-10 md:h-11 btn-3d glass-effect-dark text-white placeholder:text-white/50 border-white/20"
                    />
                  </div>
                  <div className="w-full md:w-48">
                    <Label htmlFor="status" className="text-white/80 font-medium text-sm md:text-base">
                      Status Filter
                    </Label>
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BookingStatus | "all")}>
                      <SelectTrigger className="mt-2 h-10 md:h-11 btn-3d glass-effect-dark text-white border-white/20">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent className="glass-effect-dark border-white/20">
                        {bookingStatuses.map((status) => (
                          <SelectItem key={status} value={status} className="text-white hover:bg-white/10">
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
            {filteredBookings.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-white/40 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-1">No bookings found</h3>
                <p className="text-white/70 text-sm">Try adjusting your filters to see more results</p>
              </div>
            )}
          </div>

          {/* Desktop/Tablet: Table */}
          <div className="fade-in-up hidden md:block" style={{ animationDelay: "0.4s" }}>
            <Card className="card-3d border-0 glass-effect-dark">
              <CardHeader>
                <CardTitle className="text-white text-2xl">All Bookings ({filteredBookings.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className="text-white/80">Booking Ref</TableHead>
                        <TableHead className="text-white/80">Customer</TableHead>
                        <TableHead className="text-white/80">Vehicle</TableHead>
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
                                className="btn-3d glass-effect-dark text-white border-white/20 hover:bg-white/10"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditBooking(booking)}
                                className="btn-3d glass-effect-dark text-white border-white/20 hover:bg-white/10"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteBooking(booking.id)}
                                className="btn-3d glass-effect-dark text-red-400 border-red-500/30 hover:bg-red-500/10"
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

                {filteredBookings.length === 0 && (
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
              className="max-w-xl md:max-w-2xl glass-effect-dark border-white/20 backdrop-blur-md data-[state=open]:bg-black/20"
            >
              <div className="pointer-events-none fixed inset-0 -z-10 bg-black/40 backdrop-blur-sm" />
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
                      <p className="text-sm text-white/70 bg-white/10 p-3 rounded">{selectedBooking.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent
              forceMount
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
              className="max-w-xl md:max-w-2xl glass-effect-dark border-white/20 backdrop-blur-md data-[state=open]:bg-black/20"
            >
              <div className="pointer-events-none fixed inset-0 -z-10 bg-black/40 backdrop-blur-sm" />
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
                      <SelectTrigger className="h-10 md:h-11 btn-3d glass-effect-dark text-white border-white/20 hover:bg-white/10">
                        <SelectValue placeholder="Choose status" />
                      </SelectTrigger>
                      <SelectContent className="glass-effect-dark border-white/20">
                        <SelectItem value="pending" className="text-white hover:bg-white/10">
                          Pending
                        </SelectItem>
                        <SelectItem value="confirmed" className="text-white hover:bg-white/10">
                          Confirmed
                        </SelectItem>
                        <SelectItem value="completed" className="text-white hover:bg-white/10">
                          Completed
                        </SelectItem>
                        <SelectItem value="cancelled" className="text-white hover:bg-white/10">
                          Cancelled
                        </SelectItem>
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
                      className="h-10 md:h-11 btn-3d glass-effect-dark text-white placeholder:text-white/50 border-white/20"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button type="submit" className="h-10 md:h-11 px-4 bg-primary hover:bg-primary/90 text-white">
                      Update Booking
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditDialogOpen(false)
                        setSelectedBooking(null)
                      }}
                      className="h-10 md:h-11 btn-3d glass-effect-dark text-white border-white/20 hover:bg-white/10"
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

// -------- Default export with built-in auth check (replaces AdminAuthGuard) --------
export default function BookingManagementPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    // Client-only check
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
