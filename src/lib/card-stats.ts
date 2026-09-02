import "server-only";
import { prisma } from "@/lib/db/prisma";

// ---------------------------------------------------------------------------
// "Who viewed my card" — card analytics read model, computed from the existing
// ProfileView rows (de-duplicated views) and AnalyticsEvent rows
// (CONTACT_SAVE is tracked with targetId = the card owner).
// ---------------------------------------------------------------------------

export interface CardStats {
  totalViews: number;
  viewsLast7Days: number;
  newViewersLast7Days: number;
  totalContactSaves: number;
  contactSavesLast7Days: number;
  recentViewers: {
    at: Date;
    name: string | null; // null = anonymous (signed-out viewer)
    username: string | null;
    avatarUrl: string | null;
    companyName: string | null;
  }[];
}

/**
 * Counts the views in `rows` (all within the recent window) whose viewer is
 * seen for the FIRST time in that window. `firstSeenAt` maps each viewer
 * identity (viewerId or `ip:<ip>` for anonymous) to the earliest-ever view
 * instant. Pure — unit-testable.
 */
export function countNewViewers(
  rows: { viewerId: string | null; ip: string | null }[],
  firstSeenAt: Map<string, Date>,
  windowStart: Date,
): number {
  let newViewers = 0;
  const seen = new Set<string>();
  for (const row of rows) {
    const identity = row.viewerId ?? `ip:${row.ip ?? "unknown"}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    const first = firstSeenAt.get(identity);
    if (!first || first >= windowStart) newViewers++;
  }
  return newViewers;
}

/** Full card analytics for the dashboard "Who viewed my card" card. */
export async function getCardStats(userId: string): Promise<CardStats> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 7 * 86_400_000);

  const [totalViews, recentRows, firstSeenByViewer, firstSeenByIp, totalSaves, saves7d, recentViews] =
    await Promise.all([
      prisma.profileView.count({ where: { viewedUserId: userId } }),
      prisma.profileView.findMany({
        where: { viewedUserId: userId, createdAt: { gte: windowStart } },
        select: { viewerId: true, ip: true },
      }),
      // Earliest-ever view per signed-in viewer (all time).
      prisma.profileView.groupBy({
        by: ["viewerId"],
        where: { viewedUserId: userId, viewerId: { not: null } },
        _min: { createdAt: true },
      }),
      // Earliest-ever view per anonymous IP.
      prisma.profileView.groupBy({
        by: ["ip"],
        where: { viewedUserId: userId, viewerId: null, ip: { not: null } },
        _min: { createdAt: true },
      }),
      prisma.analyticsEvent.count({
        where: { type: "CONTACT_SAVE", targetId: userId },
      }),
      prisma.analyticsEvent.count({
        where: { type: "CONTACT_SAVE", targetId: userId, createdAt: { gte: windowStart } },
      }),
      prisma.profileView.findMany({
        where: { viewedUserId: userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          createdAt: true,
          viewer: {
            select: {
              profile: {
                select: {
                  username: true,
                  fullName: true,
                  displayName: true,
                  avatarUrl: true,
                  companyName: true,
                },
              },
            },
          },
        },
      }),
    ]);

  const firstSeenAt = new Map<string, Date>();
  for (const row of firstSeenByViewer) {
    if (row.viewerId && row._min.createdAt) {
      firstSeenAt.set(row.viewerId, row._min.createdAt);
    }
  }
  for (const row of firstSeenByIp) {
    if (row.ip && row._min.createdAt) {
      firstSeenAt.set(`ip:${row.ip}`, row._min.createdAt);
    }
  }

  return {
    totalViews,
    viewsLast7Days: recentRows.length,
    newViewersLast7Days: countNewViewers(recentRows, firstSeenAt, windowStart),
    totalContactSaves: totalSaves,
    contactSavesLast7Days: saves7d,
    recentViewers: recentViews.map((v) => ({
      at: v.createdAt,
      name: v.viewer?.profile?.displayName || v.viewer?.profile?.fullName || null,
      username: v.viewer?.profile?.username ?? null,
      avatarUrl: v.viewer?.profile?.avatarUrl ?? null,
      companyName: v.viewer?.profile?.companyName ?? null,
    })),
  };
}
