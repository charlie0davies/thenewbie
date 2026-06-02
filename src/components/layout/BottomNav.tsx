"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, UtensilsCrossed, TrendingUp, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/today", icon: Home, label: "Today" },
  { href: "/workout", icon: Dumbbell, label: "Workout" },
  { href: "/nutrition", icon: UtensilsCrossed, label: "Nutrition" },
  { href: "/progress", icon: TrendingUp, label: "Progress" },
  { href: "/shopping", icon: ShoppingCart, label: "Shopping" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
