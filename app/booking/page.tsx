"use client";

import type React from "react";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Car,
  CalendarIcon,
  MapPin,
  User,
  CheckCircle,
  Sparkles,
  Edit,
  MessageCircle,
  Wallet,
  FileCheck2,
  Landmark,
  Banknote,
  Smartphone,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { Vehicle } from "@/components/vehicles/VehicleTypes";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import JsonLd from "@/components/seo/JsonLd";

/* -------------------------------- Helpers -------------------------------- */

const locations = [
  "Nadi Airport",
  "Suva City Center",
  "Denarau Island",
  "Coral Coast",
  "Pacific Harbour",
  "Lautoka",
  "Savusavu",
  "Labasa",
];

type BookedRange = { start: Date; end: Date };

function atStartOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Parse "YYYY-MM-DD" as **local** midnight (prevents UTC shift).
function parseDateOnlyToLocal(dateLike: string | Date): Date {
  if (dateLike instanceof Date) return atStartOfDay(dateLike);
  if (typeof dateLike === "string") {
    if (dateLike.includes("T")) {
      // Full ISO; trust it but normalize to local midnight.
      return atStartOfDay(new Date(dateLike));
    }
    // "YYYY-MM-DD" — construct as local date.
    const [y, m, d] = dateLike.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }
  return atStartOfDay(new Date(dateLike));
}

function isSameOrBefore(a: Date, b: Date) {
  return atStartOfDay(a).getTime() <= atStartOfDay(b).getTime();
}

function dateInRange(d: Date, r: BookedRange) {
  const x = atStartOfDay(d).getTime();
  return x >= atStartOfDay(r.start).getTime() && x <= atStartOfDay(r.end).getTime();
}

function rangesOverlap(aStart: Date, aEnd: Date, r: BookedRange) {
  const s1 = atStartOfDay(aStart).getTime();
  const e1 = atStartOfDay(aEnd).getTime();
  const s2 = atStartOfDay(r.start).getTime();
  const e2 = atStartOfDay(r.end).getTime();
  return s1 <= e2 && s2 <= e1;
}

/* ---------------- Env for WhatsApp CTA (client-safe NEXT_PUBLIC_*) -------- */
const WHATSAPP_PHONE =
  (process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "").replace(/\D/g, "") || "6790000000";
const WHATSAPP_MSG_PREFIX =
  process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE_PREFIX ||
  "Hi Bakers Rentals, I've sent my payment receipt. My booking code is";

/* ---------------- Payment Information (as provided) ---------------- */

const BANK = {
  accountName: "BAKERS RENTAL CARS",
  bank: "BSP",
  accountNumber: "10332514",
  swift: "BOSPFJFJ",
  bsb: "069_014",
  poBox: "P.O BOX 1949 SIGATOKA",
  address: "KULUKULU SIGATOKA, FIJI ISLAND",
};

const RECEIVER = {
  fullName: "SAH MURSAD KHAN",
  address: "KULUKULU SIGATOKA",
  poBox: "P.O BOX 1949 SIGATOKA",
  licenceNumber: "381170",
};

const WALLET = {
  provider: "VODAFONE",
  number: "8716960",
  phoneContact: "+6798716960",
};

/* ---------------- Bond / Deposit ---------------- */
const BOND_FJD = 200; // Only this amount is due now; rental balance is paid on arrival.

/* ---------------- SEO: SITE_URL + Breadcrumb JSON-LD ---------------- */
const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

// Breadcrumb data
const breadcrumbBooking = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: `${SITE_URL}/`,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Booking",
      item: `${SITE_URL}/booking`,
    },
  ],
} as const;

/* -------------------------------- Component -------------------------------- */

