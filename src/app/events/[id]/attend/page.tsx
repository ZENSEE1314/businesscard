import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, XCircle, CalendarClock } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { verifyEventAttendanceToken } from "@/lib/events-qr";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Attendance confirmation target for the host's event QR:
//   /events/{id}/attend?t={hmac}
// Verifies the token, requires an existing RSVP, then stamps attendedAt.
// ---------------------------------------------------------------------------

export default async function EventAttendPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/events/${id}/attend?t=${t ?? ""}`)}`);

  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, title: true, startsAt: true },
  });

  let error: "invalid" | "not_registered" | null = null;

  if (!event || !verifyEventAttendanceToken(id, t ?? "")) {
    error = "invalid";
  } else {
    const attendee = await prisma.eventAttendee.findUnique({
      where: { eventId_userId: { eventId: id, userId: user.id } },
      select: { id: true, attendedAt: true },
    });
    if (!attendee) {
      error = "not_registered";
    } else if (!attendee.attendedAt) {
      await prisma.eventAttendee.update({
        where: { id: attendee.id },
        data: { attendedAt: new Date() },
      });
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-4 py-10 text-center">
      {error ? (
        <>
          <XCircle className="h-14 w-14 text-red-500" />
          <h1 className="mt-4 text-xl font-bold">
            {error === "invalid" ? "Invalid QR code" : "You are not registered"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {error === "invalid"
              ? "This attendance code doesn't match any event. Please ask the host for the current QR."
              : "RSVP to this event first, then scan the host's attendance QR again."}
          </p>
          <Link
            href="/events"
            className="mt-6 inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-fg"
          >
            Browse events
          </Link>
        </>
      ) : (
        <>
          <CheckCircle2 className="anim-pop h-14 w-14 text-green-500" />
          <h1 className="mt-4 text-xl font-bold">You&apos;re checked in!</h1>
          <p className="mt-2 flex items-center justify-center gap-2 text-sm text-muted">
            <CalendarClock className="h-4 w-4" />
            {event!.title}
          </p>
          <Link
            href={`/events/${id}`}
            className="mt-6 inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-fg"
          >
            Back to event
          </Link>
        </>
      )}
    </div>
  );
}