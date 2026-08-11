import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/permissions/guards";
import { postModerateSchema } from "@/lib/validation/admin";
import { handle, ok, Errors, getClientIp } from "@/lib/api";

// Admin feed moderation: hide, restore (PUBLISHED) or delete any post.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    const { status } = postModerateSchema.parse(await req.json());

    const post = await prisma.post.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!post) throw Errors.notFound("Post not found.");

    await prisma.post.update({ where: { id }, data: { status } });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "post.moderate",
        targetType: "post",
        targetId: id,
        oldValue: { status: post.status },
        newValue: { status },
        ip: getClientIp(req),
      },
    });

    return ok({ status });
  });
}
