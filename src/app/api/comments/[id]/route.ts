import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/permissions/guards";
import { adjustPoints } from "@/lib/points/engine";
import { handle, ok, Errors } from "@/lib/api";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;

    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { id: true, authorId: true, postId: true, deletedAt: true },
    });
    if (!comment || comment.deletedAt) throw Errors.notFound("Comment not found.");
    if (comment.authorId !== user.id && user.role !== "ADMIN") {
      throw Errors.forbidden();
    }

    await prisma.$transaction(async (tx) => {
      await tx.comment.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await tx.post.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 } },
      });
    });

    // Invalidate any points earned for this comment (once).
    const earned = await prisma.pointTransaction.findUnique({
      where: { idempotencyKey: `valid_comment:${id}` },
    });
    if (earned && earned.type === "EARN" && earned.amount > 0) {
      const alreadyReversed = await prisma.pointTransaction.findFirst({
        where: {
          referenceType: "comment",
          referenceId: id,
          type: "ADMIN_ADJUST",
          amount: { lt: 0 },
        },
      });
      if (!alreadyReversed) {
        await adjustPoints({
          userId: comment.authorId,
          amount: -earned.amount,
          description: "Points reversed — comment removed",
          referenceType: "comment",
          referenceId: id,
        }).catch(() => undefined);
      }
    }

    return ok({ deleted: true });
  });
}
