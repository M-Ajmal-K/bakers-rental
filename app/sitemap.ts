import type { MetadataRoute } from "next";

const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Add/trim routes here as your site grows
  const routes = [
    { path: "/",             priority: 1.0, changefreq: "daily"   as const },
    { path: "/vehicles",     priority: 0.9, changefreq: "daily"   as const },
    { path: "/booking",      priority: 0.8, changefreq: "weekly"  as const },
    { path: "/contact",      priority: 0.6, changefreq: "monthly" as const },
    // Keep admin out of the sitemap on purpose
  ];

  return routes.map(({ path, priority, changefreq }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: changefreq,
    priority,
  }));
}
