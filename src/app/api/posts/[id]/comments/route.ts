import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/permissions/guards";
import {
  commentCreateSchema,
  MIN_REWARDABLE_COMMENT_LENGTH,
} from "@/lib/validation/post";
import { awardPoints, PointEvents } from "@/lib/points/engine";
import { handle, ok, created, Errors, getClientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const { id: postId } = await params;
    const comments = await prisma.comment.findMany({
      where: { postId, parentId: null, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: {
            id: true,
            profile: { select: { fullName: true, username: true, avatarUrl: true } },
          },
        },
        replies: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          include: {
            author: {
              select: {
                id: true,
                profile: {
                  select: { fullName: true, username: true, avatarUrl: true },
                },
              },
            },
          },
        },
      },
    });
    return ok({ comments });
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const user = await requireUser();
    enforceRateLimit(`comment:${user.id}:${getClientIp(req)}`, 30, 5 * 60 * 1000);

    const { id: postId } = await params;
    const input = commentCreateSchema.parse(await req.json());

    const post = await prisma.post.findFirst({
      where: { id: postId, status: "PUBLISHED" },
      select: { id: true },
    });
    if (!post) throw Errors.notFound("Post not found.");

    // Enforce a single level of replies.
    if (input.parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: input.parentId },
        select: { postId: true, parentId: true },
      });
      if (!parent || parent.postId !== postId || parent.parentId) {
        throw Errors.badRequest("Invalid parent comment.");
      }
    }

    const comment = await prisma.$transaction(async (tx) => {
      const c = await tx.comment.create({
        data: {
          postId,
          authorId: user.id,
          parentId: input.parentId ?? null,
          body: input.body,
        },
        include: {
          author: {
            select: {
              id: true,
              profile: {
                select: { fullName: true, username: true, avatarUrl: true },
              },
            },
          },
        },
      });
      await tx.post.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      });
      return c;
    });

    // Anti-abuse point award: minimum length + no duplicate of a recent comment.
    // Daily limit and cooldown are enforced inside the points engine.
    const trimmed = input.body.trim();
    let pointsAwarded = false;
    if (trimmed.length >= MIN_REWARDABLE_COMMENT_LENGTH) {
      const dup = await prisma.comment.findFirst({
        where: {
          authorId: user.id,
          body: trimmed,
          id: { not: comment.id },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
      });
      if (!dup) {
        const result = await awardPoints({
          userId: user.id,
          eventKey: PointEvents.VALID_COMMENT,
          referenceType: "comment",
          referenceId: comment.id,
          idempotencyKey: `valid_comment:${comment.id}`,
        });
        pointsAwarded = result.awarded;
      }
    }

    return created({ comment, pointsAwarded });
  });
}
