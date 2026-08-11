import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/permissions/guards";
import { handle, ok, Errors } from "@/lib/api";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const user = await requireUser();
    const { id: postId } = await params;

    const post = await prisma.post.findFirst({
      where: { id: postId, status: "PUBLISHED" },
      select: { id: true },
    });
    if (!post) throw Errors.notFound("Post not found.");

    const existing = await prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId: user.id } },
    });

    const liked = await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.postLike.delete({ where: { id: existing.id } });
        await tx.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        });
        return false;
      }
      await tx.postLike.create({ data: { postId, userId: user.id } });
      await tx.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      });
      return true;
    });

    const { likeCount } = await prisma.post.findUniqueOrThrow({
      where: { id: postId },
      select: { likeCount: true },
    });

    return ok({ liked, likeCount });
  });
}
