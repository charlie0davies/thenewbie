import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Dumbbell, UtensilsCrossed, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "The Newbie — AI Made for the Gym",
  description:
    "Your AI personal trainer & diet coach in one app. Personalised workout plans, meal plans, and shopping lists — built for gym beginners. Free forever.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: "/",
    title: "The Newbie — AI Made for the Gym",
    description:
      "AI workout plans, daily meal plans & coaching — built for gym beginners. Get your personalised plan in minutes. Free forever.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "The Newbie",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  description:
    "AI-powered workout plans, daily meal plans, shopping lists, and coaching — built for gym beginners.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "GBP",
    availability: "https://schema.org/InStock",
  },
  featureList: [
    "AI-generated personalised workout plans",
    "Daily meal plans with shopping lists",
    "Progress tracking and weight logging",
    "AI coach chat for form and nutrition advice",
    "Calorie and macro tracking",
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-16 text-center">
        {/* Logo */}
        <Image
          src="/NewbieLogo.png"
          alt="The Newbie logo"
          width={80}
          height={80}
          className="mb-6 rounded-2xl object-contain"
          priority
        />

        {/* Tagline chip */}
        <div className="mb-4 inline-flex items-center gap-1.5 bg-orange-50 border border-orange-100 text-orange-600 text-xs font-semibold px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          AI Made for the Gym
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-black tracking-tight leading-none mb-3">
          Your personal trainer<br />in your pocket.
        </h1>
        <p className="text-muted-foreground text-base max-w-xs mb-8">
          The Newbie builds your personalised workout plan, daily meals, and shopping list — then coaches you every step of the way.
        </p>

        {/* Features */}
        <div className="flex flex-col gap-3 w-full max-w-xs mb-10">
          {[
            { icon: Dumbbell, text: "AI workout plans tailored to you" },
            { icon: UtensilsCrossed, text: "Daily meal plans & shopping lists" },
            { icon: TrendingUp, text: "Track progress & stay on target" },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 text-left"
            >
              <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                <Icon size={16} className="text-primary" />
              </div>
              <p className="text-sm font-medium">{text}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link
            href="/signup"
            className="w-full bg-primary text-white font-bold py-4 rounded-2xl text-sm hover:bg-primary/90 transition-colors"
          >
            Get started — it&apos;s free
          </Link>
          <Link
            href="/login"
            className="w-full border border-border bg-card font-semibold py-4 rounded-2xl text-sm hover:bg-muted transition-colors"
          >
            Log in
          </Link>
        </div>

        <p className="text-xs text-muted-foreground mt-6">No credit card. No commitment. Free forever.</p>
      </main>
    </>
  );
}
