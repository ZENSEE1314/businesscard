"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Compass,
  Trophy,
  MessageSquare,
  Gift,
  User,
  LayoutDashboard,
  Users,
  IdCard,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Network,
  ShieldCheck,
  Newspaper,
  Store,
  Crown,
  UserPlus,
} from "lucide-react";
import { apiFetch } from "@/lib/client";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Menu model
// ---------------------------------------------------------------------------

interface MenuItem {
  href: string;
  label: string;
  icon: typeof Home;
}

const USER_MENU: MenuItem[] = [
  { href: "/hub", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/matches", label: "Matches", icon: Compass },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "__CARD__", label: "Digital Name Card", icon: IdCard }, // replaced with the user's card path
  { href: "/referrals", label: "Refer & Earn", icon: UserPlus },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/rewards", label: "Rewards", icon: Gift },
  { href: "/chat", label: "Messages", icon: MessageSquare },
  { href: "/membership", label: "Membership", icon: Crown },
  { href: "/awards", label: "Awards & Events", icon: Trophy },
  { href: "/me", label: "Profile", icon: User },
  { href: "/me/edit", label: "Account Settings", icon: Settings },
  { href: "/points", label: "Point History", icon: Gift },
];

const ADMIN_MENU: MenuItem[] = [
  { href: "/admin", label: "Admin Dashboard", icon: ShieldCheck },
  { href: "/admin/users/activity", label: "User Management", icon: Users },
  { href: "/admin/users/activity", label: "Activity Monitoring", icon: Network },
  { href: "/admin/users/tree", label: "User Network Tree", icon: Network },
  { href: "/admin/settings", label: "Points & Platform Settings", icon: Settings },
  { href: "/admin/memberships", label: "Memberships", icon: IdCard },
  { href: "/admin/feed", label: "Feed Management", icon: Newspaper },
  { href: "/admin/rewards", label: "Marketplace Management", icon: Gift },
];

function isActive(pathname: string, href: string): boolean {
  // The hub is the app home; "/" redirects there for signed-in users.
  if (href === "/hub") return pathname === "/hub" || pathname === "/";
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

// ---------------------------------------------------------------------------
// Shared menu list
// ---------------------------------------------------------------------------

function MenuList({
  isAdmin,
  cardPath,
  onNavigate,
}: {
  isAdmin: boolean;
  cardPath: string | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav aria-label="Main navigation">
      <ul className="space-y-0.5">
        {USER_MENU.map((item) => {
          const href = item.href === "__CARD__" ? cardPath : item.href;
          if (!href) return null; // no username yet → hide name-card entry
          const active = isActive(pathname, href);
          return (
            <li key={item.label}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-muted hover:bg-surface-2 hover:text-foreground focus-visible:bg-surface-2",
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      {isAdmin && (
        <>
          <p className="mt-4 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
            Administration
          </p>
          <ul className="space-y-0.5">
            {ADMIN_MENU.map((item) => {
              const active = isActive(pathname, item.href);
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors",
                      active
                        ? "bg-brand-50 text-brand-700"
                        : "text-muted hover:bg-surface-2 hover:text-foreground focus-visible:bg-surface-2",
                    )}
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className="mt-4 border-t border-border pt-3">
        <button
          onClick={logout}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-danger outline-none hover:bg-red-50 focus-visible:bg-red-50 disabled:opacity-60"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {loggingOut ? "Logging out…" : "Log Out"}
        </button>
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Desktop dropdown (header)
// ---------------------------------------------------------------------------

export function HeaderNav({
  isAdmin,
  cardPath,
  points,
}: {
  isAdmin: boolean;
  cardPath: string | null;
  points: number;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on Escape; return focus to the trigger for keyboard users.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open navigation menu"
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-medium hover:bg-surface-2"
      >
        <Menu className="h-4 w-4" />
        Menu
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 max-h-[75vh] w-72 overflow-y-auto rounded-2xl border border-border bg-surface p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between border-b border-border px-1 pb-2">
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
              {points} pts
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <MenuList isAdmin={isAdmin} cardPath={cardPath} onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile bottom nav + "More" bottom sheet
// ---------------------------------------------------------------------------

const BOTTOM_ITEMS = [
  { href: "/hub", label: "Home", icon: Home },
  { href: "/marketplace", label: "Marketplace", icon: Store },
];

export function BottomNav({
  isAdmin,
  cardPath,
}: {
  isAdmin: boolean;
  cardPath: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the sheet whenever the route changes (render-time adjustment —
  // avoids setState-in-effect cascades).
  const [renderedPath, setRenderedPath] = useState(pathname);
  if (renderedPath !== pathname) {
    setRenderedPath(pathname);
    setOpen(false);
  }

  // Escape closes the sheet.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const moreActive =
    !BOTTOM_ITEMS.some((i) => isActive(pathname, i.href)) && pathname !== "/feed" && pathname !== "/hub";

  return (
    <>
      <nav
        aria-label="Primary"
        className="sticky bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur md:hidden"
      >
        <div className="mx-auto flex max-w-2xl items-stretch justify-around">
          {BOTTOM_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
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
          <Link
            href="/chat"
            aria-current={pathname.startsWith("/chat") ? "page" : undefined}
            className={cn(
              "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium",
              pathname.startsWith("/chat") ? "text-primary" : "text-muted",
            )}
          >
            <MessageSquare className="h-5 w-5" />
            Chat
          </Link>
          <button
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-haspopup="dialog"
            className={cn(
              "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium",
              moreActive || open ? "text-primary" : "text-muted",
            )}
          >
            <Menu className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      {/* Bottom sheet with the full menu — thumb-reachable on mobile. */}
      {open && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-surface p-4 pb-6 shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
            <MenuList isAdmin={isAdmin} cardPath={cardPath} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

// Keep the old SideNav export working for any existing imports.
export function SideNav({ isAdmin, cardPath }: { isAdmin: boolean; cardPath: string | null }) {
  const pathname = usePathname();
  const primary = USER_MENU.slice(0, 7).map((i) => ({
    ...i,
    href: i.href === "__CARD__" ? cardPath ?? "/me" : i.href,
  }));
  return (
    <nav className="hidden w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border p-3 md:flex">
      {primary.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
              active ? "bg-brand-50 text-brand-700" : "text-muted hover:bg-surface-2",
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
      {isAdmin && (
        <>
          <p className="mt-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
            Admin
          </p>
          {ADMIN_MENU.slice(0, 4).map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                  active ? "bg-brand-50 text-brand-700" : "text-muted hover:bg-surface-2",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </>
      )}
    </nav>
  );
}