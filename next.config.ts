import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for aws-amplify SSR cookie handling
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000"] },
  },
};

export default nextConfig;
