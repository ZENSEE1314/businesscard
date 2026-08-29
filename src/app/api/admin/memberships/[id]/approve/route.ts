import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/permissions/guards";
import { approveMembership } from "@/features/membership/service";
import { recordCommissionForMembership } from "@/lib/referral-money";
import { logAdminAction } from "@/lib/admin-log";
import { getClientIp, handle, ok } from "@/lib/api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await params;

    const result = await approveMembership(id, admin.id);

    // Referral money: the referrer of the joining member earns 20% of the
    // membership fee as a ledger entry (withdrawable after admin approval).
    const earning = await recordCommissionForMembership(id);

    await logAdminAction({
      adminId: admin.id,
      action: "membership.approve",
      targetType: "membership",
      targetId: id,
      newValue: { tier: result.tier, status: result.status },
      ip: getClientIp(req),
    });
    if (earning) {
      await logAdminAction({
        adminId: admin.id,
        action: "referral.commission",
        targetType: "referral_earning",
        targetId: earning.id,
        newValue: { membershipId: id, tier: result.tier },
        ip: getClientIp(req),
      });
    }

    return ok({ status: result.status, tier: result.tier });
  });
}
