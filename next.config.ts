import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['api.dicebear.com'], // ✅ corrected
  },
};

export default nextConfig;
