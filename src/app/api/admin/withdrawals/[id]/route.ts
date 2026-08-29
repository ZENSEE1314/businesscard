import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/permissions/guards";
import {
  decideWithdrawal,
  markWithdrawalPaid,
  withdrawalDecisionSchema,
} from "@/lib/referral-money";
import { logAdminAction } from "@/lib/admin-log";
import { Errors, getClientIp, handle, ok } from "@/lib/api";

/**
 * Admin payout decisions for referral earnings.
 *
 *   { action: "approve" }  → APPROVED (admin intends to pay; transfer pending)
 *   { action: "reject" }   → REJECTED (returned to the member's balance)
 *   { action: "paid" }     → PAID    (bank transfer done — closes the request)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;

    const wd = await prisma.withdrawal.findUnique({
      where: { id },
      select: { id: true, userId: true, amountIdr: true, status: true },
    });
    if (!wd) throw Errors.notFound("Withdrawal not found.");

    // Mark paid (final step after the manual bank transfer).
    if (body.action === "paid") {
      await markWithdrawalPaid(id, admin.id);
      await logAdminAction({
        adminId: admin.id,
        action: "withdrawal.paid",
        targetType: "withdrawal",
        targetId: id,
        oldValue: { status: wd.status },
        newValue: { status: "PAID", amountIdr: wd.amountIdr },
        ip: getClientIp(req),
      });
      return ok({ status: "PAID" });
    }

    const input = withdrawalDecisionSchema.parse(body);
    const result = await decideWithdrawal(id, admin.id, input);
    await logAdminAction({
      adminId: admin.id,
      action: input.action === "approve" ? "withdrawal.approve" : "withdrawal.reject",
      targetType: "withdrawal",
      targetId: id,
      oldValue: { status: wd.status },
      newValue: { status: result.status, note: input.adminNote ?? null },
      ip: getClientIp(req),
    });
    return ok({ status: result.status });
  });
}
