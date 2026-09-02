import "server-only";
import { prisma } from "@/lib/db/prisma";
import {
  addDaysToLocalDate,
  localDateKey,
  startOfLocalDay,
} from "@/lib/time";
import { adjustPoints } from "@/lib/points/engine";

// ---------------------------------------------------------------------------
// Weekly networking missions. Every week (Monday–Sunday, Asia/Jakarta local)
// members work through five networking goals and claim a points reward for
// each — plus a bonus for completing all five.
//
// Progress is COMPUTED from existing tables inside the week window, so no new
// progress table is needed. Claims are idempotent via PointTransaction
// idempotencyKey `mission:<weekKey>:<missionKey>`, which doubles as the
// claimed-state read model.
// ---------------------------------------------------------------------------

export const MISSION_REWARD = 20;
export const ALL_MISSIONS_BONUS = 50;

export const MISSION_KEYS = [
  "connect_business_owners",
  "attend_event",
  "share_card",
  "reply_message",
  "post_hub",
] as const;

export type MissionKey = (typeof MISSION_KEYS)[number];

export interface MissionDef {
  key: MissionKey;
  target: number;
  reward: number;
}

export const MISSIONS: Record<MissionKey, MissionDef> = {
  connect_business_owners: { key: "connect_business_owners", target: 3, reward: MISSION_REWARD },
  attend_event: { key: "attend_event", target: 1, reward: MISSION_REWARD },
  share_card: { key: "share_card", target: 10, reward: MISSION_REWARD },
  reply_message: { key: "reply_message", target: 1, reward: MISSION_REWARD },
  post_hub: { key: "post_hub", target: 1, reward: MISSION_REWARD },
};

/**
 * Monday's local date key (YYYY-MM-DD) for the week containing `date`.
 * Pure: works on date keys, so the server timezone can never skew the week.
 */
export function weekKeyFor(date: Date = new Date()): string {
  const key = localDateKey(date);
  const dow = new Date(Date.parse(`${key}T00:00:00Z`)).getUTCDay(); // 0=Sun
  const back = (dow + 6) % 7; // days since Monday
  return addDaysToLocalDate(key, -back);
}

/** UTC window [Mon 00:00 local, next Mon 00:00 local) for a week key. */
export function weekWindow(weekKey: string): { start: Date; end: Date } {
  return {
    start: startOfLocalDay(weekKey),
    end: startOfLocalDay(addDaysToLocalDate(weekKey, 7)),
  };
}

export function missionClaimIdempotencyKey(weekKey: string, missionKey: MissionKey): string {
  return `mission:${weekKey}:${missionKey}`;
}

export const ALL_MISSIONS_BONUS_KEY = "mission:all";

function bonusClaimIdempotencyKey(weekKey: string): string {
  return `mission:${weekKey}:${ALL_MISSIONS_BONUS_KEY}`;
}

export interface MissionView {
  key: MissionKey;
  target: number;
  progress: number;
  reward: number;
  completed: boolean;
  claimed: boolean;
}

export interface MissionBoard {
  weekKey: string;
  missions: MissionView[];
  completedCount: number;
  claimedCount: number;
  bonusReward: number;
  bonusClaimed: boolean;
  allCompleted: boolean;
}

/** Progress counters for each mission inside the given week window. */
async function missionProgress(
  userId: string,
  window: { start: Date; end: Date },
): Promise<Record<MissionKey, number>> {
  const inWindow = { gte: window.start, lt: window.end };
  const [
    businessOwnerContacts,
    eventAttendances,
    cardShares,
    messageReplies,
    hubPosts,
  ] = await Promise.all([
    // "Connect 3 business owners" — contacts saved whose account is a
    // BUSINESS account (business profile owners).
    prisma.contact.count({
      where: {
        ownerUserId: userId,
        createdAt: inWindow,
        contact: { role: "BUSINESS", status: "ACTIVE" },
      },
    }),
    // "Attend one event" — RSVP or QR attendance this week.
    prisma.eventAttendee.count({
      where: { userId, createdAt: inWindow },
    }),
    // "Share your card 10 times" — share actions on the member's own card.
    prisma.analyticsEvent.count({
      where: {
        userId,
        type: "PROFILE_SHARE",
        targetId: userId,
        createdAt: inWindow,
      },
    }),
    // "Reply to a message" — any message sent this week.
    prisma.message.count({
      where: { senderId: userId, createdAt: inWindow },
    }),
    // "Post in the hub" — a published (non-deleted) post this week.
    prisma.post.count({
      where: { authorId: userId, status: { not: "DELETED" }, createdAt: inWindow },
    }),
  ]);

  return {
    connect_business_owners: businessOwnerContacts,
    attend_event: eventAttendances,
    share_card: cardShares,
    reply_message: messageReplies,
    post_hub: hubPosts,
  };
}

