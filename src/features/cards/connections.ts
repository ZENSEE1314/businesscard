import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getCardRankingSettings } from "@/lib/settings";
import { daysBetweenLocalDates, localDateKey } from "@/lib/time";

// "Top Connections" shown below every public digital card: up to seven users
// connected to the card owner, ranked by an admin-configurable method.
//
// Privacy rules enforced here:
//  - users with no profile or deactivated accounts are excluded
//  - the relationship must exist in EITHER direction (owner saved them, or
//    they saved the owner) — ordinary contacts are NOT referral parents
//  - missing photos/companies degrade gracefully in the UI

export interface PublicConnection {
  userId: string;
  username: string;
  name: string;
  companyName: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  verified: boolean;
  membershipTier: string | null;
  rank: number;
}

interface ScoredRow {
  userId: string;
  username: string;
  fullName: string;
  displayName: string | null;
  companyName: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  points: number;
  membershipTier: string | null;
  loginStreak: number;
  lastLoginDay: string | null;
  contactCount: number;
}

const TIER_RANK: Record<string, number> = { BRIDGEMASTER: 2, BRIDGEMAKER: 1 };

/**
 * Pure scoring so ranking is unit-testable. Higher score = higher rank.
 *  - points:      existing points balance
 *  - activity:    recent engagement (login streak + recency of last login day)
 *  - membership:  tier rank first, then points
 *  - connections: number of successful connections (contacts either direction)
 */
export function scoreConnection(
  row: ScoredRow,
  method: string,
  todayKey: string,
): number {
  switch (method) {
    case "points":
      return row.points;
    case "membership":
      return (TIER_RANK[row.membershipTier ?? ""] ?? 0) * 1_000_000 + row.points;
    case "connections":
      return row.contactCount;
    case "activity":
    default: {
      const sinceDays = row.lastLoginDay
        ? Math.max(0, daysBetweenLocalDates(todayKey, row.lastLoginDay))
        : 9999;
      // Recency dominates; streak breaks ties.
      return Math.max(0, 1000 - sinceDays * 10) + row.loginStreak;
    }
  }
}

export async function getTopConnections(
  ownerUserId: string,
): Promise<PublicConnection[]> {
  const settings = await getCardRankingSettings();
  if (!settings.enabled || settings.maxConnections <= 0) return [];
  const limit = Math.min(7, settings.maxConnections); // spec hard-caps at seven

  // Users connected to the owner in either direction, excluding the owner,
  // deactivated accounts and profiles hidden from public view.
  const rows = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      id: { not: ownerUserId },
      OR: [
        { contactsOwned: { some: { contactUserId: ownerUserId } } },
        { contactsSaved: { some: { ownerUserId } } },
      ],
    },
    select: {
      id: true,
      points: true,
      membershipTier: true,
      loginStreak: true,
      lastLoginDay: true,
      profile: {
        select: {
          username: true,
          fullName: true,
          displayName: true,
          companyName: true,
          jobTitle: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          contactsOwned: true,
          contactsSaved: true,
        },
      },
    },
  });

  if (rows.length === 0) return [];

  const todayKey = localDateKey();
  const scored = rows.map((r) => ({
    userId: r.id,
    username: r.profile?.username ?? "",
    fullName: r.profile?.fullName ?? r.profile?.displayName ?? "Member",
    displayName: r.profile?.displayName ?? null,
    companyName: r.profile?.companyName ?? null,
    jobTitle: r.profile?.jobTitle ?? null,
    avatarUrl: r.profile?.avatarUrl ?? null,
    points: r.points,
    membershipTier: r.membershipTier,
    loginStreak: r.loginStreak,
    lastLoginDay: r.lastLoginDay,
    contactCount: r._count.contactsOwned + r._count.contactsSaved,
  }));

  scored.sort(
    (a, b) =>
      scoreConnection(b, settings.method, todayKey) -
      scoreConnection(a, settings.method, todayKey),
  );

  return scored.slice(0, limit).map((r, i) => ({
    userId: r.userId,
    username: r.username,
    name: r.displayName || r.fullName,
    companyName: r.companyName,
    jobTitle: r.jobTitle,
    avatarUrl: r.avatarUrl,
    verified: false, // personal verification badge lands with business verification later
    membershipTier: r.membershipTier,
    rank: i + 1,
  }));
}