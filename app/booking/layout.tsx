import type { Metadata } from "next";

const SITE_NAME = "Bakers Rentals";
const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

const DESCRIPTION =
  "Reserve your vehicle in minutes. Choose dates, pickup/drop-off locations, and pay only the refundable FJD $200 bond now—balance on arrival.";

export const metadata: Metadata = {
  title: "Booking",
  description: DESCRIPTION,
  alternates: {
    canonical: "/booking",
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/booking`,
    title: `Booking | ${SITE_NAME}`,
    siteName: SITE_NAME,
    description: DESCRIPTION,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Booking`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Booking | ${SITE_NAME}`,
    description: DESCRIPTION,
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
