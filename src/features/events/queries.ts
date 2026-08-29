import "server-only";
import { prisma } from "@/lib/db/prisma";

export interface EventListItem {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number | null;
  visibility: "PUBLIC" | "MEMBERS_ONLY";
  hostId: string;
  hostName: string;
  hostUsername: string | null;
  hostTier: string | null;
  attendeeCount: number;
  rsvpStatus: "GOING" | null;
}

function label(tier: string | null): string | null {
  if (tier === "BRIDGEMAKER") return "BridgeMaker";
  if (tier === "BRIDGEMASTER") return "BridgeMaster";
  return null;
}

/**
 * Upcoming published events for the calendar/list. `viewerId` (optional) is
 * used to attach the viewer's RSVP status. MEMBERS_ONLY events are hidden
 * from signed-out visitors.
 */
export async function listUpcomingEvents(viewerId: string | null): Promise<EventListItem[]> {
  const rows = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      startsAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
      ...(viewerId ? {} : { visibility: "PUBLIC" as const }),
    },
    orderBy: { startsAt: "asc" },
    take: 60,
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      startsAt: true,
      endsAt: true,
      capacity: true,
      visibility: true,
      hostId: true,
      host: {
        select: {
          membershipTier: true,
          profile: { select: { fullName: true, displayName: true, username: true } },
        },
      },
      attendees: { select: { userId: true } },
    },
  });

  return rows.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    location: e.location,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt?.toISOString() ?? null,
    capacity: e.capacity,
    visibility: e.visibility,
    hostId: e.hostId,
    hostName: e.host.profile?.displayName || e.host.profile?.fullName || "Host",
    hostUsername: e.host.profile?.username ?? null,
    hostTier: label(e.host.membershipTier),
    attendeeCount: e.attendees.length,
    rsvpStatus: viewerId && e.attendees.some((a) => a.userId === viewerId) ? "GOING" : null,
  }));
}

export async function isPaidMember(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { membershipStatus: true, membershipTier: true, role: true },
  });
  if (!u) return false;
  return (
    u.role === "ADMIN" ||
    (u.membershipStatus === "ACTIVE" &&
      (u.membershipTier === "BRIDGEMAKER" || u.membershipTier === "BRIDGEMASTER"))
  );
}
