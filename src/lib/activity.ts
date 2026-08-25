import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getActivityThresholds } from "@/lib/settings";
import { daysBetweenLocalDates, localDateKey } from "@/lib/time";

// ---------------------------------------------------------------------------
// Activity statuses (thresholds admin-configurable via SystemSetting)
// ---------------------------------------------------------------------------

export type ActivityStatus = "ACTIVE" | "INACTIVE" | "DORMANT" | "NEW";

export interface ActivityStatusInput {
  createdAt: Date;
  lastLoginAt: Date | null;
  onboarded?: boolean; // has completed profile basics
}

/**
 * Classifies a user. Pure function so it is unit-testable and cheap to run
 * over large user lists without extra queries.
 *
 *  ACTIVE  — logged in within the last `activeWithinDays` days
 *  INACTIVE — last login between active+1 and `inactiveWithinDays` days ago
 *  DORMANT — no login for more than `inactiveWithinDays` days
 *  NEW     — registered recently and never logged in / not yet onboarded
 */
export async function classifyActivity(
  input: ActivityStatusInput,
): Promise<ActivityStatus> {
  const t = await getActivityThresholds();
  return classifyActivityWithThresholds(input, t);
}

export function classifyActivityWithThresholds(
  input: ActivityStatusInput,
  thresholds: { activeWithinDays: number; inactiveWithinDays: number },
): ActivityStatus {
  const today = localDateKey();
  if (!input.lastLoginAt) {
    const joinedDaysAgo = daysBetweenLocalDates(today, localDateKey(input.createdAt));
    // Never logged in: NEW while fresh, otherwise dormant.
    if (!input.onboarded || joinedDaysAgo <= thresholds.activeWithinDays) {
      return "NEW";
    }
    if (joinedDaysAgo <= thresholds.inactiveWithinDays) return "INACTIVE";
    return "DORMANT";
  }
  const since = Math.max(
    0,
    daysBetweenLocalDates(today, localDateKey(input.lastLoginAt)),
  ); // clock skew guard — treat future timestamps as today
  if (since <= thresholds.activeWithinDays) return "ACTIVE";
  if (since <= thresholds.inactiveWithinDays) return "INACTIVE";
  return "DORMANT";
}

// ---------------------------------------------------------------------------
// Successful-login recording
// ---------------------------------------------------------------------------

export interface LoginTrackingResult {
  totalLoginDays: number;
  loginStreak: number;
  countedNewDay: boolean;
}

/**
 * Records ONE successful login. Called only after credentials verify — failed
 * attempts never reach this. Repeated logins on the same local day do not
 * inflate totalLoginDays or change the streak.
 */
export async function recordSuccessfulLogin(userId: string): Promise<LoginTrackingResult> {
  const today = localDateKey();

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { lastLoginDay: true, totalLoginDays: true, loginStreak: true },
    });
    if (!user) throw new Error("User not found");

    let totalLoginDays = user.totalLoginDays;
    let loginStreak = user.loginStreak;
    let countedNewDay = false;

    if (user.lastLoginDay !== today) {
      countedNewDay = true;
      totalLoginDays += 1;
      // Streak continues when the previous counted day was yesterday;
      // any larger gap resets to 1. A null lastLoginDay starts at 1.
      const gap = user.lastLoginDay
        ? daysBetweenLocalDates(today, user.lastLoginDay)
        : Number.POSITIVE_INFINITY;
      loginStreak = gap === 1 ? user.loginStreak + 1 : 1;
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        lastLoginDay: today,
        totalLoginDays,
        loginStreak,
      },
    });

    return { totalLoginDays, loginStreak, countedNewDay };
  });

  return result;
}