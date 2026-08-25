import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  DEFAULT_CHECKIN_SETTINGS,
  getCheckinSettings,
  type CheckinSettings,
} from "@/lib/settings";
import { addDaysToLocalDate, daysBetweenLocalDates, localDateKey } from "@/lib/time";

// Daily check-in rewards use the EXISTING points system only:
//   - balance lives on User.points
//   - every award writes a PointTransaction row (the shared ledger)
//   - DailyCheckIn adds one row per user per LOCAL day with a DB unique
//     constraint on (userId, localDate) so concurrent taps can never double-pay.
// There is deliberately NO separate token currency anywhere in this flow.

export const CHECKIN_EVENT_KEY = "daily_checkin";

export interface CheckinOutcome {
  awarded: boolean;
  reason?: "disabled" | "duplicate";
  pointsAwarded: number;
  basePoints: number;
  bonusPoints: number;
  streakDay: number;
  balance: number;
  localDate: string;
}

/**
 * Pure streak/bonus computation so timezone and milestone logic is unit-testable.
 *
 * @param lastLocalDate previous check-in's local date key (null = first ever)
 * @param lastStreakDay streak length as of that previous check-in
 * @param today today's local date key
 */
export function computeStreak(
  lastLocalDate: string | null,
  lastStreakDay: number,
  today: string,
): number {
  if (!lastLocalDate) return 1;
  const gap = daysBetweenLocalDates(today, lastLocalDate);
  if (gap === 0) return lastStreakDay; // same-day recompute (defensive)
  if (gap === 1) return lastStreakDay + 1; // consecutive day continues the streak
  return 1; // missed at least one day → reset
}

export function computeBonus(streakDay: number, settings: CheckinSettings): number {
  if (!settings.streakBonusEnabled) return 0;
  // Highest milestone whose day is <= current streak counts. A user hitting
  // day 14 without checking in exactly on day 7 still gets the day-7 tier.
  let bonus = 0;
  for (const m of settings.milestones) {
    if (streakDay >= m.day && m.bonus > bonus) bonus = m.bonus;
  }
  return bonus;
}

