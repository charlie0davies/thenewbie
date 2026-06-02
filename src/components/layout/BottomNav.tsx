"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Dumbbell, UtensilsCrossed, TrendingUp,
  ShoppingCart, MessageCircle, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/today",    icon: Home,            label: "Today"    },
  { href: "/workout",  icon: Dumbbell,        label: "Workout"  },
  { href: "/nutrition",icon: UtensilsCrossed, label: "Meals"    },
  { href: "/progress", icon: TrendingUp,      label: "Progress" },
  { href: "/shopping", icon: ShoppingCart,    label: "Shopping" },
  { href: "/coach",    icon: MessageCircle,   label: "Coach"    },
  { href: "/settings", icon: Settings,        label: "Account"  },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-center justify-around h-14 px-0.5">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 flex-1 py-1.5 transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[8px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
