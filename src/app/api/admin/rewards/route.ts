import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/permissions/guards";
import { rewardCreateSchema } from "@/lib/validation/admin";
import { handle, created, getClientIp } from "@/lib/api";

const emptyNull = (v: string | undefined) => (v ? v : null);

export async function POST(req: NextRequest) {
  return handle(async () => {
    const admin = await requireAdmin();
    const input = rewardCreateSchema.parse(await req.json());

    const reward = await prisma.reward.create({
      data: {
        title: input.title,
        description: emptyNull(input.description),
        imageUrl: emptyNull(input.imageUrl),
        category: emptyNull(input.category),
        pointsCost: input.pointsCost,
        stock: input.stock ?? null,
        maxPerUser: input.maxPerUser ?? null,
        instructions: emptyNull(input.instructions),
        terms: emptyNull(input.terms),
        active: input.active ?? true,
      },
      select: { id: true },
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "reward.create",
        targetType: "reward",
        targetId: reward.id,
        ip: getClientIp(req),
      },
    });

    return created({ id: reward.id });
  });
}
