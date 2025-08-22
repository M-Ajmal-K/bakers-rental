/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // keep current behavior
    unoptimized: true,
    // allow Supabase Storage public URLs, e.g.
    // https://<project>.supabase.co/storage/v1/object/public/<bucket>/...
    remotePatterns: [
      {
        protocol: "https",
      hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
