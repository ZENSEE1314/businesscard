import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getMembershipBank } from "@/lib/settings";
import {
  MEMBERSHIP_TIERS,
  TIER_ORDER,
  FREE_TIER_LABEL,
  FREE_TIER_BENEFITS,
  formatIdr,
} from "@/lib/membership";
import { MembershipUpgrade, type TierView } from "@/features/membership/upgrade";
import { BottomNav } from "@/components/app-nav";
import { getLocale, tt } from "@/lib/i18n/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Member Club — Membership",
  description:
    "Join the Member Club. BridgeMaker and BridgeMaster business memberships with ads, magazine features, networking and gala dinners.",
};

export default async function MembershipPage() {
  const user = await getCurrentUser();
  const bank = await getMembershipBank();
  const locale = await getLocale();

  const paidTiers: TierView[] = TIER_ORDER.map((t) => {
    const c = MEMBERSHIP_TIERS[t];
    return {
      tier: c.tier,
      label: c.label,
      priceLabel: formatIdr(c.priceIdr),
      tagline: c.tagline,
      benefits: c.benefits,
      highlighted: c.highlighted,
    };
  });

  // Free "Bridge Member" tier shown first, then the two paid tiers.
  const tiers: TierView[] = [
    {
      tier: "FREE",
      label: FREE_TIER_LABEL,
      priceLabel: tt(locale, "membership.free"),
      tagline: tt(locale, "membership.freeTagline"),
      benefits: FREE_TIER_BENEFITS,
    },
    ...paidTiers,
  ];

  let currentTier: string | null = null;
  let currentExpiry: string | null = null;
  let pending: {
    id: string;
    tier: string;
    orderCode: string;
    priceLabel: string;
  } | null = null;

  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        membershipTier: true,
        membershipStatus: true,
        membershipExpiresAt: true,
      },
    });
    if (dbUser?.membershipStatus === "ACTIVE" && dbUser.membershipTier) {
      currentTier = dbUser.membershipTier;
      currentExpiry = dbUser.membershipExpiresAt
        ? new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : locale === "id" ? "id-ID" : "en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(dbUser.membershipExpiresAt)
        : null;
    } else {
      const p = await prisma.membership.findFirst({
        where: { userId: user.id, status: "PENDING" },
        orderBy: { createdAt: "desc" },
      });
      if (p) {
        pending = {
          id: p.id,
          tier: p.tier,
          orderCode: p.orderCode,
          priceLabel: formatIdr(p.priceIdr),
        };
      }
    }
  }

  return (
    <main className="min-h-dvh">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Link href={user ? "/hub" : "/"} className="font-bold">
            {env.appName}
          </Link>
          {user ? (
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <span className="hidden shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 sm:inline">
                {user.points} pts
              </span>
              <nav
                aria-label="Site"
                className="flex items-center gap-0.5 overflow-x-auto text-sm sm:gap-1"
              >
                {[
                  { href: "/hub", label: "Home" },
                  { href: "/feed", label: "Feed" },
                  { href: "/contacts", label: "Contacts" },
                  { href: "/chat", label: "Messages" },
                  { href: "/me", label: "Profile" },
                ].map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="shrink-0 rounded-lg px-2.5 py-1.5 font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm">
              <Link href="/login" className="font-medium text-primary">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-primary px-3.5 py-2 font-semibold text-primary-fg"
              >
                Get started
              </Link>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-10 pb-24">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold">{tt(locale, "membership.title")}</h1>
          <p className="mx-auto mt-2 max-w-xl text-muted">
            {tt(locale, "membership.intro")}
          </p>
        </div>

        <MembershipUpgrade
          tiers={tiers}
          bank={bank}
          isGuest={!user}
          currentTier={currentTier}
          currentExpiry={currentExpiry}
          pending={pending}
        />
      </div>

      {/* App bottom navigation for signed-in members. */}
      {user && (
        <BottomNav isAdmin={user.role === "ADMIN"} cardPath={user.username ? `/u/${user.username}` : null} />
      )}
    </main>
  );
}
