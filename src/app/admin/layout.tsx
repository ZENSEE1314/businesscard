import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users/activity", label: "Activity" },
  { href: "/admin/users/tree", label: "Network Tree" },
  { href: "/admin/memberships", label: "Memberships" },
  { href: "/admin/feed", label: "Feed" },
  { href: "/admin/awards", label: "Awards" },
  { href: "/admin/rewards", label: "Rewards" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 overflow-x-auto px-4">
          <Link href="/admin" className="shrink-0 font-bold">
            Admin
          </Link>
          <nav className="flex shrink-0 gap-1 text-sm" aria-label="Admin sections">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-muted hover:bg-surface-2"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Link href="/dashboard" className="ml-auto text-sm text-primary">
            Exit
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