/** Read model for the dashboard missions card. Never mutates anything. */
export async function getMissionBoard(userId: string): Promise<MissionBoard> {
  const weekKey = weekKeyFor();
  const window = weekWindow(weekKey);

  const [progress, claims] = await Promise.all([
    missionProgress(userId, window),
    prisma.pointTransaction.findMany({
      where: {
        userId,
        idempotencyKey: {
          in: [
            ...MISSION_KEYS.map((k) => missionClaimIdempotencyKey(weekKey, k)),
            bonusClaimIdempotencyKey(weekKey),
          ],
        },
      },
      select: { idempotencyKey: true },
    }),
  ]);

  const claimedKeys = new Set(claims.map((c) => c.idempotencyKey));

  const missions: MissionView[] = MISSION_KEYS.map((key) => {
    const def = MISSIONS[key];
    const progressN = progress[key] ?? 0;
    return {
      key,
      target: def.target,
      progress: Math.min(progressN, def.target),
      reward: def.reward,
      completed: progressN >= def.target,
      claimed: claimedKeys.has(missionClaimIdempotencyKey(weekKey, key)),
    };
  });

  const bonusClaimed = claimedKeys.has(bonusClaimIdempotencyKey(weekKey));
  const completedCount = missions.filter((m) => m.completed).length;

  return {
    weekKey,
    missions,
    completedCount,
    claimedCount: missions.filter((m) => m.claimed).length,
    bonusReward: ALL_MISSIONS_BONUS,
    bonusClaimed,
    allCompleted: completedCount === MISSION_KEYS.length,
  };
}

export class MissionError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Claims one mission's reward (or the all-five bonus). Idempotent: claiming
 * again — even from a concurrent request — never double-pays.
 */
export async function claimMissionReward(
  userId: string,
  missionKey: MissionKey | typeof ALL_MISSIONS_BONUS_KEY,
): Promise<{ awarded: number; balance: number }> {
  const weekKey = weekKeyFor();
  const window = weekWindow(weekKey);

  if (missionKey === ALL_MISSIONS_BONUS_KEY) {
    const board = await getMissionBoard(userId);
    if (board.bonusClaimed) {
      throw new MissionError(409, "Bonus already claimed this week.", "already_claimed");
    }
    if (!board.allCompleted) {
      throw new MissionError(400, "Complete all five missions first.", "not_completed");
    }
    const balance = await adjustPoints({
      userId,
      amount: ALL_MISSIONS_BONUS,
      type: "EARN",
      eventKey: "weekly_missions_all",
      idempotencyKey: bonusClaimIdempotencyKey(weekKey),
      description: `Weekly missions bonus (all 5 complete, week of ${weekKey})`,
      referenceType: "weekly_missions",
      referenceId: weekKey,
    });
    return { awarded: ALL_MISSIONS_BONUS, balance };
  }

  const def = MISSIONS[missionKey];
  const progress = await missionProgress(userId, window);
  if ((progress[missionKey] ?? 0) < def.target) {
    throw new MissionError(400, "Mission is not complete yet.", "not_completed");
  }
  const key = missionClaimIdempotencyKey(weekKey, missionKey);
  const existing = await prisma.pointTransaction.findUnique({
    where: { idempotencyKey: key },
    select: { id: true },
  });
  if (existing) {
    throw new MissionError(409, "Reward already claimed this week.", "already_claimed");
  }
  const balance = await adjustPoints({
    userId,
    amount: def.reward,
    type: "EARN",
    eventKey: `weekly_mission_${missionKey}`,
    idempotencyKey: key,
    description: `Weekly mission complete: ${missionKey} (week of ${weekKey})`,
    referenceType: "weekly_missions",
    referenceId: weekKey,
  });
  return { awarded: def.reward, balance };
}

