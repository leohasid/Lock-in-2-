import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only use static export for Capacitor builds (when BUILD_FOR_MOBILE is set)
  // Vercel should run as a Next.js server, not static export
  ...(process.env.BUILD_FOR_MOBILE === 'true' && { output: 'export' }),
  images: {
    unoptimized: process.env.BUILD_FOR_MOBILE === 'true', // Only unoptimized for static export
  },
};

export default nextConfig;
