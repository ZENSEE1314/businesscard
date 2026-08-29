import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getMinWithdrawalIdr } from "@/lib/settings";
import { Errors, handle, ok, created } from "@/lib/api";

/** GET — the signed-in user's withdrawal history. */
export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();
    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return ok({ withdrawals });
  });
}

/**
 * POST — request a withdrawal of the available referral balance.
 * Available = total earnings − (APPROVED + PAID + PENDING withdrawals).
 * Payout is performed manually by an admin after review.
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();
    const body = (await req.json().catch(() => ({}))) as {
      amountIdr?: number;
      bankName?: string;
      accountNumber?: string;
      accountHolder?: string;
      note?: string;
    };

    const amountIdr = Math.floor(Number(body.amountIdr));
    if (!Number.isFinite(amountIdr) || amountIdr <= 0) {
      throw Errors.badRequest("Enter a valid withdrawal amount.");
    }

    const minIdr = await getMinWithdrawalIdr();
    if (amountIdr < minIdr) {
      throw Errors.badRequest(
        `Minimum withdrawal is Rp ${minIdr.toLocaleString("id-ID")}.`,
      );
    }

    const [earned, paidOut, pendingOut] = await Promise.all([
      prisma.referralEarning.aggregate({
        where: { referrerId: user.id },
        _sum: { amountIdr: true },
      }),
      prisma.withdrawal.aggregate({
        where: { userId: user.id, status: { in: ["APPROVED", "PAID"] } },
        _sum: { amountIdr: true },
      }),
      prisma.withdrawal.aggregate({
        where: { userId: user.id, status: "PENDING" },
        _sum: { amountIdr: true },
      }),
    ]);

    const available =
      (earned._sum.amountIdr ?? 0) -
      (paidOut._sum.amountIdr ?? 0) -
      (pendingOut._sum.amountIdr ?? 0);

    if (amountIdr > available) {
      throw Errors.badRequest(
        `Amount exceeds your available balance (Rp ${Math.max(0, available).toLocaleString("id-ID")}).`,
      );
    }

    const pending = await prisma.withdrawal.findFirst({
      where: { userId: user.id, status: "PENDING" },
      select: { id: true },
    });
    if (pending) {
      throw Errors.conflict(
        "You already have a withdrawal awaiting review. Wait for it to be processed.",
      );
    }

    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId: user.id,
        amountIdr,
        bankName: body.bankName?.trim() || null,
        accountNumber: body.accountNumber?.trim() || null,
        accountHolder: body.accountHolder?.trim() || null,
        note: body.note?.trim() || null,
      },
      select: { id: true },
    });
    return created({ id: withdrawal.id });
  });
}
