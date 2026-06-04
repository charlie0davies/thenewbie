import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Amplify Hosting does not inject Console env vars into the Lambda runtime,
  // so we inline all server-side secrets at build time here.
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
    MY_APP_AWS_ACCESS_KEY_ID: process.env.MY_APP_AWS_ACCESS_KEY_ID ?? "",
    MY_APP_AWS_SECRET_ACCESS_KEY: process.env.MY_APP_AWS_SECRET_ACCESS_KEY ?? "",
    MY_APP_S3_BUCKET: process.env.MY_APP_S3_BUCKET ?? "",
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "",
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    STRIPE_PREMIUM_PRICE_ID: process.env.STRIPE_PREMIUM_PRICE_ID ?? "",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "https://thenewbie.org",
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "main.d2bkfvj6gzjt4r.amplifyapp.com",
        "thenewbie.org",
        "www.thenewbie.org",
        "capacitor://localhost",
      ],
    },
  },
};

export default nextConfig;
