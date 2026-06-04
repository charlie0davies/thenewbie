import Image from "next/image";
import Link from "next/link";
import { Dumbbell, UtensilsCrossed, TrendingUp } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-16 text-center">
      {/* Logo */}
      <Image
        src="/NewbieLogo.png"
        alt="The Newbie"
        width={80}
        height={80}
        className="mb-6 rounded-2xl object-contain"
      />

      {/* Headline */}
      <h1 className="text-4xl font-black tracking-tight leading-none mb-3">
        The smarter way<br />to get fit.
      </h1>
      <p className="text-muted-foreground text-base max-w-xs mb-8">
        NewbieAI builds your personalised workout plan and meal tracker — then learns as you go.
      </p>

      {/* Features */}
      <div className="flex flex-col gap-3 w-full max-w-xs mb-10">
        {[
          { icon: Dumbbell, text: "AI workout plans tailored to you" },
          { icon: UtensilsCrossed, text: "Daily meal plans & shopping lists" },
          { icon: TrendingUp, text: "Track progress & stay on target" },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 text-left">
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
  );
}
