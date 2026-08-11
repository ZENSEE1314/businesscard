import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { BottomNav, SideNav } from "@/components/app-nav";
import { env } from "@/lib/env";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/feed" className="flex items-center gap-2 font-bold">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-fg text-sm">
              K
            </span>
            {env.appName}
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-700">
              {user.points} pts
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1">
        <SideNav />
        <main className="flex-1 pb-4">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
