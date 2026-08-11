"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, MessageSquare, Gift, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/awards", label: "Awards", icon: Trophy },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/rewards", label: "Rewards", icon: Gift },
  { href: "/me", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                active ? "text-primary" : "text-muted",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden w-56 shrink-0 flex-col gap-1 border-r border-border p-3 md:flex">
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
              active
                ? "bg-brand-50 text-brand-700"
                : "text-muted hover:bg-surface-2",
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
