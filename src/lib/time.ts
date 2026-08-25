// Timezone-aware date helpers for user-facing day calculations.
//
// The product default is Asia/Jakarta (WIB, UTC+7, no DST). All "local day"
// logic (check-ins, login streaks, membership days) goes through here so
// boundaries stay correct regardless of the server's own timezone.

export const DEFAULT_TIMEZONE = process.env.DAILY_CHECK_IN_TIMEZONE || "Asia/Jakarta";

/** "YYYY-MM-DD" for an instant in the given IANA timezone. */
export function localDateKey(date: Date = new Date(), timeZone: string = DEFAULT_TIMEZONE): string {
  // en-CA gives ISO-like YYYY-MM-DD output.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Whole days between two local calendar dates (a - b), computed on the date
 * keys themselves so DST/timezone shifts can never skew the result.
 */
export function daysBetweenLocalDates(aKey: string, bKey: string): number {
  const a = Date.parse(`${aKey}T00:00:00Z`);
  const b = Date.parse(`${bKey}T00:00:00Z`);
  return Math.round((a - b) / 86_400_000);
}

/** Adds n days to a YYYY-MM-DD key and returns the resulting key. */
export function addDaysToLocalDate(key: string, n: number): string {
  const t = Date.parse(`${key}T00:00:00Z`) + n * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/** Human label for how long someone has been a member ("Joined today", "Member for 42 days"). */
export function membershipDurationLabel(joinedAt: Date, now: Date = new Date(), timeZone: string = DEFAULT_TIMEZONE): string {
  const joined = daysBetweenLocalDates(localDateKey(now, timeZone), localDateKey(joinedAt, timeZone));
  if (joined <= 0) return "Joined today";
  if (joined === 1) return "Member for 1 day";
  return `Member for ${joined} days`;
}

/** Numeric whole-day membership age (0 on join day). */
export function membershipDays(joinedAt: Date, now: Date = new Date(), timeZone: string = DEFAULT_TIMEZONE): number {
  return Math.max(0, daysBetweenLocalDates(localDateKey(now, timeZone), localDateKey(joinedAt, timeZone)));
}

/** "3 days ago" / "today" / "yesterday" style relative day label. */
export function daysAgoLabel(date: Date | null | undefined, now: Date = new Date(), timeZone: string = DEFAULT_TIMEZONE): string {
  if (!date) return "Never";
  const diff = daysBetweenLocalDates(localDateKey(now, timeZone), localDateKey(date, timeZone));
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff} days ago`;
}