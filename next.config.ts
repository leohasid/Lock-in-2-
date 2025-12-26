import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only use static export for production builds (for Capacitor)
  // This allows dev server to work properly
  ...(process.env.NODE_ENV === 'production' && { output: 'export' }),
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;
