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

    const existing = await prisma.postBookmark.findUnique({
      where: { postId_userId: { postId, userId: user.id } },
    });

    if (existing) {
      await prisma.postBookmark.delete({ where: { id: existing.id } });
      return ok({ bookmarked: false });
    }
    await prisma.postBookmark.create({ data: { postId, userId: user.id } });
    return ok({ bookmarked: true });
  });
}
