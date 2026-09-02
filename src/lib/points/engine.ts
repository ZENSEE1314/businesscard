import "server-only";
import { Prisma, type PointTxType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// Point event keys — kept in one place so rules, awards and abuse checks agree.
export const PointEvents = {
  REGISTER: "register",
  COMPLETE_PROFILE: "complete_profile",
  COMPLETE_BUSINESS_PROFILE: "complete_business_profile",
  DAILY_LOGIN: "daily_login",
  VALID_COMMENT: "valid_comment",
  CREATE_POST: "create_post",
  REFERRAL: "referral",
  VERIFIED_BUSINESS: "verified_business",
} as const;

export type PointEventKey = (typeof PointEvents)[keyof typeof PointEvents];

interface AwardResult {
  awarded: boolean;
  amount: number;
  reason?: string;
  balance: number;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

interface AwardOptions {
  userId: string;
  eventKey: PointEventKey;
  referenceType?: string;
  referenceId?: string;
  // Stable key to make the award idempotent (e.g. `valid_comment:<commentId>`).
  idempotencyKey?: string;
  description?: string;
}

// Awards points for an event, enforcing the rule's enabled flag, daily limit,
// cooldown and idempotency — all inside a single serializable transaction so
// concurrent requests cannot double-credit.
export async function awardPoints(opts: AwardOptions): Promise<AwardResult> {
  const rule = await prisma.pointRule.findUnique({
    where: { eventKey: opts.eventKey },
  });

  if (!rule || !rule.enabled || rule.points <= 0) {
    const user = await prisma.user.findUnique({
      where: { id: opts.userId },
      select: { points: true },
    });
    return {
      awarded: false,
      amount: 0,
      reason: "disabled",
      balance: user?.points ?? 0,
    };
  }

  try {
    return await prisma.$transaction(
      async (tx) => {
        // Idempotency: if this exact key already granted points, no-op.
        if (opts.idempotencyKey) {
          const existing = await tx.pointTransaction.findUnique({
            where: { idempotencyKey: opts.idempotencyKey },
          });
          if (existing) {
            const u = await tx.user.findUnique({
              where: { id: opts.userId },
              select: { points: true },
            });
            return {
              awarded: false,
              amount: 0,
              reason: "duplicate",
              balance: u?.points ?? 0,
            };
          }
        }

        // Daily limit: cap the number of awards for this event key per day.
        if (rule.dailyLimit && rule.dailyLimit > 0) {
          const countToday = await tx.pointTransaction.count({
            where: {
              userId: opts.userId,
              eventKey: opts.eventKey,
              type: "EARN",
              createdAt: { gte: startOfToday() },
            },
          });
          if (countToday >= rule.dailyLimit) {
            const u = await tx.user.findUnique({
              where: { id: opts.userId },
              select: { points: true },
            });
            return {
              awarded: false,
              amount: 0,
              reason: "daily_limit",
              balance: u?.points ?? 0,
            };
          }
        }

        // Cooldown: minimum seconds between awards of the same event.
        if (rule.cooldownSec && rule.cooldownSec > 0) {
          const last = await tx.pointTransaction.findFirst({
            where: {
              userId: opts.userId,
              eventKey: opts.eventKey,
              type: "EARN",
            },
            orderBy: { createdAt: "desc" },
          });
          if (
            last &&
            Date.now() - last.createdAt.getTime() < rule.cooldownSec * 1000
          ) {
            const u = await tx.user.findUnique({
              where: { id: opts.userId },
              select: { points: true },
            });
            return {
              awarded: false,
              amount: 0,
              reason: "cooldown",
              balance: u?.points ?? 0,
            };
          }
        }

        const updated = await tx.user.update({
          where: { id: opts.userId },
          data: {
            points: { increment: rule.points },
            lifetimeEarned: { increment: rule.points },
          },
          select: { points: true },
        });

        await tx.pointTransaction.create({
          data: {
            userId: opts.userId,
            type: "EARN",
            eventKey: opts.eventKey,
            amount: rule.points,
            balanceAfter: updated.points,
            referenceType: opts.referenceType,
            referenceId: opts.referenceId,
            description: opts.description ?? rule.description,
            idempotencyKey: opts.idempotencyKey,
          },
        });

        return {
          awarded: true,
          amount: rule.points,
          balance: updated.points,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (err) {
    // Unique-constraint race on idempotencyKey => treat as duplicate.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const u = await prisma.user.findUnique({
        where: { id: opts.userId },
        select: { points: true },
      });
      return {
        awarded: false,
        amount: 0,
        reason: "duplicate",
        balance: u?.points ?? 0,
      };
    }
    throw err;
  }
}

interface AdjustOptions {
  userId: string;
  amount: number; // positive or negative
  type?: PointTxType;
  description: string;
  adminId?: string;
  referenceType?: string;
  referenceId?: string;
  // Optional event key (groups the award for rule/limit queries) and stable
  // idempotency key — when set, a repeated award with the same key is a no-op,
  // so callers can safely retry or race (e.g. mission/milestone claims).
  eventKey?: string;
  idempotencyKey?: string;
}

// Manual/admin adjustment or reversal. Always records a transaction row and
// never lets a balance go negative.
export async function adjustPoints(opts: AdjustOptions): Promise<number> {
  return prisma.$transaction(
    async (tx) => {
      // Idempotency: if this exact key already granted points, no-op.
      if (opts.idempotencyKey) {
        const existing = await tx.pointTransaction.findUnique({
          where: { idempotencyKey: opts.idempotencyKey },
          select: { id: true },
        });
        if (existing) {
          const u = await tx.user.findUnique({
            where: { id: opts.userId },
            select: { points: true },
          });
          return u?.points ?? 0;
        }
      }

      const user = await tx.user.findUnique({
        where: { id: opts.userId },
        select: { points: true },
      });
      if (!user) throw new Error("User not found");

      const delta = opts.amount;
      const newBalance = Math.max(0, user.points + delta);
      const applied = newBalance - user.points;

      const updated = await tx.user.update({
        where: { id: opts.userId },
        data: {
          points: newBalance,
          ...(applied > 0
            ? { lifetimeEarned: { increment: applied } }
            : { lifetimeSpent: { increment: Math.abs(applied) } }),
        },
        select: { points: true },
      });

      await tx.pointTransaction.create({
        data: {
          userId: opts.userId,
          type: opts.type ?? "ADMIN_ADJUST",
          amount: applied,
          balanceAfter: updated.points,
          description: opts.description,
          createdByAdmin: opts.adminId,
          referenceType: opts.referenceType,
          referenceId: opts.referenceId,
          eventKey: opts.eventKey,
          idempotencyKey: opts.idempotencyKey,
        },
      });

      return updated.points;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  ).catch((err: unknown) => {
    // Unique-constraint race on idempotencyKey => another concurrent claim
    // won; treat as a no-op and report the current balance.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      opts.idempotencyKey
    ) {
      return prisma.user
        .findUnique({ where: { id: opts.userId }, select: { points: true } })
        .then((u) => u?.points ?? 0);
    }
    throw err;
  });
}
