import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { BottomNav, HeaderNav, SideNav } from "@/components/app-nav";
import { Logo } from "@/components/logo";
import { env } from "@/lib/env";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const cardPath = user.username ? `/u/${user.username}` : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold">
            <Logo size={28} />
            {env.appName}
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-700">
              {user.points} pts
            </span>
            <HeaderNav
              isAdmin={user.role === "ADMIN"}
              cardPath={cardPath}
              points={user.points}
            />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1">
        <SideNav isAdmin={user.role === "ADMIN"} cardPath={cardPath} />
        <main className="min-w-0 flex-1 pb-4">{children}</main>
      </div>

      <BottomNav isAdmin={user.role === "ADMIN"} cardPath={cardPath} />
    </div>
  );
}