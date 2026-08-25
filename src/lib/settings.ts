import "server-only";
import { prisma } from "@/lib/db/prisma";

// Reads a JSON system setting, falling back to a default.
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  if (!row) return fallback;
  return row.value as T;
}

// Writes a JSON system setting (upsert).
export async function setSetting<T>(key: string, value: T): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value: value as object },
    create: { key, value: value as object },
  });
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export async function getMembershipBank(): Promise<BankDetails> {
  return getSetting<BankDetails>("membershipBank", {
    bankName: "Bank BCA",
    accountNumber: "0000000000",
    accountHolder: "Member Club",
  });
}

// ---------------------------------------------------------------------------
// Daily check-in configuration
// ---------------------------------------------------------------------------

export interface CheckinSettings {
  enabled: boolean;
  basePoints: number;
  autoCheckInOnLogin: boolean;
  streakBonusEnabled: boolean;
  // Streak milestone bonuses: at day N of a streak the user gets +bonus points.
  milestones: { day: number; bonus: number }[];
  maxDailyPoints: number; // hard cap per claim (base + bonus)
}

export const DEFAULT_CHECKIN_SETTINGS: CheckinSettings = {
  enabled: true,
  basePoints: 10,
  autoCheckInOnLogin: false,
  streakBonusEnabled: true,
  milestones: [
    { day: 7, bonus: 25 },
    { day: 30, bonus: 100 },
    { day: 100, bonus: 500 },
  ],
  maxDailyPoints: 600,
};

export function getCheckinSettings() {
  return getSetting<CheckinSettings>("dailyCheckIn", DEFAULT_CHECKIN_SETTINGS);
}

// ---------------------------------------------------------------------------
// Activity thresholds (days since last successful login)
// ---------------------------------------------------------------------------

export interface ActivityThresholds {
  activeWithinDays: number; // <= this => ACTIVE (default 7)
  inactiveWithinDays: number; // <= this => INACTIVE (default 30), above => DORMANT
}

export const DEFAULT_ACTIVITY_THRESHOLDS: ActivityThresholds = {
  activeWithinDays: 7,
  inactiveWithinDays: 30,
};

export function getActivityThresholds() {
  return getSetting<ActivityThresholds>("activityThresholds", DEFAULT_ACTIVITY_THRESHOLDS);
}

// ---------------------------------------------------------------------------
// Public card top-connections ranking
// ---------------------------------------------------------------------------

export type ConnectionRankingMethod =
  | "points" // existing points balance
  | "activity" // recent engagement: login recency + streak
  | "membership" // tier rank then points
  | "connections"; // most saved contacts

export interface CardRankingSettings {
  enabled: boolean;
  method: ConnectionRankingMethod;
  maxConnections: number; // spec caps display at seven
}

export const DEFAULT_CARD_RANKING: CardRankingSettings = {
  enabled: true,
  method: "activity",
  maxConnections: 7,
};

export function getCardRankingSettings() {
  return getSetting<CardRankingSettings>("cardRanking", DEFAULT_CARD_RANKING);
}

// ---------------------------------------------------------------------------
// AI profile generation
// ---------------------------------------------------------------------------

export interface AiSettings {
  enabled: boolean; // master switch (AND AI_PROFILE_GENERATION_ENABLED env)
}

export const DEFAULT_AI_SETTINGS: AiSettings = { enabled: true };

export function getAiSettings() {
  return getSetting<AiSettings>("aiProfile", DEFAULT_AI_SETTINGS);
}

// ---------------------------------------------------------------------------
// Login rate limiting
// ---------------------------------------------------------------------------

export interface RateLimitSettings {
  // Failed-attempt counters. Successful logins never count and clear the
  // email counter, so shared carrier IPs cannot lock out unrelated users.
  emailFailuresAllowed: number; // per email per window
  ipFailuresAllowed: number; // per normalized IP per window
  windowMinutes: number;
}

export const DEFAULT_RATE_LIMIT_SETTINGS: RateLimitSettings = {
  emailFailuresAllowed: 10,
  ipFailuresAllowed: 50,
  windowMinutes: 15,
};

export function getRateLimitSettings() {
  return getSetting<RateLimitSettings>("loginRateLimit", DEFAULT_RATE_LIMIT_SETTINGS);
}