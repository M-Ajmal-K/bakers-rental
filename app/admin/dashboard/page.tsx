// app/admin/dashboard/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Car,
  Calendar,
  Settings,
  LogOut,
  BarChart3,
  TrendingUp,
  Shield,
  MapPin,
  User,
  Clock,
  Plane, // NEW: for flight number
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { AdminAuthGuard } from "@/components/admin-auth-guard";

/* --------------------------------- Types --------------------------------- */
type BookingRow = {
  id: string;
  vehicle_id: string;
  customer_name: string;
  contact_number: string | null;
  email: string | null;
  pickup_location: string;
  dropoff_location: string;
  start_date: string; // YYYY-MM-DD (DATE)
  end_date: string; // YYYY-MM-DD (DATE)
  total_price: number;
  created_at: string;
  status: string;
  code: string | null;
  license_url: string | null;
  pickup_time: string | null; // "HH:MM:SS" or null
  dropoff_time: string | null; // "HH:MM:SS" or null
  flight_number?: string | null; // NEW
  _vehicle?: {
    id: string;
    title: string;
    registration_number: string | null;
  };
};

type UnifiedTaskType = "Deliver" | "Pick up";

type UnifiedTask = {
  type: UnifiedTaskType;
  time: string; // HH:MM
  bookingId: string;
  bookingCode: string;
  vehicleTitle: string;
  plate: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  fromLocation: string; // where staff picks the vehicle
  toLocation: string; // where staff drops the vehicle next
  bufferMinutes?: number; // only when both end & start same day for same vehicle
  flightNumber?: string | null; // NEW
};

type ViewKey = "today" | "tomorrow" | "dayAfter";

