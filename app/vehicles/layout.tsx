import type { Metadata } from "next";

const SITE_NAME = "Bakers Rentals";
const SITE_DESCRIPTION =
  "Browse our premium fleet in Fiji — SUVs, vans, compact cars and more. Transparent pricing and easy WhatsApp support.";
const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

export const metadata: Metadata = {
  // Root layout already defines metadataBase; setting canonicals is still useful here.
  title: "Vehicles",
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/vehicles",
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/vehicles`,
    title: `Vehicles | ${SITE_NAME}`,
    siteName: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.jpg", // falls back to your global image
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Premium fleet in Fiji`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Vehicles | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function VehiclesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server component wrapper that only supplies metadata.
  return <>{children}</>;
}