/** Claims today's check-in. Safe under concurrent requests / repeated taps. */
export async function claimDailyCheckIn(userId: string): Promise<CheckinOutcome> {
  const settings = await getCheckinSettings();
  const today = localDateKey();

  if (!settings.enabled) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { points: true },
    });
    return {
      awarded: false,
      reason: "disabled",
      pointsAwarded: 0,
      basePoints: 0,
      bonusPoints: 0,
      streakDay: 0,
      balance: user?.points ?? 0,
      localDate: today,
    };
  }

  // Serializable transactions can lose to a concurrent writer (P2034). Retry a
  // couple of times before falling back — the DB unique constraint still
  // guarantees at most one award per day.
  const MAX_ATTEMPTS = 3;
  let lastWriteConflict = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          // Already claimed today? Return the existing claim (idempotent).
          const existing = await tx.dailyCheckIn.findUnique({
            where: { userId_localDate: { userId, localDate: today } },
          });
          if (existing) {
            const u = await tx.user.findUnique({
              where: { id: userId },
              select: { points: true },
            });
            return {
              awarded: false,
              reason: "duplicate" as const,
              pointsAwarded: existing.pointsAwarded,
              basePoints: existing.basePoints,
              bonusPoints: existing.bonusPoints,
              streakDay: existing.streakDay,
              balance: u?.points ?? 0,
              localDate: today,
            };
          }

          const last = await tx.dailyCheckIn.findFirst({
            where: { userId },
            orderBy: { localDate: "desc" },
          });

          const streakDay = computeStreak(last?.localDate ?? null, last?.streakDay ?? 0, today);
          const basePoints = Math.max(0, Math.floor(settings.basePoints));
          const bonusPoints = computeBonus(streakDay, settings);
          const total = Math.min(basePoints + bonusPoints, Math.max(1, settings.maxDailyPoints));

          // The unique index on (userId, localDate) is the final guard: two
          // concurrent transactions cannot both insert for the same local day.
          await tx.dailyCheckIn.create({
            data: {
              userId,
              localDate: today,
              pointsAwarded: total,
              basePoints,
              bonusPoints: total - basePoints,
              streakDay,
            },
          });

          const updated = await tx.user.update({
            where: { id: userId },
            data: {
              points: { increment: total },
              lifetimeEarned: { increment: total },
            },
            select: { points: true },
          });

          await tx.pointTransaction.create({
            data: {
              userId,
              type: "EARN",
              eventKey: CHECKIN_EVENT_KEY,
              amount: total,
              balanceAfter: updated.points,
              referenceType: "daily_check_in",
              referenceId: `${userId}:${today}`,
              description:
                bonusPoints > 0
                  ? `Daily check-in (day ${streakDay} streak, includes +${total - basePoints} bonus)`
                  : `Daily check-in (day ${streakDay} streak)`,
              idempotencyKey: `${CHECKIN_EVENT_KEY}:${userId}:${today}`,
            },
          });

          return {
            awarded: true,
            pointsAwarded: total,
            basePoints,
            bonusPoints: total - basePoints,
            streakDay,
            balance: updated.points,
            localDate: today,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        (err.code === "P2002" || err.code === "P2034")
      ) {
        // P2002 unique-violation or P2034 write-conflict/deadlock: another
        // request claimed today. Report its result instead of erroring.
        lastWriteConflict = true;
        continue;
      }
      throw err;
    }
  }

  if (lastWriteConflict) {
    const existing = await prisma.dailyCheckIn.findUnique({
      where: { userId_localDate: { userId, localDate: today } },
    });
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { points: true },
    });
    return {
      awarded: false,
      reason: "duplicate",
      pointsAwarded: existing?.pointsAwarded ?? 0,
      basePoints: existing?.basePoints ?? 0,
      bonusPoints: existing?.bonusPoints ?? 0,
      streakDay: existing?.streakDay ?? 0,
      balance: u?.points ?? 0,
      localDate: today,
    };
  }

  // Unreachable (the loop always returns or throws).
  throw new Error("claimDailyCheckIn failed after retries");
}

export interface CheckinStatus {
  enabled: boolean;
  checkedInToday: boolean;
  todayPoints: number | null;
  streak: number;
  totalCheckInDays: number;
  lastCheckInAt: Date | null;
  nextMilestone: { day: number; bonus: number } | null;
  basePoints: number;
}

/** Read-model for dashboard/UI display. Never mutates anything. */
export async function getCheckInStatus(userId: string): Promise<CheckinStatus> {
  const settings = await getCheckinSettings();
  const today = localDateKey();
  const yesterday = addDaysToLocalDate(today, -1);

  const [todays, recent, total] = await Promise.all([
    prisma.dailyCheckIn.findUnique({
      where: { userId_localDate: { userId, localDate: today } },
    }),
    prisma.dailyCheckIn.findFirst({
      where: { userId, localDate: { in: [today, yesterday] } },
      orderBy: { localDate: "desc" },
    }),
    prisma.dailyCheckIn.count({ where: { userId } }),
  ]);

  // Displayed streak: if the user has not checked in today OR yesterday the
  // streak is broken and restarts at 0 until their next claim.
  let streak = 0;
  if (recent) {
    const gap = daysBetweenLocalDates(today, recent.localDate);
    streak = gap <= 1 ? recent.streakDay : 0;
  }

  const upcoming =
    settings.streakBonusEnabled
      ? [...settings.milestones].sort((a, b) => a.day - b.day).find((m) => m.day > streak) ?? null
      : null;

  return {
    enabled: settings.enabled,
    checkedInToday: Boolean(todays),
    todayPoints: todays?.pointsAwarded ?? null,
    streak,
    totalCheckInDays: total,
    lastCheckInAt: recent?.createdAt ?? null,
    nextMilestone: upcoming,
    basePoints: settings.basePoints,
  };
}

export { DEFAULT_CHECKIN_SETTINGS };