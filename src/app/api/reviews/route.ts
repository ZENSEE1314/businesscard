import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { handle, ok, Errors } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  subjectUserId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().or(z.literal("")),
});

/**
 * POST /api/reviews — leave (or update) a star rating + comment for another
 * member. One review per author per subject; you can't review yourself.
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();

    const input = schema.parse(await req.json());
    if (input.subjectUserId === user.id) {
      throw Errors.badRequest("You can’t review your own card.");
    }

    const subject = await prisma.user.findUnique({
      where: { id: input.subjectUserId },
      select: { id: true, status: true },
    });
    if (!subject || subject.status !== "ACTIVE") {
      throw Errors.notFound("Member not found.");
    }

    enforceRateLimit(`review:${user.id}`, 20, 10 * 60 * 1000);

    const comment = input.comment?.trim() ? input.comment.trim() : null;
    await prisma.review.upsert({
      where: { authorId_subjectId: { authorId: user.id, subjectId: subject.id } },
      create: { authorId: user.id, subjectId: subject.id, rating: input.rating, comment },
      update: { rating: input.rating, comment },
    });

    return ok({ saved: true });
  });
}
