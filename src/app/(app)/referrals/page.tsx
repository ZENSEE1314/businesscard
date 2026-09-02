import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Gift, Trophy, UserPlus, Users, Share2, Wallet, Zap } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { env } from "@/lib/env";
import { Card } from "@/components/ui";
import { getLocale, tt } from "@/lib/i18n/server";
import { ReferralShare } from "@/features/referrals/referral-share";
import { ReferralMoney } from "@/features/referrals/referral-money";
import { ChatAvatar } from "@/features/chat/chat-avatar";
import { earningTotals, listEarnings, listWithdrawals } from "@/lib/referral-money";
import { getReferralMilestones } from "@/lib/referral-milestones";
import { TIER_ORDER, getTierConfig, type Tier } from "@/lib/membership";
import { getMinWithdrawalIdr } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Refer & Earn" };

const sourceLabel: Record<string, string> = {
  DIRECT: "Direct signup",
  REFERRAL_LINK: "Referral link",
  CARD_LINK: "Card link",
  QR_SCAN: "QR scan",
  NFC_CARD: "NFC card",
  EVENT_INVITE: "Event invite",
};

const howItWorks = [
  {
    icon: Share2,
    title: "Share your link or card",
    desc: "Send your referral link to friends, or let them scan your QR code / NFC card.",
  },
  {
    icon: UserPlus,
    title: "They join BridgeX",
    desc: "Anyone who signs up through your link is registered under you automatically.",
  },
  {
    icon: Gift,
    title: "You earn points + 20% commission",
    desc: "Free signups earn you points. If they upgrade to a paid membership, you earn 20% of their fee as withdrawable money.",
  },
  {
    icon: Wallet,
    title: "Withdraw your earnings",
    desc: "Request a payout any time — an admin verifies it and transfers to your bank.",
  },
];

