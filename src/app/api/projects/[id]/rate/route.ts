import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { handle, ok, Errors } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().or(z.literal("")),
});

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/projects/:id/rate — rate + comment on a member's project.
 * One rating per person per project (updates on repeat); can't rate your own.
 */
export async function POST(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!project) throw Errors.notFound("Project not found.");
    if (project.userId === user.id) {
      throw Errors.badRequest("You can’t rate your own project.");
    }

    enforceRateLimit(`project:rate:${user.id}`, 30, 10 * 60 * 1000);

    const input = schema.parse(await req.json());
    const comment = input.comment?.trim() ? input.comment.trim() : null;
    await prisma.projectRating.upsert({
      where: { projectId_authorId: { projectId: id, authorId: user.id } },
      create: { projectId: id, authorId: user.id, rating: input.rating, comment },
      update: { rating: input.rating, comment },
    });
    return ok({ saved: true });
  });
}