function DashboardContent() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ vehicles: 0, bookings: 0, revenue: 0 });

  /* ---------------- Tasks state ---------------- */
  const [allBookings, setAllBookings] = useState<BookingRow[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [activeTasks, setActiveTasks] = useState<UnifiedTask[]>([]);
  const [activeDateLabel, setActiveDateLabel] = useState<string>("");

  /* Auto-switch control: true until an operator clicks a day toggle */
  const [autoEnabled, setAutoEnabled] = useState<boolean>(true);

  const router = useRouter();

  const fmtFJD = new Intl.NumberFormat("en-FJ", {
    style: "currency",
    currency: "FJD",
    maximumFractionDigits: 2,
  });

  /* ----------------------------- Anim on scroll ---------------------------- */
  useEffect(() => {
    const handleVisibility = () => {
      document.querySelectorAll(".fade-in-up").forEach((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) el.classList.add("animate");
      });
    };
    window.addEventListener("scroll", handleVisibility);
    handleVisibility();
    return () => window.removeEventListener("scroll", handleVisibility);
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut().catch(() => {});
      await fetch("/api/admin/session", { method: "DELETE", credentials: "include" });
    } finally {
      router.replace("/admin/login");
    }
  };

  /* ------------------------------- Live metrics ---------------------------- */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { count: vehicleCount, error: vErr } = await supabase
          .from("vehicles")
          .select("*", { count: "exact", head: true });
        if (vErr) throw vErr;

        const { count: bookingCount, error: bErr } = await supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .in("status", ["confirmed", "Confirmed"]);
        if (bErr) throw bErr;

        const { data: revRows, error: rErr } = await supabase
          .from("bookings")
          .select("total_price")
          .in("status", ["confirmed", "Confirmed"]);
        if (rErr) throw rErr;

        const revenue = (revRows || []).reduce((sum, r: any) => {
          const v = Number(r?.total_price ?? 0);
          return sum + (Number.isFinite(v) ? v : 0);
        }, 0);

        if (!cancelled) {
          setMetrics({
            vehicles: vehicleCount || 0,
            bookings: bookingCount || 0,
            revenue,
          });
        }
      } catch (err) {
        console.error("[AdminDashboard] metrics error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------------- Fiji time helpers ------------------- */
  const pacificFiji = "Pacific/Fiji";

  const formatYMD = (d: Date) => {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: pacificFiji,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = fmt.formatToParts(d);
    const y = parts.find((p) => p.type === "year")!.value;
    const m = parts.find((p) => p.type === "month")!.value;
    const dd = parts.find((p) => p.type === "day")!.value;
    return `${y}-${m}-${dd}`;
  };

  const addDaysYMD = (ymd: string, days: number) => {
    const [y, m, d] = ymd.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + days);
    return formatYMD(dt);
  };

  const nowFiji = () => new Date(new Date().toLocaleString("en-US", { timeZone: pacificFiji }));
  const hourFiji = () => nowFiji().getHours();

  const getTodayYMD = () => formatYMD(nowFiji());

  const defaultView: ViewKey = useMemo(() => {
    // 0:00–14:59 => today, 15:00+ => tomorrow
    return hourFiji() >= 15 ? "tomorrow" : "today";
  }, []);

  const [view, setView] = useState<ViewKey>(defaultView);

  const viewToYMD = (v: ViewKey) => {
    const today = getTodayYMD();
    if (v === "today") return today;
    if (v === "tomorrow") return addDaysYMD(today, 1);
    return addDaysYMD(today, 2);
  };

  const activeYMD = useMemo(() => viewToYMD(view), [view]);

  /* ----------------------- Load bookings once -------------------- */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setTasksLoading(true);
      try {
        const res = await fetch("/api/admin/bookings/list", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { "Cache-Control": "no-store" },
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || "Failed to fetch /api/admin/bookings/list");
        }
        const json = await res.json().catch(() => null);
        const items: BookingRow[] = Array.isArray(json?.items) ? json.items : [];

        // status-normalize
        const normalized = items.filter((r) => {
          const s = String(r.status || "").toLowerCase();
          return s === "confirmed" || s === "completed";
        });

        if (!cancelled) setAllBookings(normalized);
      } catch (e) {
        console.error("[AdminDashboard] fetch bookings error:", e);
        if (!cancelled) setAllBookings([]);
      } finally {
        if (!cancelled) setTasksLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* -------- Build tasks whenever bookings or view (date) changes -------- */
  useEffect(() => {
    const ymd = activeYMD;
    setActiveDateLabel(ymd);

    const rowsStart = allBookings.filter((r) => r.start_date === ymd);
    const rowsEnd = allBookings.filter((r) => r.end_date === ymd);

    const endByVehicle = new Map<string, BookingRow[]>();
    rowsEnd.forEach((b) => {
      const list = endByVehicle.get(b.vehicle_id) || [];
      list.push(b);
      endByVehicle.set(b.vehicle_id, list);
    });

    const startByVehicle = new Map<string, BookingRow[]>();
    rowsStart.forEach((b) => {
      const list = startByVehicle.get(b.vehicle_id) || [];
      list.push(b);
      startByVehicle.set(b.vehicle_id, list);
    });

    const toHm = (timeStr: string | null | undefined) => {
      if (!timeStr) return null;
      const [hh, mm] = timeStr.split(":");
      return `${hh}:${mm}`;
    };
    const defaultPickupTime = "09:00";
    const defaultDropoffTime = "17:00";

    const minutesBetween = (startHm: string, endHm: string) => {
      const [sh, sm] = startHm.split(":").map(Number);
      const [eh, em] = endHm.split(":").map(Number);
      return eh * 60 + em - (sh * 60 + sm);
    };

    const tasks: UnifiedTask[] = [];

    // Deliver rows for START bookings
    for (const startB of rowsStart) {
      const vehTitle = startB._vehicle?.title || "Vehicle";
      const plate = startB._vehicle?.registration_number || "";
      const prevEnds = (endByVehicle.get(startB.vehicle_id) || []).sort((a, b) =>
        (a.dropoff_time || "").localeCompare(b.dropoff_time || "")
      );
      const prevEnd = prevEnds[0];

      const startAt = toHm(startB.pickup_time) || defaultPickupTime;
      const prevEndAt = prevEnd ? toHm(prevEnd.dropoff_time) || defaultDropoffTime : undefined;
      const buffer = prevEndAt ? minutesBetween(prevEndAt, startAt) : undefined;

      const from = prevEnd ? prevEnd.dropoff_location : "(Depot / As arranged)";
      const to = startB.pickup_location;

      tasks.push({
        type: "Deliver",
        time: startAt,
        bookingId: startB.id,
        bookingCode: startB.code || startB.id.slice(0, 8).toUpperCase(),
        vehicleTitle: vehTitle,
        plate,
        customerName: startB.customer_name,
        customerPhone: startB.contact_number,
        customerEmail: startB.email,
        fromLocation: from,
        toLocation: to,
        bufferMinutes: buffer,
        flightNumber: startB.flight_number ?? null, // NEW
      });
    }

    // Pure pickup rows for END bookings without a START on same day
    for (const endB of rowsEnd) {
      const hasStart = (startByVehicle.get(endB.vehicle_id) || []).length > 0;
      if (hasStart) continue; // already represented by a Deliver row
      tasks.push({
        type: "Pick up",
        time: toHm(endB.dropoff_time) || defaultDropoffTime,
        bookingId: endB.id,
        bookingCode: endB.code || endB.id.slice(0, 8).toUpperCase(),
        vehicleTitle: endB._vehicle?.title || "Vehicle",
        plate: endB._vehicle?.registration_number || "",
        customerName: endB.customer_name,
        customerPhone: endB.contact_number,
        customerEmail: endB.email,
        fromLocation: endB.dropoff_location,
        toLocation: "(Depot / As arranged)",
        flightNumber: endB.flight_number ?? null, // NEW
      });
    }

    tasks.sort((a, b) => {
      const t = a.time.localeCompare(b.time);
      if (t !== 0) return t;
      if (a.type === b.type) return 0;
      return a.type === "Pick up" ? -1 : 1;
    });

    setActiveTasks(tasks);
  }, [activeYMD, allBookings]);

  /* -------- Auto-switch view at 3pm and midnight (Fiji) --------
     Runs ONLY while autoEnabled is true. Any manual click disables auto. */
  useEffect(() => {
    if (!autoEnabled) return;

    const tick = () => {
      const h = hourFiji();
      const should: ViewKey = h >= 15 ? "tomorrow" : "today";
      setView((prev) => (prev !== should ? should : prev));
    };

    tick(); // initialize once on mount
    const id = setInterval(tick, 60 * 1000); // check every minute
    return () => clearInterval(id);
  }, [autoEnabled]);

  /* ----- Button helpers: style + manual override handler ----- */
  const selectView = (v: ViewKey) => {
    setView(v);
    setAutoEnabled(false); // manual selection: pause auto to keep what the admin chose
  };

  const fmtBuffer = (mins?: number) => {
    if (mins == null) return "—";
    const sign = mins >= 0 ? "" : "-";
    const abs = Math.abs(mins);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    if (h === 0) return `${sign}${m}m`;
    return `${sign}${h}h ${m}m`;
  };

  const bufferClass = (mins?: number) =>
    mins == null
      ? "text-white/70"
      : mins < 0
      ? "text-rose-400 font-semibold"
      : mins < 60
      ? "text-amber-300"
      : "text-emerald-300";

  const iconGradients = [
    "bg-gradient-to-br from-cyan-500 to-sky-500",
    "bg-gradient-to-br from-violet-500 to-fuchsia-500",
    "bg-gradient-to-br from-emerald-500 to-teal-500",
  ];

  const statCards = [
    { title: "Total Vehicles", value: loading ? "—" : String(metrics.vehicles), icon: Car, hint: "From vehicles table" },
    { title: "Active Bookings", value: loading ? "—" : String(metrics.bookings), icon: Calendar, hint: "Confirmed only" },
    { title: "Revenue (All Time)", value: loading ? "—" : fmtFJD.format(metrics.revenue), icon: BarChart3, hint: "From confirmed bookings" },
  ];

  /* --------------------------------- Render -------------------------------- */
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background accents */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl" />
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
                <span className="text-white font-medium">Admin</span>
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
            <p className="text-cyan-100/80 text-lg">Manage your premium vehicle rental business</p>
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

          {/* Tasks — unified table with view toggle */}
          <div className="fade-in-up" style={{ animationDelay: "0.8s" }}>
            <Card className="border-0 bg-white/[0.04] backdrop-blur-xl ring-1 ring-white/10 shadow-xl shadow-black/20">
              <CardHeader className="flex flex-col gap-3">
                {/* Responsive header: buttons wrap on mobile */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="text-white text-2xl">
                    Tasks
                    {activeDateLabel && (
                      <span className="text-white/60 text-base ml-2">({activeDateLabel})</span>
                    )}
                  </CardTitle>

                  {/* Toggle buttons (wrap on small screens) */}
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {/* TODAY */}
                    <Button
                      size="sm"
                      variant={view === "today" ? "default" : "outline"}
                      className={
                        view === "today"
                          ? "bg-cyan-600 text-white"
                          : "bg-transparent hover:bg-white/10 text-white border border-white/30"
                      }
                      onClick={() => selectView("today")}
                    >
                      Today
                    </Button>

                    {/* TOMORROW */}
                    <Button
                      size="sm"
                      variant={view === "tomorrow" ? "default" : "outline"}
                      className={
                        view === "tomorrow"
                          ? "bg-cyan-600 text-white"
                          : "bg-transparent hover:bg-white/10 text-white border border-white/30"
                      }
                      onClick={() => selectView("tomorrow")}
                    >
                      Tomorrow
                    </Button>

                    {/* DAY AFTER */}
                    <Button
                      size="sm"
                      variant={view === "dayAfter" ? "default" : "outline"}
                      className={
                        view === "dayAfter"
                          ? "bg-cyan-600 text-white"
                          : "bg-transparent hover:bg-white/10 text-white border border-white/30"
                      }
                      onClick={() => selectView("dayAfter")}
                    >
                      Day After
                    </Button>
                  </div>
                </div>

                <p className="text-cyan-100/70 text-sm">
                  One list per day. Each row shows the booking, customer, vehicle, where to pick the vehicle
                  from (previous customer’s drop-off) and where to drop it next (next customer’s pick-up).
                  The Buffer column shows turnaround time when a vehicle ends and starts the same day. View
                  auto-switches at 3:00pm (Fiji) to Tomorrow; after midnight it becomes Today. Clicking any
                  button pauses auto so your selection stays visible.
                </p>
              </CardHeader>

              <CardContent>
                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {tasksLoading ? (
                    <p className="text-white/70 text-sm">Loading…</p>
                  ) : activeTasks.length === 0 ? (
                    <p className="text-white/60 text-sm">No tasks scheduled for this day.</p>
                  ) : (
                    activeTasks.map((t) => (
                      <div key={t.bookingId} className="rounded-lg bg-white/5 ring-1 ring-white/10 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase tracking-wide text-white/60">{t.type}</span>
                          <span className="text-white font-semibold flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {t.time}
                          </span>
                        </div>

                        <div className="mt-2 text-white font-medium">{t.vehicleTitle}</div>
                        {t.plate && <div className="text-white/60 text-xs">{t.plate}</div>}

                        <div className="mt-2 text-white/90 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{t.customerName}</span>
                        </div>
                        {t.customerPhone && (
                          <a href={`tel:${t.customerPhone}`} className="text-cyan-300 text-xs underline">
                            {t.customerPhone}
                          </a>
                        )}
                        {t.customerEmail && <div className="text-white/60 text-xs">{t.customerEmail}</div>}
                        {t.flightNumber && (
                          <div className="text-white/70 text-xs mt-1 flex items-center gap-1.5">
                            <Plane className="h-3.5 w-3.5" />
                            Flight: {t.flightNumber}
                          </div>
                        )}

                        <div className="mt-3 grid grid-cols-1 gap-2">
                          <div className="text-white/80 text-sm flex items-start gap-2">
                            <MapPin className="h-4 w-4 mt-0.5" />
                            <div>
                              <div className="text-white/60 text-xs">Pick vehicle from</div>
                              <div className="whitespace-pre-wrap">{t.fromLocation}</div>
                            </div>
                          </div>
                          <div className="text-white/80 text-sm flex items-start gap-2">
                            <MapPin className="h-4 w-4 mt-0.5" />
                            <div>
                              <div className="text-white/60 text-xs">Drop vehicle to</div>
                              <div className="whitespace-pre-wrap">{t.toLocation}</div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 text-xs text-white/70">
                          Booking: <span className="font-mono">{t.bookingCode}</span>
                          {t.type === "Deliver" && (
                            <> · Buffer: <span className={`${bufferClass(t.bufferMinutes)}`}>{fmtBuffer(t.bufferMinutes)}</span></>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  {tasksLoading ? (
                    <p className="text-white/70 text-sm px-2">Loading…</p>
                  ) : activeTasks.length === 0 ? (
                    <p className="text-white/60 text-sm px-2">No tasks scheduled for this day.</p>
                  ) : (
                    <table className="w-full text-sm border-separate border-spacing-y-2">
                      <thead>
                        <tr className="text-white/70">
                          <th className="px-3 py-2 text-left w-[72px]">Time</th>
                          <th className="px-3 py-2 text-left">Task</th>
                          <th className="px-3 py-2 text-left">Booking</th>
                          <th className="px-3 py-2 text-left">Customer</th>
                          <th className="px-3 py-2 text-left">Vehicle</th>
                          <th className="px-3 py-2 text-left">Pick vehicle from</th>
                          <th className="px-3 py-2 text-left">Drop vehicle to</th>
                          <th className="px-3 py-2 text-left">Buffer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeTasks.map((t) => (
                          <tr key={t.bookingId} className="bg-white/5 hover:bg-white/10 rounded-lg">
                            <td className="px-3 py-3 text-white/90 align-top">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" /> {t.time}
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top">
                              <span className="text-white">{t.type}</span>
                            </td>
                            <td className="px-3 py-3 align-top font-mono text-white/90">{t.bookingCode}</td>
                            <td className="px-3 py-3 align-top">
                              <div className="text-white flex items-center gap-2">
                                <User className="h-4 w-4" /> {t.customerName}
                              </div>
                              {t.customerPhone && (
                                <a href={`tel:${t.customerPhone}`} className="text-cyan-300 text-xs underline">
                                  {t.customerPhone}
                                </a>
                              )}
                              {t.customerEmail && (
                                <div className="text-white/60 text-xs">{t.customerEmail}</div>
                              )}
                              {t.flightNumber && (
                                <div className="text-white/70 text-xs flex items-center gap-1.5 mt-0.5">
                                  <Plane className="h-3.5 w-3.5" /> Flight: {t.flightNumber}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3 align-top">
                              <div className="text-white">{t.vehicleTitle}</div>
                              {t.plate && <div className="text-white/60 text-xs">{t.plate}</div>}
                            </td>
                            <td className="px-3 py-3 align-top">
                              <div className="text-white whitespace-pre-wrap">{t.fromLocation}</div>
                            </td>
                            <td className="px-3 py-3 align-top">
                              <div className="text-white whitespace-pre-wrap">{t.toLocation}</div>
                            </td>
                            <td className="px-3 py-3 align-top">
                              <span className={`text-xs ${bufferClass(t.bufferMinutes)}`}>
                                {t.type === "Deliver" ? fmtBuffer(t.bufferMinutes) : "—"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <AdminAuthGuard>
      <DashboardContent />
    </AdminAuthGuard>
  );
}