export default async function ReferralsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getLocale();

  const [me, referred, pointsAgg, money, earnings, withdrawals, minIdr] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { referralCode: true, _count: { select: { referrals: true } } },
    }),
    prisma.user.findMany({
      where: { referredById: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        signupSource: true,
        status: true,
        membershipTier: true,
        profile: {
          select: {
            username: true,
            fullName: true,
            displayName: true,
            avatarUrl: true,
            companyName: true,
            jobTitle: true,
          },
        },
      },
    }),
    prisma.pointTransaction.aggregate({
      where: { userId: user.id, type: "REFERRAL" },
      _sum: { amount: true },
    }),
    earningTotals(user.id),
    listEarnings(user.id),
    listWithdrawals(user.id),
    getMinWithdrawalIdr(),
  ]);

  const referralCode = me?.referralCode ?? "";
  const link = `${env.appUrl}/register?ref=${encodeURIComponent(referralCode)}`;
  const shareText = `Join me on ${env.appName} — create your free digital name card and grow your business network: ${link}`;
  const totalReferrals = me?._count.referrals ?? referred.length;
  const referralPoints = pointsAgg._sum.amount ?? 0;

  // Milestone ladder (5 → 250 pts, 10 → 500, 15 → 750 …) with claim state.
  const milestones = await getReferralMilestones(user.id, totalReferrals);
  const next = milestones.next;
  const progressPct = Math.min(
    100,
    Math.round((totalReferrals / Math.max(next.target, 1)) * 100),
  );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 py-4">
      <div className="px-1">
        <h1 className="text-xl font-bold">{tt(locale, "referrals.title")}</h1>
        <p className="mt-1 text-sm text-muted">
          Grow the BridgeX network and earn points for every member you bring
          in.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted">
            <Users className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Referrals
            </span>
          </div>
          <p className="mt-1.5 text-2xl font-bold">{totalReferrals}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted">
            <Gift className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Points earned
            </span>
          </div>
          <p className="mt-1.5 text-2xl font-bold text-brand-700">
            +{referralPoints.toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Milestone rewards — every 5 friends pays a growing bonus */}
      <Card className="p-5">
        <h2 className="flex items-center gap-1.5 font-semibold">
          <Trophy className="h-4 w-4 text-amber-500" />
          {tt(locale, "referrals.milestones")}
        </h2>
        <p className="mt-1 text-sm text-muted">{tt(locale, "referrals.milestoneDesc")}</p>

        {/* Progress toward the next milestone */}
        <div className="mt-4 rounded-xl border border-border bg-surface-2 p-3">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
            <span className="font-semibold">
              {tt(locale, "referrals.nextMilestone")}: {next.target}{" "}
              {tt(locale, "referrals.friends")} →{" "}
              <span className="text-brand-700">
                +{next.reward} {tt(locale, "common.points")}
              </span>
            </span>
            <span className="text-muted">
              {tt(locale, "referrals.friendsToGo", {
                n: Math.max(next.target - totalReferrals, 0),
              })}
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted">
            {tt(locale, "referrals.progressOf", {
              done: Math.min(totalReferrals, next.target),
              target: next.target,
            })}
          </p>
        </div>

        {/* Ladder */}
        <ul className="mt-3 space-y-1.5">
          {milestones.milestones.map((m) => (
            <li
              key={m.step}
              className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"
            >
              <span className="text-sm font-medium">
                {m.target} {tt(locale, "referrals.friends")} →{" "}
                <span className="font-bold text-brand-700">+{m.reward}</span>
              </span>
              {m.claimed ? (
                <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                  ✓ {tt(locale, "referrals.milestoneClaimed")}
                </span>
              ) : m.reached ? (
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  {tt(locale, "referrals.milestoneReached")}
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-muted">
                  {tt(locale, "referrals.friendsToGo", { n: m.target - totalReferrals })}
                </span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {/* Fast-upgrade double commission explainer */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="flex items-center gap-1.5 text-sm font-bold text-amber-800">
          <Zap className="h-4 w-4 shrink-0" />
          {tt(locale, "referrals.fastUpgrade")}
        </p>
        <p className="mt-1 text-sm text-amber-800/90">
          {tt(locale, "referrals.fastUpgradeDesc")}
        </p>
      </div>

      {/* Share */}
      <Card className="p-5">
        <ReferralShare link={link} shareText={shareText} />
      </Card>

      {/* Referral money — 20% commission + withdrawals */}
      <ReferralMoney
        data={{
          total: money.total,
          paid: money.paid,
          pending: money.pending,
          available: money.available,
          minWithdrawalIdr: minIdr,
          earnings,
          withdrawals,
        }}
      />

      {/* How it works */}
      <Card className="p-5">
        <h2 className="font-semibold">{tt(locale, "referrals.howItWorks")}</h2>
        <ol className="mt-3 space-y-3">
          {howItWorks.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <step.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {i + 1}. {step.title}
                </p>
                <p className="mt-0.5 text-sm text-muted">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {/* Referral list */}
      <Card className="p-5">
        <h2 className="font-semibold">
          Your referrals{" "}
          <span className="text-sm font-normal text-muted">
            ({referred.length})
          </span>
        </h2>
        {referred.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
            No referrals yet. Share your link above to invite your first
            member!
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {referred.map((r) => {
              const name =
                r.profile?.displayName || r.profile?.fullName || "BridgeX member";
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <ChatAvatar name={name} url={r.profile?.avatarUrl} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{name}</p>
                    <p className="truncate text-xs text-muted">
                      Joined{" "}
                      {new Intl.DateTimeFormat("en", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(r.createdAt)}
                      {r.signupSource
                        ? ` · via ${sourceLabel[r.signupSource] ?? r.signupSource}`
                        : ""}
                    </p>
                  </div>
                  {r.membershipTier &&
                  (TIER_ORDER as string[]).includes(r.membershipTier) ? (
                    <span
                      className="shrink-0 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white"
                      title={tt(locale, "referrals.paidMember")}
                    >
                      ⭐ {getTierConfig(r.membershipTier as Tier).label}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                      Joined
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}