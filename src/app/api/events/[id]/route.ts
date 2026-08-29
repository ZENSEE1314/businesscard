import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Errors, handle, ok } from "@/lib/api";

/** DELETE — host cancels their own event; admin can remove any. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();
    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true, hostId: true },
    });
    if (!event) throw Errors.notFound("Event not found.");
    if (event.hostId !== user.id && user.role !== "ADMIN") {
      throw Errors.forbidden("Only the host or an admin can cancel this event.");
    }

    await prisma.event.update({ where: { id }, data: { status: "CANCELLED" } });
    return ok({ cancelled: true });
  });
}
