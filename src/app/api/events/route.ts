import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isPaidMember, listUpcomingEvents } from "@/features/events/queries";
import { eventCreateSchema } from "@/lib/validation/events";
import { Errors, handle, ok, created } from "@/lib/api";

export async function GET() {
  return handle(async () => {
    const viewer = await getCurrentUser();
    const events = await listUpcomingEvents(viewer?.id ?? null);
    return ok({ events });
  });
}

// POST — host an event. Paid members only (BridgeMaker / BridgeMaster).
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();
    if (!(await isPaidMember(user.id))) {
      throw Errors.forbidden(
        "Only paid members (BridgeMaker / BridgeMaster) can post events.",
      );
    }

    const input = eventCreateSchema.parse(await req.json());

    // Light anti-spam: max 3 upcoming events per host.
    const upcoming = await prisma.event.count({
      where: {
        hostId: user.id,
        status: "PUBLISHED",
        startsAt: { gte: new Date() },
      },
    });
    if (upcoming >= 3) {
      throw Errors.conflict("You already have 3 upcoming events. Cancel one first.");
    }

    const event = await prisma.event.create({
      data: {
        hostId: user.id,
        title: input.title,
        description: input.description || null,
        location: input.location || null,
        startsAt: input.startsAt,
        endsAt: input.endsAt ?? null,
        capacity: input.capacity ?? null,
        visibility: input.visibility,
      },
      select: { id: true },
    });
    return created({ id: event.id });
  });
}
