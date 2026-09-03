import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep last-visited app pages in the client cache so tab switches stay instant.
  experimental: {
    staleTimes: {
      dynamic: 60,
      static: 180,
    },
  },
  serverExternalPackages: ["@tensorflow/tfjs", "nsfwjs", "sharp"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "*.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