export default function BookingPage() {
  const searchParams = useSearchParams();
  const preselectedVehicle = searchParams.get("vehicle");

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [pickupDate, setPickupDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [selectedVehicle, setSelectedVehicle] = useState(preselectedVehicle || "");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [showSummary, setShowSummary] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [bookingCode, setBookingCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // NEW: driver's license state
  const [licenseFile, setLicenseFile] = useState<File | null>(null);

  // availability state
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([]);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [confirming, setConfirming] = useState(false);

  /* ---------------- Load real vehicles from Supabase ---------------- */
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, title, category, rental_price, rental_price_5plus, rental_price_8plus, available")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[BookingPage] fetch vehicles error:", error);
        return;
      }

      const mapped: Vehicle[] =
        (data || []).map((v: any) => ({
          id: v.id,
          name: v.title,
          brand: "",
          model: "",
          category: v.category ?? "",
          pricePerDay: Number(v.rental_price ?? 0),

          // ✅ tiered prices (optional)
          pricePerDay5Plus: v.rental_price_5plus != null ? Number(v.rental_price_5plus) : undefined,
          pricePerDay8Plus: v.rental_price_8plus != null ? Number(v.rental_price_8plus) : undefined,

          available: Boolean(v.available),
          passengers: 0,
          transmission: "",
          fuel: "",
          image: null,
          imagePath: null,
          licensePlate: "",
          features: [],
          year: 0,
        })) || [];

      setVehicles(mapped);
    };

    load();
  }, []);

  /* ---------------- Animation on scroll (keep your effect) ---------------- */
  useEffect(() => {
    const handleVisibility = () => {
      const elements = document.querySelectorAll(".fade-in-up");
      elements.forEach((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
          el.classList.add("animate");
        }
      });
    };

    window.addEventListener("scroll", handleVisibility);
    handleVisibility(); // Check on mount
    return () => window.removeEventListener("scroll", handleVisibility);
  }, []);

  const selectedVehicleData = vehicles.find((v) => v.id.toString() === selectedVehicle);
  const availableVehicles = vehicles.filter((v) => v.available);

  /* ---------------- Fetch availability for selected vehicle ---------------- */
  useEffect(() => {
    const fetchAvailability = async () => {
      setBookedRanges([]);
      if (!selectedVehicle) return;

      setLoadingAvail(true);
      try {
        // Use secure server API (blocks CONFIRMED and recent PENDING holds)
        const res = await fetch(`/api/availability/${selectedVehicle}?includePending=1`);
        if (!res.ok) {
          const msg = await res.text();
          console.error("[BookingPage] availability API error:", msg);
          return;
        }
        const payload = await res.json(); // { ranges: [{start, end}, ...] }

        const ranges: BookedRange[] = (payload?.ranges ?? [])
          .map((r: any) => ({
            start: parseDateOnlyToLocal(r.start),
            end: parseDateOnlyToLocal(r.end),
          }))
          .sort((a: BookedRange, b: BookedRange) => a.start.getTime() - b.start.getTime());

        setBookedRanges(ranges);
      } catch (e) {
        console.error("[BookingPage] availability API error:", e);
      } finally {
        setLoadingAvail(false);
      }
    };

    fetchAvailability();
  }, [selectedVehicle]);

  /* ---------------- Derived: next available date note ---------------- */
  const nextAvailableFrom = useMemo(() => {
    const today = atStartOfDay(new Date());
    if (bookedRanges.length === 0) return today;

    const inBlock = bookedRanges.find((r) => dateInRange(today, r));
    if (inBlock) {
      const d = new Date(inBlock.end);
      d.setDate(d.getDate() + 1);
      return d;
    }

    const first = bookedRanges[0];
    if (isSameOrBefore(today, first.start)) return today;

    let day = new Date(today);
    while (bookedRanges.some((r) => dateInRange(day, r))) {
      day.setDate(day.getDate() + 1);
    }
    return day;
  }, [bookedRanges]);

  /* ---------------- Calendar disabled + cross-out helpers ---------------- */
  const todayStart = atStartOfDay(new Date());

  // Build DayPicker "matchers" for the booked ranges (for both styling and disabling)
  const rangeMatchers = useMemo(
    () => bookedRanges.map((r) => ({ from: r.start, to: r.end })),
    [bookedRanges]
  );

  // Use DayPicker's native disabled matchers instead of callback functions
  const pickupDisabledMatchers = useMemo(
    () => [{ before: todayStart }, ...rangeMatchers],
    [todayStart, rangeMatchers]
  );

  const returnDisabledMatchers = useMemo(
    () => [{ before: pickupDate ? atStartOfDay(pickupDate) : todayStart }, ...rangeMatchers],
    [pickupDate, todayStart, rangeMatchers]
  );

  // Class to visually cross booked days (typo fixed for after:-translate-y-1/2)
  const unavailableClass =
    "relative opacity-60 " +
    "before:content-[''] before:absolute before:left-1 before:right-1 before:top-1/2 before:h-[2px] before:-translate-y-1/2 before:bg-red-500/70 before:rotate-[-18deg] " +
    "after:content-[''] after:absolute after:left-1 after:right-1 after:top-1/2 after:h-[2px] after:-translate-y-1/2 after:bg-red-500/70 after:rotate-[18deg]";

  /* ---------------- Price helpers (tiered) ---------------- */

  const calculateDays = () => {
    if (pickupDate && returnDate) {
      const diffTime = Math.abs(returnDate.getTime() - pickupDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays || 1;
    }
    return 1;
  };

  // 👉 Applies single-tier rate to *all* days once threshold is met
  const calculateTieredTotal = (v: Vehicle, days: number) => {
    const base = v.pricePerDay;
    const rate5 = v.pricePerDay5Plus ?? base; // fallback if not set
    const rate8 = v.pricePerDay8Plus ?? rate5; // fallback if not set

    if (days <= 4) return days * base;   // base price only for ≤4 days
    if (days <= 7) return days * rate5;  // 5–7 days -> tier price × all days
    return days * rate8;                 // 8+ days -> higher tier × all days
  };

  // 👉 Breakdown reflects the single-tier pricing across all days
  const breakdownText = (v: Vehicle, days: number) => {
    const base = v.pricePerDay;
    const rate5 = v.pricePerDay5Plus ?? base;
    const rate8 = v.pricePerDay8Plus ?? rate5;

    let rate = base;
    if (days >= 8) rate = rate8;
    else if (days >= 5) rate = rate5;

    return `${days} × $${rate}`;
  };

  const calculateTotal = () => {
    if (selectedVehicleData) {
      return calculateTieredTotal(selectedVehicleData, calculateDays());
    }
    return 0;
  };

  // 🔥 Live "current tier" info used across UI (dates & summary)
  const currentTier = useMemo(() => {
    if (!selectedVehicleData) return null;
    const days = calculateDays();

    const base = selectedVehicleData.pricePerDay;
    const rate5 = selectedVehicleData.pricePerDay5Plus ?? base;
    const rate8 = selectedVehicleData.pricePerDay8Plus ?? rate5;

    let label = "Base (1–4 days)";
    let rate = base;

    if (days >= 8) {
      label = "8+ days tier";
      rate = rate8;
    } else if (days >= 5) {
      label = "5–7 days tier";
      rate = rate5;
    }

    return {
      days,
      label,
      rate,
      breakdown: breakdownText(selectedVehicleData, days),
      base,
      rate5,
      rate8,
    };
  }, [selectedVehicleData, pickupDate, returnDate]);

  /* ---------------- Submit & Confirm ---------------- */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (
      pickupDate &&
      returnDate &&
      selectedVehicle &&
      pickupLocation &&
      dropoffLocation &&
      customerInfo.name &&
      customerInfo.phone &&
      customerInfo.email
    ) {
      const overlaps = bookedRanges.some((r) => rangesOverlap(pickupDate, returnDate, r));
      if (overlaps) {
        alert(
          "The dates you selected overlap an existing booking for this vehicle. Please choose a different period."
        );
        return;
      }
      setShowSummary(true);
    }
  };

  const handleConfirmBooking = async () => {
    if (!pickupDate || !returnDate || !selectedVehicleData) {
      alert("Missing details to confirm.");
      return;
    }

    const overlaps = bookedRanges.some((r) => rangesOverlap(pickupDate, returnDate, r));
    if (overlaps) {
      alert(
        "The dates you selected now overlap an existing booking. Please go back and adjust your dates."
      );
      return;
    }

    setConfirming(true);
    setErrorMsg(null);
    try {
      // Build payload using YOUR real column names
      const payload = {
        vehicle_id: selectedVehicle,
        start_date: format(atStartOfDay(pickupDate), "yyyy-MM-dd"),
        end_date: format(atStartOfDay(returnDate), "yyyy-MM-dd"),
        pickup_location: pickupLocation,
        dropoff_location: dropoffLocation,
        customer_name: customerInfo.name,
        contact_number: customerInfo.phone,
        email: customerInfo.email,
        total_price: calculateTotal(),
      };

      // If a license image is attached, send multipart so the API can upload to Supabase Storage.
      // Otherwise, keep the existing JSON flow unchanged.
      let res: Response;
      if (licenseFile) {
        const form = new FormData();
        form.append("payload", JSON.stringify(payload));
        form.append("license", licenseFile, licenseFile.name);
        res = await fetch("/api/bookings/create", {
          method: "POST",
          body: form,
        });
      } else {
        res = await fetch("/api/bookings/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const msg = await res.text();
        console.error("[BookingPage] create API error:", msg);
        setErrorMsg(msg || "Failed to confirm booking. Please try again.");
        return;
      }

      const data = await res.json(); // { id, code, status }
      setBookingCode(data?.code ?? null);
      setShowSuccess(true);
      setShowPayment(true); // show payment dialog immediately
    } catch (err: any) {
      console.error("[BookingPage] create API error:", err);
      setErrorMsg(err?.message || "Failed to confirm booking. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  /* ---------------- SUCCESS SCREEN ---------------- */
  if (showSuccess) {
    const waHref = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
      `${WHATSAPP_MSG_PREFIX} ${bookingCode || ""}`
    )}`;

    // bond math for dialog
    const totalNow = calculateTotal();
    const balanceDue = Math.max(totalNow - BOND_FJD, 0);

    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {/* Payment dialog (auto-opened) */}
        <Dialog open={showPayment} onOpenChange={setShowPayment}>
          <DialogContent
            className={cn(
              "w-[calc(100vw-1rem)] sm:w-full sm:max-w-2xl lg:max-w-3xl",
              "max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]",
              "p-0 overflow-hidden rounded-2xl border-0 flex flex-col",
              "shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)]"
            )}
          >
            {/* Top bar to match theme */}
            <div className="relative overflow-hidden flex-shrink-0">
              <div className="gradient-primary h-20 sm:h-24 w-full" />
              <div className="absolute inset-0 bg-black/10" />
              <div className="absolute inset-0 flex items-center justify-between px-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-white text-base sm:text-lg">
                      Payment Instructions
                    </DialogTitle>
                    <DialogDescription className="text-white/80 text-xs sm:text-sm">
                      Choose your preferred method below. Send your receipt & booking code via WhatsApp.
                    </DialogDescription>
                  </div>
                </div>

                {bookingCode && (
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="text-white/80 text-xs">Booking Code</span>
                    <span className="font-mono text-sm font-semibold text-white bg-black/30 px-3 py-1.5 rounded-md">
                      {bookingCode}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 🔔 Bond notice */}
            <div className="px-4 sm:px-6 pt-4">
              <div className="rounded-xl bg-green-600/10 border border-green-500/30 p-3 sm:p-4 flex items-start gap-3">
                <div className="mt-0.5">
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                </div>
                <div className="text-sm sm:text-base">
                  <p className="font-semibold text-foreground">
                    Pay only the refundable bond: <span className="font-bold">$ {BOND_FJD} FJD</span>.
                  </p>
                  <p className="text-muted-foreground">
                    The rental balance is paid on arrival.
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Mobile booking code pill */}
              {bookingCode && (
                <div className="sm:hidden flex justify-center">
                  <div className="font-mono text-xs font-semibold text-foreground bg-muted px-3 py-1.5 rounded-md">
                    Code: {bookingCode}
                  </div>
                </div>
              )}

              {/* Summary row with bond/balance */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-background/70 border border-border/40 p-3 sm:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_20px_-6px_rgba(0,0,0,0.25)]">
                  <p className="text-xs text-muted-foreground">Total Trip</p>
                  <p className="text-lg font-semibold">${totalNow}</p>
                </div>
                <div className="rounded-xl bg-background/70 border border-green-500/40 p-3 sm:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_20px_-6px_rgba(0,0,0,0.25)]">
                  <p className="text-xs text-green-600">Due Now (Bond)</p>
                  <p className="text-lg font-semibold">${BOND_FJD} FJD</p>
                </div>
                <div className="rounded-xl bg-background/70 border border-border/40 p-3 sm:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_20px_-6px_rgba(0,0,0,0.25)]">
                  <p className="text-xs text-muted-foreground">Balance on Arrival</p>
                  <p className="text-lg font-semibold">${balanceDue}</p>
                </div>
              </div>

              {/* Bank Transfer */}
              <div className="rounded-xl border border-border/40 bg-gradient-to-br from-card to-card/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_25px_-5px_rgba(0,0,0,0.3)]">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <Landmark className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <h3 className="text-sm sm:text-base font-semibold text-foreground">
                      Direct Bank Transfer
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                    <InfoBox label="Account Name" value={BANK.accountName} />
                    <InfoBox label="Bank" value={BANK.bank} />
                    <InfoBox label="Account Number" value={BANK.accountNumber} />
                    <InfoBox label="SWIFT Code" value={BANK.swift} />
                    <InfoBox label="BSB" value={BANK.bsb} />
                    <InfoBox label="P.O. Box" value={BANK.poBox} />
                    <InfoBox label="Address" value={BANK.address} className="sm:col-span-2" />
                  </div>
                </div>
              </div>

              {/* Western Union / MoneyGram / M-PAiSA */}
              <div className="rounded-xl border border-border/40 bg-gradient-to-br from-primary/5 to-secondary/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_25px_-5px_rgba(0,0,0,0.3)]">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
                    <h3 className="text-sm sm:text-base font-semibold text-foreground">
                      Western Union / MoneyGram / M-PAiSA
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                    <InfoBox label="Full Name" value={RECEIVER.fullName} />
                    <InfoBox label="Licence Number" value={RECEIVER.licenceNumber} />
                    <InfoBox label="Address" value={RECEIVER.address} />
                    <InfoBox label="P.O. Box" value={RECEIVER.poBox} />
                  </div>
                </div>
              </div>

              {/* Mobile Wallet (Vodafone) */}
              <div className="rounded-xl border border-border/40 bg-gradient-to-br from-card to-card/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_25px_-5px_rgba(0,0,0,0.3)]">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <h3 className="text-sm sm:text-base font-semibold text-foreground">
                      Mobile Wallet ({WALLET.provider})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                    <InfoBox label="Wallet Number" value={WALLET.number} />
                    <InfoBox label="Phone Contact" value={WALLET.phoneContact} />
                  </div>
                </div>
              </div>

              {/* Steps / Notes */}
              <div className="rounded-xl border border-border/40 bg-gradient-to-br from-card to-card/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_25px_-5px_rgba(0,0,0,0.3)]">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <FileCheck2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <h3 className="text-sm sm:text-base font-semibold text-foreground">What to do next</h3>
                  </div>
                  <ol className="space-y-2 sm:space-y-2.5 text-sm">
                    <li className="flex gap-2">
                      <span className="shrink-0 mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">1</span>
                      <span>Send <strong>only the bond (${BOND_FJD} FJD)</strong> now using one of the methods above.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="shrink-0 mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">2</span>
                      <span>Keep your receipt (and MTCN for Western Union / MoneyGram).</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="shrink-0 mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">3</span>
                      <span>
                        Tap <strong>Open WhatsApp</strong> below and send us your receipt + booking code{" "}
                        <span className="font-mono font-semibold">{bookingCode || "(pending…)"}</span>.
                      </span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>

            <DialogFooter className="px-4 sm:px-6 py-4 sm:py-5 bg-background/70 border-t border-border/40 gap-2 sm:gap-3 flex-shrink-0">
              <Button asChild className="w-full sm:w-auto btn-3d bg-green-600 hover:bg-green-600/90">
                <a href={waHref} target="_blank" rel="noopener">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Open WhatsApp
                </a>
              </Button>
              <Button variant="outline" onClick={() => setShowPayment(false)} className="w-full sm:w-auto">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success card (your original styling kept) */}
        <div className="text-center fade-in-up animate px-4">
          <div className="relative mb-6 md:mb-8">
            <div className="w-24 h-24 md:w-32 md:h-32 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 animate-bounce">
              <CheckCircle className="h-12 w-12 md:h-16 md:w-16 text-white" />
            </div>
            <div className="absolute -top-3 -right-3 md:-top-4 md:-right-4">
              <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-secondary animate-pulse" />
            </div>
            <div className="absolute -bottom-3 -left-3 md:-bottom-4 md:-left-4">
              <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-primary animate-pulse" style={{ animationDelay: "0.5s" }} />
            </div>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">Booking Created!</h1>
          <p className="text-base md:text-xl text-muted-foreground mb-3 md:mb-4 max-w-md mx-auto">
            Your booking has been created and is <strong>pending confirmation</strong>.
          </p>
          {bookingCode && (
            <p className="text-sm md:text-base text-foreground mb-6">
              Your booking code: <span className="font-mono font-bold">{bookingCode}</span>
            </p>
          )}

          <div className="flex items-center gap-3 justify-center">
            <Button onClick={() => setShowPayment(true)} className="btn-3d bg-primary hover:bg-primary/90">
              View Payment Instructions
            </Button>
            <Button asChild className="btn-3d bg-primary hover:bg-primary/90 text-base md:text-lg px-6 md:px-8 py-4 md:py-6">
              <Link href="/">Return Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- SUMMARY SCREEN ---------------- */
  if (showSummary) {
    const days = calculateDays();
    const breakdown = selectedVehicleData ? breakdownText(selectedVehicleData, days) : "";
    const total = calculateTotal();
    const balanceDue = Math.max(total - BOND_FJD, 0);

    return (
      <div className="min-h-screen bg-background">
        <nav className="sticky top-0 z-50 glass-effect border-b border-border/20">
          <div className="container mx-auto px-4 py-3 md:py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center space-x-2 group">
                <Car className="h-7 w-7 md:h-8 md:w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
                <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Bakers Rentals
                </span>
              </Link>
            </div>
          </div>
        </nav>

        <section className="py-10 md:py-20 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="fade-in-up">
              <Card className="card-3d border-0 bg-gradient-to-br from-card to-card/50">
                <CardHeader className="text-center pb-6 md:pb-8">
                  <div className="w-16 h-16 md:w-20 md:h-20 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                    <CheckCircle className="h-8 w-8 md:h-10 md:w-10 text-white" />
                  </div>
                  <CardTitle className="text-2xl md:3xl text-foreground mb-2 md:mb-4">Booking Summary</CardTitle>
                  <p className="text-muted-foreground text-sm md:text-lg">Please review your booking details carefully</p>
                </CardHeader>
                <CardContent className="space-y-6 md:space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <Card className="border-0 bg-gradient-to-br from-primary/5 to-primary/10">
                      <CardContent className="p-4 md:p-6">
                        <h3 className="font-bold text-foreground mb-3 md:mb-4 flex items-center gap-2 text-base md:text-lg">
                          <Car className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                          Vehicle Details
                        </h3>
                        <div className="space-y-2 md:space-y-3 text-sm md:text-base">
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Vehicle:</span>
                            <span className="font-medium">{selectedVehicleData?.name}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Category:</span>
                            <span className="font-medium">{selectedVehicleData?.category}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Base Daily:</span>
                            <span className="font-bold text-primary">${selectedVehicleData?.pricePerDay}</span>
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-0 bg-gradient-to-br from-secondary/5 to-secondary/10">
                      <CardContent className="p-4 md:p-6">
                        <h3 className="font-bold text-foreground mb-3 md:mb-4 flex items-center gap-2 text-base md:text-lg">
                          <CalendarIcon className="h-4 w-4 md:h-5 md:w-5 text-secondary" />
                          Rental Period
                        </h3>
                        <div className="space-y-2 md:space-y-3 text-sm md:text-base">
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Pickup:</span>
                            <span className="font-medium">{pickupDate ? format(pickupDate, "PPP") : ""}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Return:</span>
                            <span className="font-medium">{returnDate ? format(returnDate, "PPP") : ""}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="font-bold text-secondary">
                              {days} day{days !== 1 ? "s" : ""}
                            </span>
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <Card className="border-0 bg-gradient-to-br from-accent/5 to-accent/10">
                      <CardContent className="p-4 md:p-6">
                        <h3 className="font-bold text-foreground mb-3 md:mb-4 flex items-center gap-2 text-base md:text-lg">
                          <MapPin className="h-4 w-4 md:h-5 md:w-5 text-accent" />
                          Locations
                        </h3>
                        <div className="space-y-2 md:space-y-3 text-sm md:text-base">
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Pickup:</span>
                            <span className="font-medium">{pickupLocation}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Drop-off:</span>
                            <span className="font-medium">{dropoffLocation}</span>
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-0 bg-gradient-to-br from-primary/5 to-secondary/5">
                      <CardContent className="p-4 md:p-6">
                        <h3 className="font-bold text-foreground mb-3 md:mb-4 flex items-center gap-2 text-base md:text-lg">
                          <User className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                          Customer Details
                        </h3>
                        <div className="space-y-2 md:space-y-3 text-sm md:text-base">
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Name:</span>
                            <span className="font-medium">{customerInfo.name}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Phone:</span>
                            <span className="font-medium">{customerInfo.phone}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-medium">{customerInfo.email}</span>
                          </p>
                          {licenseFile && (
                            <p className="flex justify-between">
                              <span className="text-muted-foreground">License file:</span>
                              <span className="font-medium truncate max-w-[55%]" title={licenseFile.name}>
                                {licenseFile.name}
                              </span>
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {customerInfo.notes && (
                    <Card className="border-0 bg-gradient-to-r from-muted/20 to-muted/10">
                      <CardContent className="p-4 md:p-6">
                        <h3 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3">Special Notes</h3>
                        <p className="text-muted-foreground italic text-sm md:text-base">{customerInfo.notes}</p>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="border-0 bg-gradient-to-r from-primary to-secondary">
                    <CardContent className="p-4 md:pb-6 text-center space-y-2">
                      <div className="flex justify-between items-center text-xl md:text-2xl font-bold text-white">
                        <span>Total Amount:</span>
                        <span>${total}</span>
                      </div>

                      {/* Bond & balance note */}
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="rounded-md bg-white/10 text-white px-3 py-2 text-sm">
                          <span className="font-semibold">Due now (Bond):</span> ${BOND_FJD} FJD
                        </div>
                        <div className="rounded-md bg-white/10 text-white px-3 py-2 text-sm">
                          <span className="font-semibold">Balance on arrival:</span> ${balanceDue}
                        </div>
                      </div>

                      {currentTier && (
                        <>
                          <p className="text-white/85 text-xs md:text-sm">
                            {currentTier.breakdown}
                          </p>
                          <p className="text-white/85 text-xs md:text-sm">
                            Current tier: <span className="font-semibold">{currentTier.label}</span> — ${currentTier.rate}/day
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {errorMsg && (
                    <p className="text-red-600 text-center text-sm md:text-base">{errorMsg}</p>
                  )}

                  <div className="flex gap-3 md:gap-4 pt-2 md:pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowSummary(false)}
                      className="flex-1 btn-3d border-primary/20 hover:bg-primary/10 text-sm md:text-lg py-3 md:py-6"
                    >
                      <Edit className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                      Edit Booking
                    </Button>
                    <Button
                      onClick={handleConfirmBooking}
                      disabled={confirming}
                      className="flex-1 btn-3d pulse-glow bg-primary hover:bg-primary/90 text-sm md:text-lg py-3 md:py-6 font-bold disabled:opacity-70"
                    >
                      <CheckCircle className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                      {confirming ? "Confirming..." : "Confirm Booking"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    );
  }

  /* ---------------- MAIN FORM ---------------- */
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 glass-effect border-b border-border/20">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2 group">
              <Car className="h-7 w-7 md:h-8 md:w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
              <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Bakers Rentals
              </span>
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/" className="text-foreground hover:text-primary transition-all duration-300 hover:scale-105">
                Home
              </Link>
              <Link
                href="/vehicles"
                className="text-foreground hover:text-primary transition-all duration-300 hover:scale-105"
              >
                Vehicles
              </Link>
              <Link href="/booking" className="text-primary font-medium scale-105">
                Book Now
              </Link>
            </div>
            <Button asChild className="btn-3d bg-secondary hover:bg-secondary/90 px-3 py-2 md:px-4 md:py-2">
              <Link href="/admin">Admin</Link>
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative py-10 md:py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-90" />
        <div className="absolute inset-0 bg-black/20" />

        {/* Floating animation elements - hide on mobile */}
        <div
          className="hidden sm:block absolute top-10 left-10 w-16 h-16 bg-white/10 rounded-full blur-xl animate-bounce"
          style={{ animationDelay: "0s", animationDuration: "3s" }}
        />
        <div
          className="hidden sm:block absolute top-20 right-20 w-12 h-12 bg-white/10 rounded-full blur-xl animate-bounce"
          style={{ animationDelay: "1s", animationDuration: "4s" }}
        />

        <div className="relative z-10 container mx-auto max-w-3xl md:max-w-4xl">
          <div className="fade-in-up text-center">
            <h1 className="text-3xl md:text-6xl font-bold text-white mb-3 md:mb-6 drop-shadow-2xl">
              Book Your Perfect Ride
            </h1>
            <p className="text-base md:text-2xl text-white/90 mb-6 md:mb-8 max-w-2xl mx-auto drop-shadow-lg">
              Fill in the details below to reserve your ideal vehicle for exploring Fiji
            </p>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-20 px-4 bg-gradient-to-b from-background to-muted/10">
        <div className="container mx-auto max-w-3xl md:max-w-6xl">
          {/* id added so the bottom sticky submit works on mobile */}
          <form id="booking-form" onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              <div className="lg:col-span-2 space-y-6 md:space-y-8">
                <div className="fade-in-up" style={{ animationDelay: "0.1s" }}>
                  <Card className="card-3d border-0 bg-gradient-to-br from-card to-card/50">
                    <CardHeader className="pb-4 md:pb-6">
                      <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
                        <div className="w-9 h-9 md:w-10 md:h-10 gradient-primary rounded-full flex items-center justify-center">
                          <CalendarIcon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                        </div>
                        Rental Dates
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 md:space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                        <div className="space-y-2.5 md:space-y-3">
                          <Label htmlFor="pickup-date" className="text-sm md:text-base font-medium">
                            Pickup Date
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal h-11 md:h-12 btn-3d text-sm md:text-base",
                                  !pickupDate && "text-muted-foreground",
                                )}
                              >
                                <CalendarIcon className="mr-3 h-4 w-4 md:h-5 md:w-5" />
                                {pickupDate ? format(pickupDate, "PPP") : "Select pickup date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[calc(100vw-2rem)] sm:w-auto p-0"
                              align="start"
                              sideOffset={8}
                            >
                              <Calendar
                                mode="single"
                                selected={pickupDate}
                                onSelect={setPickupDate}
                                disabled={pickupDisabledMatchers}
                                // visual cross-out, optional but nice
                                modifiers={{ unavailable: rangeMatchers }}
                                modifiersClassNames={{ unavailable: unavailableClass }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          {selectedVehicle && (
                            <p className="text-xs md:text-sm text-muted-foreground pt-2">
                              {loadingAvail
                                ? "Checking availability…"
                                : bookedRanges.length > 0
                                ? `Note: Some dates are unavailable for this vehicle. Next available from ${format(
                                    nextAvailableFrom,
                                    "PPP",
                                  )}.`
                                : "Great news: this vehicle has no blocked dates ahead."}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2.5 md:space-y-3">
                          <Label htmlFor="return-date" className="text-sm md:text-base font-medium">
                            Return Date
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal h-11 md:h-12 btn-3d text-sm md:text-base",
                                  !returnDate && "text-muted-foreground",
                                )}
                              >
                                <CalendarIcon className="mr-3 h-4 w-4 md:h-5 md:w-5" />
                                {returnDate ? format(returnDate, "PPP") : "Select return date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[calc(100vw-2rem)] sm:w-auto p-0"
                              align="start"
                              sideOffset={8}
                            >
                              <Calendar
                                mode="single"
                                selected={returnDate}
                                onSelect={setReturnDate}
                                disabled={returnDisabledMatchers}
                                modifiers={{ unavailable: rangeMatchers }}
                                modifiersClassNames={{ unavailable: unavailableClass }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      {/* ▼ Tier prices + current tier note */}
                      {selectedVehicleData && currentTier && (
                        <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs md:text-sm">
                          <div className="rounded-lg bg-card/50 border border-border/40 p-2.5">
                            <p className="text-muted-foreground">Base (1–4 days)</p>
                            <p className="font-semibold">${currentTier.base}</p>
                          </div>
                          <div className="rounded-lg bg-card/50 border border-border/40 p-2.5">
                            <p className="text-muted-foreground">5–7 days</p>
                            <p className="font-semibold">
                              ${currentTier.rate5}{currentTier.rate5 === currentTier.base ? " (same as base)" : ""}
                            </p>
                          </div>
                          <div className="rounded-lg bg-card/50 border border-border/40 p-2.5">
                            <p className="text-muted-foreground">8+ days</p>
                            <p className="font-semibold">
                              ${currentTier.rate8}{currentTier.rate8 === currentTier.rate5 ? " (same as 5–7)" : ""}
                            </p>
                          </div>

                          <div className="sm:col-span-3 rounded-lg bg-primary/10 border border-primary/30 p-2.5">
                            <p className="text-xs md:text-sm text-primary font-medium">
                              Current tier: <span className="font-bold">{currentTier.label}</span> — ${currentTier.rate}/day
                              {currentTier.days > 0 && (
                                <> (for your {currentTier.days} day{currentTier.days !== 1 ? "s" : ""} selection)</>
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="fade-in-up" style={{ animationDelay: "0.2s" }}>
                  <Card className="card-3d border-0 bg-gradient-to-br from-card to-card/50">
                    <CardHeader className="pb-4 md:pb-6">
                      <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
                        <div className="w-9 h-9 md:w-10 md:h-10 gradient-secondary rounded-full flex items-center justify-center">
                          <Car className="h-4 w-4 md:h-5 md:w-5 text-white" />
                        </div>
                        Vehicle Selection
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 md:pt-2">
                      <div className="space-y-2.5 md:space-y-3">
                        <Label htmlFor="vehicle" className="text-sm md:text-base font-medium">
                          Choose Your Perfect Vehicle
                        </Label>
                        <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                          <SelectTrigger className="h-11 md:h-12 btn-3d text-sm md:text-base">
                            <SelectValue placeholder="Select a vehicle from our premium fleet" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[60vh]">
                            {availableVehicles.map((vehicle) => (
                              <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                                {vehicle.name} - {vehicle.category} (${vehicle.pricePerDay}/day)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="fade-in-up" style={{ animationDelay: "0.3s" }}>
                  <Card className="card-3d border-0 bg-gradient-to-br from-card to-card/50">
                    <CardHeader className="pb-4 md:pb-6">
                      <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
                        <div className="w-9 h-9 md:w-10 md:h-10 gradient-accent rounded-full flex items-center justify-center">
                          <MapPin className="h-4 w-4 md:h-5 md:w-5 text-white" />
                        </div>
                        Pickup & Drop-off Locations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 md:space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                        <div className="space-y-2.5 md:space-y-3">
                          <Label htmlFor="pickup-location" className="text-sm md:text-base font-medium">
                            Pickup Location
                          </Label>
                          <Select value={pickupLocation} onValueChange={setPickupLocation}>
                            <SelectTrigger className="h-11 md:h-12 btn-3d text-sm md:text-base">
                              <SelectValue placeholder="Select pickup location" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[60vh]">
                              {locations.map((location) => (
                                <SelectItem key={location} value={location}>
                                  {location}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2.5 md:space-y-3">
                          <Label htmlFor="dropoff-location" className="text-sm md:text-base font-medium">
                            Drop-off Location
                          </Label>
                          <Select value={dropoffLocation} onValueChange={setDropoffLocation}>
                            <SelectTrigger className="h-11 md:h-12 btn-3d text-sm md:text-base">
                              <SelectValue placeholder="Select drop-off location" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[60vh]">
                              {locations.map((location) => (
                                <SelectItem key={location} value={location}>
                                  {location}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="fade-in-up" style={{ animationDelay: "0.4s" }}>
                  <Card className="card-3d border-0 bg-gradient-to-br from-card to-card/50">
                    <CardHeader className="pb-4 md:pb-6">
                      <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
                        <div className="w-9 h-9 md:w-10 md:h-10 gradient-primary rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 md:h-5 md:w-5 text-white" />
                        </div>
                        Customer Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 md:space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                        <div className="space-y-2.5 md:space-y-3">
                          <Label htmlFor="name" className="text-sm md:text-base font-medium">
                            Full Name
                          </Label>
                          <Input
                            id="name"
                            placeholder="Enter your full name"
                            value={customerInfo.name}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                            required
                            className="h-11 md:h-12 btn-3d text-sm md:text-base"
                          />
                        </div>

                        <div className="space-y-2.5 md:space-y-3">
                          <Label htmlFor="phone" className="text-sm md:text-base font-medium">
                            Phone Number
                          </Label>
                          <Input
                            id="phone"
                            placeholder="+679 123 4567"
                            value={customerInfo.phone}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                            required
                            className="h-11 md:h-12 btn-3d text-sm md:text-base"
                          />
                        </div>
                      </div>

                      <div className="space-y-2.5 md:space-y-3">
                        <Label htmlFor="email" className="text-sm md:text-base font-medium">
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your.email@example.com"
                          value={customerInfo.email}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                          required
                          className="h-11 md:h-12 btn-3d text-sm md:text-base"
                        />
                      </div>

                      {/* NEW: Driver's License upload */}
                      <div className="space-y-2.5 md:space-y-3">
                        <Label htmlFor="license" className="text-sm md:text-base font-medium">
                          Driver’s License (photo)
                        </Label>
                        <Input
                          id="license"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setLicenseFile(e.target.files?.[0] ?? null)}
                          className="h-11 md:h-12 btn-3d text-sm md:text-base file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-primary/10 file:text-primary hover:file:bg-primary/15"
                        />
                        <p className="text-xs text-muted-foreground">
                          Accepted: JPG/PNG. You can also share it later via WhatsApp if you prefer.
                        </p>
                        {licenseFile && (
                          <p className="text-xs text-foreground">
                            Selected: <span className="font-medium">{licenseFile.name}</span>
                          </p>
                        )}
                      </div>

                      <div className="space-y-2.5 md:space-y-3">
                        <Label htmlFor="notes" className="text-sm md:text-base font-medium">
                          Special Requests (Optional)
                        </Label>
                        <Textarea
                          id="notes"
                          placeholder="Any special requests or notes for your rental..."
                          value={customerInfo.notes}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                          rows={4}
                          className="btn-3d resize-none text-sm md:text-base"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Summary column (stays below form on mobile) */}
              <div className="lg:col-span-1">
                <div className="fade-in-up" style={{ animationDelay: "0.5s" }}>
                  <Card className="card-3d lg:sticky lg:top-24 border-0 bg-gradient-to-br from-primary/5 to-secondary/5">
                    <CardHeader className="pb-4 md:pb-6">
                      <CardTitle className="text-xl md:text-2xl text-center">Booking Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 md:space-y-6">
                      {selectedVehicleData ? (
                        <>
                          <div className="text-center">
                            <h4 className="text-lg md:text-xl font-bold text-foreground">{selectedVehicleData.name}</h4>
                            <p className="text-muted-foreground font-medium text-sm md:text-base">
                              {selectedVehicleData.category}
                            </p>
                          </div>

                          <div className="space-y-3 md:space-y-4">
                            <div className="flex justify-between items-center p-3 bg-card/50 rounded-lg text-sm md:text-base">
                              <span className="text-muted-foreground">Current Daily Rate:</span>
                              <span className="font-bold text-primary">
                                {currentTier ? `$${currentTier.rate}` : `$${selectedVehicleData.pricePerDay}`}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-card/50 rounded-lg text-sm md:text-base">
                              <span className="text-muted-foreground">Duration:</span>
                              <span className="font-bold">
                                {currentTier ? currentTier.days : calculateDays()} day{(currentTier ? currentTier.days : calculateDays()) !== 1 ? "s" : ""}
                              </span>
                            </div>
                            {currentTier?.breakdown && (
                              <div className="p-3 bg-card/50 rounded-lg text-xs md:text-sm text-muted-foreground">
                                <span className="block">Breakdown:</span>
                                <span className="font-mono text-foreground">{currentTier.breakdown}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center p-4 gradient-primary rounded-lg text-white">
                              <span className="text-base md:text-lg font-bold">Total:</span>
                              <span className="text-xl md:text-2xl font-bold">${calculateTotal()}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <Car className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
                          <p className="text-muted-foreground text-sm md:text-base">
                            Select a vehicle to see pricing details
                          </p>
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="w-full btn-3d pulse-glow bg-primary hover:bg-primary/90 text-sm md:text-lg py-3 md:py-6 font-bold"
                      >
                        Review Booking
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Mobile sticky footer submit */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        <div className="glass-effect-dark border-t border-white/10 p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div className="text-white">
              {selectedVehicleData && (
                <>
                  <p className="font-bold text-base md:text-lg">${calculateTotal()}</p>
                  <p className="text-xs md:text-sm text-white/80">
                    {calculateDays()} day{calculateDays() !== 1 ? "s" : ""}
                  </p>
                </>
              )}
            </div>
            <Button
              type="submit"
              form="booking-form"
              className="btn-3d bg-white text-primary hover:bg-white/90 font-bold px-5 md:px-8 py-2.5 md:py-3"
              disabled={!selectedVehicleData}
            >
              Review Booking
            </Button>
          </div>
        </div>
      </div>

      {/* Breadcrumbs JSON-LD */}
      <JsonLd id="breadcrumbs-booking" data={breadcrumbBooking} />
    </div>
  );
}

/* ---------- Small helper component for neat value boxes in dialog ---------- */
function InfoBox({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg bg-background/60 border border-border/30 p-3", className)}>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium break-words">{value}</p>
    </div>
  );
}
