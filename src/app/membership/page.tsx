import type { Metadata } from "next";
import Link from "next/link";
import {
  Compass,
  Gift,
  Home,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  Store,
  Trophy,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getMembershipBank } from "@/lib/settings";
import {
  MEMBERSHIP_TIERS,
  TIER_ORDER,
  formatIdr,
} from "@/lib/membership";
import { MembershipUpgrade, type TierView } from "@/features/membership/upgrade";
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

  const tiers: TierView[] = TIER_ORDER.map((t) => {
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

  let currentTier: string | null = null;
  let pending: {
    id: string;
    tier: string;
    orderCode: string;
    priceLabel: string;
  } | null = null;

  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { membershipTier: true, membershipStatus: true },
    });
    if (dbUser?.membershipStatus === "ACTIVE" && dbUser.membershipTier) {
      currentTier = dbUser.membershipTier;
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

      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold">Member Club</h1>
          <p className="mx-auto mt-2 max-w-xl text-muted">
            Everyone joins free with a digital name card. Upgrade to a business
            membership to advertise, get featured, and access networking and
            gala events.
          </p>
        </div>

        <MembershipUpgrade
          tiers={tiers}
          bank={bank}
          isGuest={!user}
          currentTier={currentTier}
          pending={pending}
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-3 text-sm">
          <InfoCard title="Networking" body="Weekly business networking at member restaurants ($15/pax). Free for Gold & Diamond." />
          <InfoCard title="Awards" body="Business awards with certificate, magazine feature, app posting and a grand gala table." />
          <InfoCard title="Gala dinners" body="Monthly members gala and an annual grand gala — Diamond members get a free table." />
        </div>

        {/* Quick links — the rest of the app, one tap away */}
        {user ? (
          <div className="mt-12 border-t border-border pt-8">
            <h2 className="text-center text-lg font-bold">Explore the app</h2>
            <p className="mt-1 text-center text-sm text-muted">
              Everything {env.appName} offers, one tap away.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {QUICK_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface p-4 text-sm font-medium transition-colors hover:bg-surface-2"
                >
                  <l.icon className="h-4 w-4 shrink-0 text-brand-600" />
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-12 rounded-3xl bg-primary px-6 py-10 text-center text-primary-fg">
            <h2 className="text-xl font-bold">Join free today</h2>
            <p className="mx-auto mt-2 max-w-md text-primary-fg/80">
              Create your digital name card in minutes and unlock the whole
              network.
            </p>
            <Link
              href="/register"
              className="mt-5 inline-flex h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-brand-700"
            >
              Get started free
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

const QUICK_LINKS = [
  { href: "/hub", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/feed", label: "Feed", icon: Newspaper },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/chat", label: "Messages", icon: MessageSquare },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/rewards", label: "Rewards", icon: Gift },
  { href: "/awards", label: "Awards & Events", icon: Trophy },
  { href: "/referrals", label: "Refer & Earn", icon: UserPlus },
  { href: "/me", label: "Profile", icon: User },
];

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-muted">{body}</p>
    </div>
  );
}
