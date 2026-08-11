import "server-only";
import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { Errors } from "@/lib/api";

function redemptionCode(): string {
  return `RDM-${randomBytes(4).toString("hex").toUpperCase()}`;
}

// Atomically redeems a reward: validates availability, stock, per-user limit and
// balance, deducts points, records the transaction, decrements stock and creates
// a PENDING redemption — all serializable so points can't be double-spent.
export async function redeemReward(userId: string, rewardId: string) {
  return prisma.$transaction(
    async (tx) => {
      const reward = await tx.reward.findUnique({ where: { id: rewardId } });
      if (!reward || !reward.active) {
        throw Errors.badRequest("This reward is not available.");
      }
      const now = new Date();
      if (reward.startDate && reward.startDate > now) {
        throw Errors.badRequest("This reward is not available yet.");
      }
      if (reward.endDate && reward.endDate < now) {
        throw Errors.badRequest("This reward has ended.");
      }
      if (reward.stock !== null && reward.stock <= 0) {
        throw Errors.badRequest("This reward is out of stock.");
      }
      if (reward.maxPerUser) {
        const count = await tx.rewardRedemption.count({
          where: {
            rewardId,
            userId,
            status: { notIn: ["REJECTED", "CANCELLED"] },
          },
        });
        if (count >= reward.maxPerUser) {
          throw Errors.badRequest("You've reached the limit for this reward.");
        }
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { points: true },
      });
      if (!user || user.points < reward.pointsCost) {
        throw Errors.badRequest("You don't have enough points.");
      }

      const newBalance = user.points - reward.pointsCost;
      await tx.user.update({
        where: { id: userId },
        data: {
          points: newBalance,
          lifetimeSpent: { increment: reward.pointsCost },
        },
      });
      await tx.pointTransaction.create({
        data: {
          userId,
          type: "REDEEM",
          amount: -reward.pointsCost,
          balanceAfter: newBalance,
          referenceType: "reward",
          referenceId: rewardId,
          description: `Redeemed: ${reward.title}`,
        },
      });
      if (reward.stock !== null) {
        await tx.reward.update({
          where: { id: rewardId },
          data: { stock: { decrement: 1 } },
        });
      }

      const redemption = await tx.rewardRedemption.create({
        data: {
          rewardId,
          userId,
          status: "PENDING",
          pointsSpent: reward.pointsCost,
          code: redemptionCode(),
        },
      });

      return { code: redemption.code, id: redemption.id, balance: newBalance };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

// Admin sets a redemption's status. Rejecting/cancelling refunds points once and
// returns stock. Uses `refunded` flag to guarantee no double refund.
export async function setRedemptionStatus(
  redemptionId: string,
  status: "APPROVED" | "FULFILLED" | "REJECTED" | "CANCELLED",
  adminId: string,
) {
  return prisma.$transaction(
    async (tx) => {
      const redemption = await tx.rewardRedemption.findUnique({
        where: { id: redemptionId },
        include: { reward: { select: { title: true, stock: true } } },
      });
      if (!redemption) throw Errors.notFound("Redemption not found.");

      const isRefund = status === "REJECTED" || status === "CANCELLED";

      if (isRefund && !redemption.refunded) {
        const user = await tx.user.findUnique({
          where: { id: redemption.userId },
          select: { points: true },
        });
        if (user) {
          const newBalance = user.points + redemption.pointsSpent;
          await tx.user.update({
            where: { id: redemption.userId },
            data: {
              points: newBalance,
              lifetimeSpent: { decrement: redemption.pointsSpent },
            },
          });
          await tx.pointTransaction.create({
            data: {
              userId: redemption.userId,
              type: "REFUND",
              amount: redemption.pointsSpent,
              balanceAfter: newBalance,
              referenceType: "reward",
              referenceId: redemption.rewardId,
              description: `Refund: ${redemption.reward.title}`,
              createdByAdmin: adminId,
            },
          });
          if (redemption.reward.stock !== null) {
            await tx.reward.update({
              where: { id: redemption.rewardId },
              data: { stock: { increment: 1 } },
            });
          }
        }
      }

      return tx.rewardRedemption.update({
        where: { id: redemptionId },
        data: {
          status,
          refunded: isRefund ? true : redemption.refunded,
          fulfilledAt: status === "FULFILLED" ? new Date() : redemption.fulfilledAt,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
