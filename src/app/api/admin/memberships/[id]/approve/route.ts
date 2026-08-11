import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/permissions/guards";
import { approveMembership } from "@/features/membership/service";
import { getClientIp, handle, ok } from "@/lib/api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await params;

    const result = await approveMembership(id, admin.id);

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "membership.approve",
        targetType: "membership",
        targetId: id,
        newValue: { tier: result.tier, status: result.status },
        ip: getClientIp(req),
      },
    });

    return ok({ status: result.status, tier: result.tier });
  });
}
