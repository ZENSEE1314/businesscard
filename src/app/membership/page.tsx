import type { Metadata } from "next";
import Link from "next/link";
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
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href={user ? "/feed" : "/"} className="font-bold">
            {env.appName}
          </Link>
          {!user && (
            <Link href="/login" className="text-sm font-medium text-primary">
              Log in
            </Link>
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
      </div>
    </main>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-muted">{body}</p>
    </div>
  );
}
