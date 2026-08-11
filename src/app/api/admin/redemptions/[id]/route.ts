import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/permissions/guards";
import { setRedemptionStatus } from "@/features/rewards/redeem";
import { handle, ok, getClientIp } from "@/lib/api";

const schema = z.object({
  status: z.enum(["APPROVED", "FULFILLED", "REJECTED", "CANCELLED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    const { status } = schema.parse(await req.json());

    const result = await setRedemptionStatus(id, status, admin.id);

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "redemption.status",
        targetType: "redemption",
        targetId: id,
        newValue: { status },
        ip: getClientIp(req),
      },
    });

    return ok({ status: result.status });
  });
}
