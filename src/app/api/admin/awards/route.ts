import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/permissions/guards";
import { awardCreateSchema } from "@/lib/validation/admin";
import { slugify } from "@/lib/utils";
import { handle, created, getClientIp } from "@/lib/api";

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base) || "award";
  let n = 0;
  while (await prisma.award.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
  return slug;
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const admin = await requireAdmin();
    const input = awardCreateSchema.parse(await req.json());

    const award = await prisma.award.create({
      data: {
        name: input.name,
        slug: await uniqueSlug(`${input.name}-${input.year ?? ""}`),
        description: input.description || null,
        badgeUrl: input.badgeUrl || null,
        category: input.category || null,
        year: input.year ?? null,
        featured: input.featured ?? false,
        active: input.active ?? true,
      },
      select: { id: true },
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "award.create",
        targetType: "award",
        targetId: award.id,
        ip: getClientIp(req),
      },
    });

    return created({ id: award.id });
  });
}
