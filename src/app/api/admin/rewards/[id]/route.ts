import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/permissions/guards";
import { rewardUpdateSchema } from "@/lib/validation/admin";
import { handle, ok, Errors, getClientIp } from "@/lib/api";

// Pause/edit a reward.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    const input = rewardUpdateSchema.parse(await req.json());

    const reward = await prisma.reward.findUnique({ where: { id } });
    if (!reward) throw Errors.notFound("Reward not found.");

    await prisma.reward.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.pointsCost !== undefined ? { pointsCost: input.pointsCost } : {}),
        ...(input.stock !== undefined ? { stock: input.stock ?? null } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    });
    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "reward.update",
        targetType: "reward",
        targetId: id,
        ip: getClientIp(req),
      },
    });
    return ok({ updated: true });
  });
}

// Delete a reward. If it has redemption history it is archived (deactivated)
// instead of hard-deleted so that history and refunds stay intact.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await params;

    const reward = await prisma.reward.findUnique({
      where: { id },
      select: { id: true, _count: { select: { redemptions: true } } },
    });
    if (!reward) throw Errors.notFound("Reward not found.");

    let archived = false;
    if (reward._count.redemptions > 0) {
      await prisma.reward.update({ where: { id }, data: { active: false } });
      archived = true;
    } else {
      await prisma.reward.delete({ where: { id } });
    }

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: archived ? "reward.archive" : "reward.delete",
        targetType: "reward",
        targetId: id,
        ip: getClientIp(req),
      },
    });

    return ok({ deleted: !archived, archived });
  });
}
