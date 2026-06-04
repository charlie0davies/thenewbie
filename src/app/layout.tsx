import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import AmplifyProvider from "@/components/providers/AmplifyProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://thenewbie.org";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "The Newbie — AI Made for the Gym",
    template: "%s | The Newbie",
  },
  description:
    "Your AI personal trainer & diet coach in one app. Personalised workout plans, meal plans, and shopping lists — built for gym beginners. Free forever.",
  keywords: [
    "AI gym coach",
    "beginner workout plan",
    "AI personal trainer",
    "meal plan app",
    "fitness tracker",
    "gym app for beginners",
    "AI diet coach",
    "workout tracker",
  ],
  authors: [{ name: "The Newbie" }],
  creator: "The Newbie",
  publisher: "The Newbie",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "/",
    siteName: "The Newbie",
    title: "The Newbie — AI Made for the Gym",
    description:
      "AI-powered workout plans, daily meal plans, and coaching — built for gym beginners. Free forever.",
    images: [{ url: "/og-image", width: 1200, height: 630, alt: "The Newbie — AI Made for the Gym" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Newbie — AI Made for the Gym",
    description:
      "AI workout plans, meal plans, and coaching — built for gym beginners. Free forever.",
    images: ["/og-image"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "The Newbie",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AmplifyProvider>{children}</AmplifyProvider>
      </body>
    </html>
  );
}
