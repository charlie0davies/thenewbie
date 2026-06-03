import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Amplify Hosting does not inject Console env vars into the Lambda runtime,
  // so we inline all server-side secrets at build time here.
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
    MY_APP_AWS_ACCESS_KEY_ID: process.env.MY_APP_AWS_ACCESS_KEY_ID ?? "",
    MY_APP_AWS_SECRET_ACCESS_KEY: process.env.MY_APP_AWS_SECRET_ACCESS_KEY ?? "",
  },
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
