import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['lh3.googleusercontent.com','api.dicebear.com'], // ✅ corrected
  },
};

export default nextConfig;
