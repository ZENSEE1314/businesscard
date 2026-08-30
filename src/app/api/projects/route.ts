import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { handle, ok, Errors } from "@/lib/api";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  imageUrl: z.string().trim().max(500).optional().or(z.literal("")),
  link: z.string().trim().max(500).optional().or(z.literal("")),
});

/** GET /api/projects — the caller's own projects (for the profile editor). */
export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, title: true, description: true, imageUrl: true, link: true },
    });
    return ok({ projects });
  });
}

/** POST /api/projects — add a project to the caller's portfolio. */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();

    const count = await prisma.project.count({ where: { userId: user.id } });
    if (count >= 30) throw Errors.badRequest("You can add up to 30 projects.");

    const input = createSchema.parse(await req.json());
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        title: input.title,
        description: input.description?.trim() || null,
        imageUrl: input.imageUrl?.trim() || null,
        link: input.link?.trim() || null,
        sortOrder: count,
      },
      select: { id: true, title: true, description: true, imageUrl: true, link: true },
    });
    return ok({ project });
  });
}
