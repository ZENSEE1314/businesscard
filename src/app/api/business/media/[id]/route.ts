import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireBusiness } from "@/lib/permissions/guards";
import { handle, ok, Errors } from "@/lib/api";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const user = await requireBusiness();
    const { id } = await params;

    const media = await prisma.businessMedia.findUnique({
      where: { id },
      select: { id: true, businessProfile: { select: { userId: true } } },
    });
    if (!media || media.businessProfile.userId !== user.id) {
      throw Errors.notFound("Media not found.");
    }

    await prisma.businessMedia.delete({ where: { id } });
    return ok({ deleted: true });
  });
}
