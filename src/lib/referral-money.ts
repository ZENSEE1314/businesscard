import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { TIER_ORDER, getTierConfig, type Tier } from "@/lib/membership";
import { isFastUpgrade } from "@/lib/referral-milestones";

/**
 * Referral money — "Refer & Earn" cash program.
 *
 * A referrer earns COMMISSION_BPS (20%) of every paid membership bought by a
 * member they referred. Earnings are recorded as ledger rows (ReferralEarning)
 * when an order is approved, and paid out manually: the member requests a
 * withdrawal in-app, an admin approves, marks it paid, and logs it.
 */
export const COMMISSION_BPS = 2000; // 20% — one source of truth for UI + service

export const minWithdrawalIdr = 50_000;

export const withdrawalRequestSchema = z.object({
  amountIdr: z.coerce.number().int().min(1),
  bankName: z.string().trim().min(2).max(80),
  accountNumber: z.string().trim().min(4).max(40),
  accountHolder: z.string().trim().min(2).max(80),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});

export const withdrawalDecisionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  adminNote: z.string().trim().max(300).optional().or(z.literal("")),
});

export function commissionFor(tier: Tier): number {
  return Math.floor((getTierConfig(tier).priceIdr * COMMISSION_BPS) / 10_000);
}

/** Ledger totals: lifetime earned, paid out, and pending (withdrawable). */
export async function earningTotals(userId: string) {
  const rows = await prisma.referralEarning.aggregate({
    where: { referrerId: userId },
    _sum: { amountIdr: true },
  });
  const wd = await prisma.withdrawal.groupBy({
    by: ["status"],
    where: { userId },
    _sum: { amountIdr: true },
  });
  const paid = wd.find((r) => r.status === "PAID")?._sum.amountIdr ?? 0;
  const pending =
    (wd.find((r) => r.status === "PENDING")?._sum.amountIdr ?? 0) +
    (wd.find((r) => r.status === "APPROVED")?._sum.amountIdr ?? 0);
  const total = rows._sum.amountIdr ?? 0;
  return { total, paid, pending, available: Math.max(total - paid - pending, 0) };
}

export interface EarningView {
  id: string;
  amountIdr: number;
  tierLabel: string;
  memberName: string | null;
  createdAt: string;
}

export interface WithdrawalView {
  id: string;
  amountIdr: number;
  status: "PENDING" | "APPROVED" | "PAID" | "REJECTED";
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  adminNote: string | null;
  createdAt: string;
  processedAt: string | null;
}

export async function listEarnings(userId: string, take = 25): Promise<EarningView[]> {
  const rows = await prisma.referralEarning.findMany({
    where: { referrerId: userId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      amountIdr: true,
      tier: true,
      createdAt: true,
      referredUser: { select: { profile: { select: { fullName: true } } } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    amountIdr: r.amountIdr,
    tierLabel: getTierConfig(r.tier as Tier).label,
    memberName: r.referredUser.profile?.fullName ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function listWithdrawals(userId: string, take = 15): Promise<WithdrawalView[]> {
  const rows = await prisma.withdrawal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map((r) => ({
    id: r.id,
    amountIdr: r.amountIdr,
    status: r.status,
    bankName: r.bankName,
    accountNumber: r.accountNumber,
    accountHolder: r.accountHolder,
    adminNote: r.adminNote,
    createdAt: r.createdAt.toISOString(),
    processedAt: r.processedAt?.toISOString() ?? null,
  }));
}

/** Creates a PENDING withdrawal after validating the available balance. */
export async function requestWithdrawal(
  userId: string,
  input: z.infer<typeof withdrawalRequestSchema>,
) {
  const { available } = await earningTotals(userId);
  if (input.amountIdr < minWithdrawalIdr) {
    throw new Error(`Minimum withdrawal is Rp ${minWithdrawalIdr.toLocaleString("id-ID")}.`);
  }
  if (input.amountIdr > available) {
    throw new Error("Amount exceeds your available balance.");
  }
  const open = await prisma.withdrawal.findFirst({
    where: { userId, status: { in: ["PENDING", "APPROVED"] } },
    select: { id: true },
  });
  if (open) throw new Error("You already have a withdrawal being processed.");
  return prisma.withdrawal.create({
    data: {
      userId,
      amountIdr: input.amountIdr,
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      accountHolder: input.accountHolder,
      note: input.note || null,
    },
    select: { id: true },
  });
}

/** Admin decision. Approve keeps it awaiting the manual bank transfer (PAID). */
export async function decideWithdrawal(
  withdrawalId: string,
  adminId: string,
  input: z.infer<typeof withdrawalDecisionSchema>,
) {
  const wd = await prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
  if (!wd) throw new Error("Withdrawal not found.");
  if (wd.status !== "PENDING") throw new Error("This withdrawal was already processed.");
  return prisma.withdrawal.update({
    where: { id: withdrawalId },
    data: {
      status: input.action === "approve" ? "APPROVED" : "REJECTED",
      adminNote: input.adminNote || null,
      processedById: adminId,
      processedAt: new Date(),
    },
    select: { id: true, status: true },
  });
}

export async function markWithdrawalPaid(withdrawalId: string, adminId: string) {
  const wd = await prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
  if (!wd) throw new Error("Withdrawal not found.");
  if (wd.status !== "APPROVED") throw new Error("Only approved withdrawals can be marked paid.");
  return prisma.withdrawal.update({
    where: { id: withdrawalId },
    data: { status: "PAID", processedById: adminId, processedAt: new Date() },
    select: { id: true, status: true },
  });
}

/** Records the 20% commission rows for an approved membership order.
 *
 * Fast-upgrade bonus: when the referred member buys a paid membership within
 * 7 DAYS of joining, the referrer earns DOUBLE the usual commission (rateBps
 * is doubled too so the ledger shows the boosted rate).
 */
export async function recordCommissionForMembership(membershipId: string) {
  const m = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: {
      id: true,
      tier: true,
      userId: true,
      user: { select: { referredById: true, createdAt: true } },
    },
  });
  const referrerId = m?.user.referredById;
  if (!m || !referrerId || !(TIER_ORDER as string[]).includes(m.tier)) return null;

  const fastUpgrade = isFastUpgrade(m.user.createdAt, new Date());
  const multiplier = fastUpgrade ? 2 : 1;

  return prisma.referralEarning.create({
    data: {
      referrerId,
      referredUserId: m.userId,
      membershipId: m.id,
      tier: m.tier,
      amountIdr: commissionFor(m.tier as Tier) * multiplier,
      rateBps: COMMISSION_BPS * multiplier,
    },
    select: { id: true },
  });
}

