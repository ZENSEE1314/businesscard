import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Errors, handle, ok } from "@/lib/api";

/**
 * POST /api/events/[id]/rsvp  { going: boolean }
 * Join or leave an event. MEMBERS_ONLY events require a signed-in user and
 * PUBLIC events require one too (RSVPs are tied to accounts). Capacity is
 * enforced when set.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { going?: boolean };

    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        visibility: true,
        capacity: true,
        startsAt: true,
        _count: { select: { attendees: true } },
      },
    });
    if (!event || event.status !== "PUBLISHED") throw Errors.notFound("Event not found.");
    if (event.startsAt.getTime() < Date.now()) {
      throw Errors.badRequest("This event has already started.");
    }

    const existing = await prisma.eventAttendee.findUnique({
      where: { eventId_userId: { eventId: id, userId: user.id } },
      select: { id: true },
    });

    // Leave
    if (body.going === false) {
      if (existing) await prisma.eventAttendee.delete({ where: { id: existing.id } });
      return ok({ going: false });
    }

    // Join
    if (!existing) {
      if (event.capacity !== null && event._count.attendees >= event.capacity) {
        throw Errors.conflict("This event is full.");
      }
      await prisma.eventAttendee.create({ data: { eventId: id, userId: user.id } });
    }
    return ok({ going: true });
  });
}
