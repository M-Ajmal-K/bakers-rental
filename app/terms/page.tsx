// app/terms/page.tsx
import type { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldCheck, FileText, ScrollText, Landmark, AlertTriangle, Hammer, Scale, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Baker's Rental Cars - Terms & Conditions",
  description:
    "Terms & Conditions for Baker's Rental Cars (Fiji). Please read these rental conditions carefully before confirming your booking.",
}

const sections = [
  { id: "intro", label: "Introduction" },
  { id: "renter-responsibilities", label: "Responsibilities" },
  { id: "collision-damage-waiver", label: "CDW" },
  { id: "damage-to-vehicle", label: "Vehicle Damage" },
  { id: "windscreen", label: "Windscreen" },
  { id: "mechanical-repairs", label: "Repairs & Accidents" },
  { id: "liability", label: "Our Liability" },
  { id: "payments", label: "Payments" },
  { id: "warranties", label: "Warranties" },
]

export default function TermsPage() {
  return (
    <main id="top" className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-10 md:py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-90" />
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 container mx-auto max-w-4xl">
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow-2xl">
              Baker&apos;s Rental Cars – Terms & Conditions
            </h1>
            <p className="mt-3 md:mt-4 text-white/90 text-sm md:text-base max-w-2xl mx-auto">
              Please review the following terms carefully. By hiring a vehicle from us, you agree to these conditions.
            </p>

            {/* Optional: PDF download (place your PDF in /public as /BakersTerms.pdf to enable) */}
            <div className="mt-6">
              <Button asChild className="btn-3d bg-white text-primary hover:bg-white/90">
                <Link href="/BakersTerms.pdf" target="_blank" rel="noopener">
                  <FileText className="mr-2 h-4 w-4" />
                  Download PDF
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="py-10 md:py-16 px-4 bg-gradient-to-b from-background to-muted/10">
        <div className="container mx-auto grid gap-6 md:gap-8 max-w-6xl md:grid-cols-[280px_1fr]">
          {/* Desktop TOC (sticky on the left) */}
          <aside className="hidden md:block md:sticky md:top-24 self-start">
            <Card className="border-0 bg-card/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-primary" />
                  Contents
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <nav className="space-y-2">
                  {sections.map((s) => (
                    <TocLink key={s.id} href={`#${s.id}`}>
                      {s.label}
                    </TocLink>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Terms body */}
          <div className="space-y-6 md:space-y-8 pb-24 md:pb-0">
            <Card className="border-0 bg-card/70">
              <CardHeader>
                <CardTitle id="intro" className="flex items-center gap-2 scroll-mt-24">
                  <Landmark className="h-5 w-5 text-primary" />
                  Introduction & Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  Baker&apos;s Rental Cars, P.O. Box 1949, Kulukulu, Sigatoka — Phone: <strong>942 7497</strong>,{" "}
                  <strong>748 8252</strong> • Email: <a href="mailto:bakersrental@yahoo.com">bakersrental@yahoo.com</a>.
                </p>
                <p>
                  By signing our rental agreement or confirming a booking online, the hirer acknowledges and agrees to the terms outlined on
                  this page and the rental agreement form.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/70">
              <CardHeader>
                <CardTitle id="renter-responsibilities" className="flex items-center gap-2 scroll-mt-24">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  Renter Responsibilities
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <ul className="list-disc pl-5 space-y-2">
                  <li>Rental extensions must be requested at least <strong>24 hours</strong> in advance.</li>
                  <li>
                    Vehicles returned more than <strong>1 hour</strong> past the agreed time may incur a late fee of{" "}
                    <strong>FJD $15.00 per hour</strong>.
                  </li>
                  <li>
                    Vehicles must be returned in a reasonably clean condition; a cleaning fee of <strong>FJD $15.00</strong> may apply.
                  </li>
                  <li>
                    Only the hirer and any <strong>authorised drivers</strong> listed on the agreement may drive the vehicle. Do not permit
                    unauthorised persons to drive.
                  </li>
                  <li>
                    The hirer agrees to pay an <strong>insurance claiming fee</strong> (excess contribution) of <strong>FJD $2,000</strong>{" "}
                    in the event of a collision or damage (see “Collision Damage Waiver” & “Payments” below).
                  </li>
                  <li>
                    Damage to tyres, windscreens, mufflers, fuel tanks, and missing tools are the renter’s responsibility and must be paid in
                    full.
                  </li>
                  <li>Vehicle ferrying to islands is prohibited.</li>
                  <li>
                    The hirer is liable for any parking and traffic infringements issued during the rental period.
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/70">
              <CardHeader>
                <CardTitle id="collision-damage-waiver" className="flex items-center gap-2 scroll-mt-24">
                  <Hammer className="h-5 w-5 text-primary" />
                  Collision Damage Waiver (CDW)
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    All renters are subject to a non-waivable excess of <strong>FJD $2,000 – $4,000</strong> on accident damage,
                    irrespective of fault and depending on vehicle group.
                  </li>
                  <li>
                    By signing, the renter agrees to pay the fees specified by Baker&apos;s Rental Cars; the company accepts liability for
                    damage while the vehicle is used in accordance with this agreement.
                  </li>
                  <li>
                    <strong>Important:</strong> Insurance is void for underbody/overbody damage, use on unsealed/unmade roads, or any
                    contravention of these conditions.
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/70">
              <CardHeader>
                <CardTitle id="damage-to-vehicle" className="flex items-center gap-2 scroll-mt-24">
                  <Hammer className="h-5 w-5 text-primary" />
                  Damage to the Vehicle
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  The renter and/or additional authorised driver is liable for damage in the following (non-exhaustive) situations:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    Towing and police report fees; rental charges at the applicable daily rate for all days the vehicle is under repair (loss
                    of use).
                  </li>
                  <li>Vehicle driven by an unauthorised driver.</li>
                  <li>
                    Use for learning to drive, illegal purposes, racing/speed tests/contests, towing/pushing another vehicle, carrying loads
                    beyond limits, or off-road use.
                  </li>
                  <li>
                    Careless or dangerous driving, speeding beyond area or national limits, or driving in a manner dangerous to the public.
                  </li>
                  <li>Use for carrying passengers for hire or reward.</li>
                  <li>
                    Continuing to drive after the vehicle is damaged or deemed unsafe/unroadworthy.
                  </li>
                  <li>Leaving the vehicle unlocked/unattended or failing to take reasonable precautions for its security.</li>
                  <li>Offences under the Land Transport Act 1998 or other Fiji laws while operating the vehicle.</li>
                  <li>
                    Loss/damage occurring outside the agreed rental period (including unauthorised extensions).
                  </li>
                  <li>Breaching any warranty in the agreement or failing to provide information reasonably requested.</li>
                  <li>
                    Making any offer, promise of payment, settlement, indemnity, or admission of liability after an incident without the
                    owner’s written consent.
                  </li>
                  <li>
                    If the vehicle is a write-off or unworthy of repair, the renter may be liable up to the current market valuation.
                  </li>
                </ul>
                <p className="mt-3 text-muted-foreground">
                  “Damage to the vehicle” includes all loss, costs, expenses, and outgoings connected to the damage or arising from it.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/70">
              <CardHeader>
                <CardTitle id="windscreen" className="flex items-center gap-2 scroll-mt-24">
                  <Hammer className="h-5 w-5 text-primary" />
                  Windscreen Damage
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p>
                  Windscreen damage is entirely at the renter’s expense. In the event of windscreen damage, replacement costs must be paid
                  immediately by the renter.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/70">
              <CardHeader>
                <CardTitle id="mechanical-repairs" className="flex items-center gap-2 scroll-mt-24">
                  <Hammer className="h-5 w-5 text-primary" />
                  Mechanical Repairs & Accidents
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    If the vehicle is damaged, requires repair, or needs salvage (after accident or breakdown), contact Baker&apos;s Rental
                    Cars by phone as soon as practicable with full details.
                  </li>
                  <li>
                    Do not arrange or undertake repairs/salvage (including tyres) without our authority, except where necessary to prevent
                    further damage.
                  </li>
                  <li>
                    Do not interfere with the odometer/speedometer or, except in an emergency, any part of the engine, transmission, braking,
                    or suspension systems.
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/70">
              <CardHeader>
                <CardTitle id="liability" className="flex items-center gap-2 scroll-mt-24">
                  <Scale className="h-5 w-5 text-primary" />
                  Baker&apos;s Rental Cars Liability
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p>
                  While we take all reasonable precautions, we are not liable for delays due to breakdown/mechanical defects, or for the loss
                  of/damage to property stolen from or otherwise lost during the hire, or for property left in the vehicle before/after
                  return. The renter agrees to indemnify us against any claims in this regard.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/70">
              <CardHeader>
                <CardTitle id="payments" className="flex items-center gap-2 scroll-mt-24">
                  <Landmark className="h-5 w-5 text-primary" />
                  Payment of Charges & Damages
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    The renter must pay rental and sundry charges per the current rate schedule, plus all amounts payable under these terms.
                  </li>
                  <li>
                    All fines and penalties for traffic/parking offences during the hire are the renter’s responsibility.
                  </li>
                  <li>
                    Insurance claiming fee (excess contribution): <strong>FJD $2,000</strong> for groups 1–4 and{" "}
                    <strong>FJD $4,000</strong> for group 5 and above — payable immediately at the time of accident, regardless of fault.
                  </li>
                  <li>
                    Loss of income for repair days and full repair costs are at the renter’s expense where applicable.
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/70">
              <CardHeader>
                <CardTitle id="warranties" className="flex items-center gap-2 scroll-mt-24">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Renter Warranties
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <ul className="list-disc pl-5 space-y-2">
                  <li>The renter and any additional authorised driver hold a current motor vehicle driver’s licence valid in Fiji.</li>
                  <li>
                    All information provided (name, address, age, phone, occupation, etc.) is true and correct.
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Back/Home CTA */}
            <div className="flex justify-center pt-2">
              <Button asChild className="btn-3d">
                <Link href="/">Return Home</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Mobile Quick Nav (always accessible) ---- */}
      <MobileQuickNav />
    </main>
  )
}

/* ---------- Desktop TOC link helper ---------- */
function TocLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-md px-3 py-2 text-foreground/80 hover:text-foreground hover:bg-muted transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      )}
    >
      {children}
    </Link>
  )
}

/* ---------- Mobile Quick Nav (no JS handlers; pure anchors) ---------- */
function MobileQuickNav() {
  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-40">
      <div
        className={cn(
          "mx-auto max-w-6xl",
          "rounded-t-xl border-t border-white/10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        )}
      >
        {/* drag handle / label */}
        <div className="flex items-center justify-between px-3 pt-2">
          <span className="h-1.5 w-10 rounded-full bg-foreground/20 mx-auto" />
        </div>

        {/* horizontally scrollable chips */}
        <nav className="no-scrollbar overflow-x-auto px-3 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center gap-2 py-3 min-w-max">
            {/* Back to top chip (pure anchor) */}
            <Link
              href="#top"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/70 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card transition-colors"
            >
              <ChevronUp className="h-3.5 w-3.5" />
              Top
            </Link>

            {sections.map((s) => (
              <Link
                key={s.id}
                href={`#${s.id}`}
                className="inline-flex items-center rounded-full border border-border/50 bg-card/70 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card transition-colors"
              >
                {s.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
