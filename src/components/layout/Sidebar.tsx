"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Dumbbell, UtensilsCrossed, TrendingUp, ShoppingCart, MessageCircle, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "aws-amplify/auth";

const nav = [
  { href: "/today", icon: Home, label: "Today" },
  { href: "/workout", icon: Dumbbell, label: "Workout" },
  { href: "/nutrition", icon: UtensilsCrossed, label: "Nutrition" },
  { href: "/progress", icon: TrendingUp, label: "Progress" },
  { href: "/shopping", icon: ShoppingCart, label: "Shopping" },
  { href: "/coach", icon: MessageCircle, label: "AI Coach" },
  { href: "/settings", icon: Settings, label: "Account" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <aside className="hidden lg:flex flex-col w-60 fixed top-0 left-0 bottom-0 bg-card border-r border-border z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-border">
        <Image src="/NewbieLogo.png" alt="The Newbie" width={36} height={36} className="shrink-0 rounded-xl object-contain" />
        <div>
          <p className="font-bold text-sm leading-none">The Newbie</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Fitness & Diet</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-orange-50 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all w-full"
        >
          <LogOut size={18} strokeWidth={1.8} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
