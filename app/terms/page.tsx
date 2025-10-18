// app/terms/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  FileText,
  ScrollText,
  Landmark,
  AlertTriangle,
  Hammer,
  Scale,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* Server-side Supabase client (anon) */
import { createClient } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

export const metadata: Metadata = {
  title: "Baker's Rental Cars - Terms & Conditions",
  description:
    "Terms & Conditions for Baker's Rental Cars (Fiji). Please read these rental conditions carefully before confirming your booking.",
};

type TermsRow = {
  title: string | null;
  content_md: string | null;
  is_published: boolean | null;
  version: number | null;
  updated_at: string | null;
};

/* -------- helpers -------- */
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function pickIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes("respons")) return <AlertTriangle className="h-5 w-5 text-primary" />;
  if (l.includes("collision") || l.includes("cdw")) return <Hammer className="h-5 w-5 text-primary" />;
  if (l.includes("damage") && !l.includes("windscreen")) return <Hammer className="h-5 w-5 text-primary" />;
  if (l.includes("windscreen")) return <Hammer className="h-5 w-5 text-primary" />;
  if (l.includes("repair") || l.includes("accident")) return <Hammer className="h-5 w-5 text-primary" />;
  if (l.includes("liabil")) return <Scale className="h-5 w-5 text-primary" />;
  if (l.includes("payment") || l.includes("charges")) return <Landmark className="h-5 w-5 text-primary" />;
  if (l.includes("warran")) return <ShieldCheck className="h-5 w-5 text-primary" />;
  if (l.includes("intro") || l.includes("contact")) return <Landmark className="h-5 w-5 text-primary" />;
  return <Landmark className="h-5 w-5 text-primary" />;
}

async function getLatestPublishedTerms(): Promise<TermsRow | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const s = createClient(url, anon);

  const { data, error } = await s
    .from("terms")
    .select("*")
    .eq("slug", "terms")
    .eq("is_published", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[terms page] Supabase error:", error);
    return null;
  }
  return (data as TermsRow) ?? null;
}

function splitIntoSections(md: string): Array<{ id: string; label: string; body: string }> {
  const normalized = (md || "").replace(/\r\n/g, "\n").trim();
  if (!/^##\s+/m.test(normalized)) {
    const label = "Terms";
    return [{ id: slugify(label), label, body: normalized }];
  }
  return normalized.split(/\n(?=##\s+)/g).map((block) => {
    const [h2, ...rest] = block.split("\n");
    const raw = h2.replace(/^##\s+/, "").trim();
    const id = slugify(raw);
    return { id, label: raw, body: rest.join("\n") };
  });
}

/* -------- Page (Server Component) -------- */
export default async function TermsPage() {
  const row = await getLatestPublishedTerms();

  const title =
    row?.title?.trim() || "Baker's Rental Cars – Terms & Conditions";
  const content_md =
    row?.content_md?.trim() ||
    `## Introduction & Contact

Baker's Rental Cars, P.O. Box 1949, Kulukulu, Sigatoka — Phone: **942 7497**, **748 8252** • Email: bakersrental@yahoo.com.

## Renter Responsibilities

- Use **##** headings to create sections
- Add bullet points like this
- Keep it short`;

  const sections = splitIntoSections(content_md);

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
              {title}
            </h1>
            <p className="mt-3 md:mt-4 text-white/90 text-sm md:text-base max-w-2xl mx-auto">
              Please review the following terms carefully. By hiring a vehicle from us, you agree to these conditions.
            </p>

            {/* Optional: PDF download (put /public/BakersTerms.pdf if you want this to work) */}
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
          {/* Desktop TOC */}
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

          {/* Terms body (cards per H2, same visual style as your old page) */}
          <div className="space-y-6 md:space-y-8 pb-24 md:pb-0">
            {sections.map((s) => (
              <Card key={s.id} className="border-0 bg-card/70">
                <CardHeader>
                  <CardTitle id={s.id} className="flex items-center gap-2 scroll-mt-24">
                    {pickIcon(s.label)}
                    {s.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSlug, [rehypeAutolinkHeadings, { behavior: "wrap" }]]}
                  >
                    {s.body}
                  </ReactMarkdown>
                </CardContent>
              </Card>
            ))}

            {/* Back/Home CTA */}
            <div className="flex justify-center pt-2">
              <Button asChild className="btn-3d">
                <Link href="/">Return Home</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Quick Nav */}
      <MobileQuickNav sections={sections} />
    </main>
  );
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
  );
}

/* ---------- Mobile Quick Nav (pure anchors) ---------- */
function MobileQuickNav({
  sections,
}: {
  sections: Array<{ id: string; label: string }>;
}) {
  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-40">
      <div
        className={cn(
          "mx-auto max-w-6xl",
          "rounded-t-xl border-t border-white/10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        )}
      >
        <div className="flex items-center justify-between px-3 pt-2">
          <span className="h-1.5 w-10 rounded-full bg-foreground/20 mx-auto" />
        </div>

        <nav className="no-scrollbar overflow-x-auto px-3 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center gap-2 py-3 min-w-max">
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
  );
}
