import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for aws-amplify SSR cookie handling
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "main.d2bkfvj6gzjt4r.amplifyapp.com",
        "thenewbie.io",
        "www.thenewbie.io",
      ],
    },
  },
};

export default nextConfig;
