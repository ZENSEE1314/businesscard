import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/permissions/guards";
import { postUpdateSchema } from "@/lib/validation/post";
import { handle, ok, Errors } from "@/lib/api";

async function loadOwnedPost(postId: string, userId: string, isAdmin: boolean) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, status: true },
  });
  if (!post || post.status === "DELETED") throw Errors.notFound("Post not found.");
  if (post.authorId !== userId && !isAdmin) throw Errors.forbidden();
  return post;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    await loadOwnedPost(id, user.id, user.role === "ADMIN");

    const input = postUpdateSchema.parse(await req.json());
    const noneCta = input.ctaType === "NONE";

    // Replace images only when a new set is explicitly provided.
    if (input.images) {
      await prisma.postImage.deleteMany({ where: { postId: id } });
    }

    const updated = await prisma.post.update({
      where: { id },
      data: {
        ...(input.body !== undefined ? { body: input.body } : {}),
        ...(input.location !== undefined ? { location: input.location || null } : {}),
        ...(input.websiteUrl !== undefined
          ? { websiteUrl: input.websiteUrl || null }
          : {}),
        ...(input.ctaType !== undefined
          ? {
              ctaType: input.ctaType,
              ctaLabel: noneCta ? null : input.ctaLabel || null,
              ctaValue: noneCta ? null : input.ctaValue || null,
            }
          : {}),
        ...(input.images?.length
          ? {
              images: {
                create: input.images.map((img, i) => ({
                  url: img.url,
                  thumbUrl: img.thumbUrl ?? null,
                  width: img.width ?? null,
                  height: img.height ?? null,
                  sortOrder: i,
                })),
              },
            }
          : {}),
      },
      select: { id: true },
    });

    return ok({ id: updated.id });
  });
}

// Soft delete so points/analytics references remain intact.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    await loadOwnedPost(id, user.id, user.role === "ADMIN");

    await prisma.post.update({
      where: { id },
      data: { status: "DELETED" },
    });

    return ok({ deleted: true });
  });
}
