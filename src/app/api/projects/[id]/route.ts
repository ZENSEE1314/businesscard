import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { handle, ok, Errors } from "@/lib/api";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  imageUrl: z.string().trim().max(500).nullable().optional(),
  link: z.string().trim().max(500).nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

async function ownProject(id: string, userId: string) {
  const p = await prisma.project.findUnique({ where: { id }, select: { userId: true } });
  if (!p || p.userId !== userId) throw Errors.notFound("Project not found.");
}

/** PATCH /api/projects/:id — update the caller's own project. */
export async function PATCH(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();
    const { id } = await params;
    await ownProject(id, user.id);

    const input = patchSchema.parse(await req.json());
    const data: Record<string, string | null> = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description?.trim() || null;
    if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl?.trim() || null;
    if (input.link !== undefined) data.link = input.link?.trim() || null;

    const project = await prisma.project.update({
      where: { id },
      data,
      select: { id: true, title: true, description: true, imageUrl: true, link: true },
    });
    return ok({ project });
  });
}

/** DELETE /api/projects/:id — remove the caller's own project. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();
    const { id } = await params;
    await ownProject(id, user.id);
    await prisma.project.delete({ where: { id } });
    return ok({ deleted: true });
  });
}
