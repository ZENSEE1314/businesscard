import { z } from "zod";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/permissions/guards";
import { logAdminAction } from "@/lib/admin-log";
import { Errors, getClientIp, handle, ok } from "@/lib/api";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  year: z.coerce.number().int().min(2000).max(2100).optional().nullable(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
});

async function loadAward(id: string) {
  const award = await prisma.award.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      year: true,
      featured: true,
      active: true,
    },
  });
  if (!award) throw Errors.notFound("Award not found.");
  return award;
}

// PATCH — edit an award's details (name, year, category, featured, active).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    const input = patchSchema.parse(await req.json());
    const before = await loadAward(id);

    const updated = await prisma.award.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        description: input.description ?? undefined,
        category: input.category ?? undefined,
        year: input.year === undefined ? undefined : input.year,
        featured: input.featured,
        active: input.active,
      },
      select: { id: true, name: true },
    });

    await logAdminAction({
      adminId: admin.id,
      action: "award.update",
      targetType: "award",
      targetId: id,
      targetUsername: updated.name,
      oldValue: before,
      newValue: input,
      ip: getClientIp(req),
    });

    return ok({ updated: true });
  });
}

// DELETE — remove the award and its winner records (cascade).
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    const before = await loadAward(id);

    await prisma.award.delete({ where: { id } });
    await logAdminAction({
      adminId: admin.id,
      action: "award.delete",
      targetType: "award",
      targetId: id,
      targetUsername: before.name,
      oldValue: before,
      ip: getClientIp(req),
    });

    return ok({ deleted: true });
  });
}
