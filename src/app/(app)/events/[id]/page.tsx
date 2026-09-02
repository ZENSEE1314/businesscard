import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, MapPin, Users, QrCode, UserCheck } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { RsvpButton } from "@/features/events/rsvp-button";
import { qrSvg } from "@/lib/qr";
import { eventAttendanceUrl, eventInviteUrl } from "@/lib/events-qr";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Event detail page. Regular attendees see the event info + RSVP controls.
// The HOST additionally gets two QR codes:
//   1. Attendance QR — attendees scan it at the venue to stamp attendance.
//   2. Invite QR — signs new users up under the host's referral code and
//      registers them as attendees of this event.
// ---------------------------------------------------------------------------

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      startsAt: true,
      endsAt: true,
      capacity: true,
      status: true,
      hostId: true,
      host: {
        select: {
          referralCode: true,
          profile: { select: { fullName: true, displayName: true, username: true } },
        },
      },
      attendees: {
        select: {
          userId: true,
          attendedAt: true,
          user: {
            select: {
              profile: {
                select: { username: true, fullName: true, displayName: true, avatarUrl: true },
              },
            },
          },
        },
      },
    },
  });
  if (!event || event.status !== "PUBLISHED") notFound();

  const isHost = event.hostId === user.id;
  const going = event.attendees.some((a) => a.userId === user.id);
  const full = event.capacity !== null && event.attendees.length >= event.capacity;
  const attendedCount = event.attendees.filter((a) => a.attendedAt).length;

  const [attendanceQr, inviteQr] = isHost
    ? await Promise.all([
        qrSvg(eventAttendanceUrl(event.id)),
        qrSvg(eventInviteUrl(event.id, event.host.referralCode)),
      ])
    : [null, null];

  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 py-4">
      <Link href="/events" className="text-sm font-medium text-primary">
        ← All events
      </Link>

      <Card className="p-5">
        <h1 className="text-xl font-bold">{event.title}</h1>
        <div className="mt-2 space-y-1 text-sm text-muted">
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {fmt(event.startsAt)}
            {event.endsAt ? ` – ${fmt(event.endsAt)}` : ""}
          </p>
          {event.location && (
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> {event.location}
            </p>
          )}
          <p className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {event.attendees.length}
            {event.capacity ? ` / ${event.capacity}` : ""} attending · host{" "}
            {event.host.profile?.displayName ||
              event.host.profile?.fullName ||
              "member"}
          </p>
        </div>
        {event.description && (
          <p className="mt-3 whitespace-pre-line text-sm">{event.description}</p>
        )}
        {!isHost && (
          <div className="mt-4">
            <RsvpButton eventId={event.id} going={going} full={full} />
          </div>
        )}
        {isHost && (
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <UserCheck className="h-3.5 w-3.5" /> You are the host ·{" "}
            {attendedCount} checked in of {event.attendees.length}
          </p>
        )}
      </Card>
      {isHost && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 px-1 text-sm font-semibold">
            <QrCode className="h-4 w-4 text-brand-600" /> Event QR codes
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="p-4 text-center">
              <h3 className="text-sm font-semibold">Attendance QR</h3>
              <p className="mt-1 text-xs text-muted">
                Attendees scan this at the venue to check in.
              </p>
              <div
                className="mx-auto mt-3 w-full max-w-[240px] [&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: attendanceQr ?? "" }}
              />
            </Card>
            <Card className="p-4 text-center">
              <h3 className="text-sm font-semibold">Invite QR</h3>
              <p className="mt-1 text-xs text-muted">
                New members who scan join the app under your referral — and
                become attendees of this event.
              </p>
              <div
                className="mx-auto mt-3 w-full max-w-[240px] [&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: inviteQr ?? "" }}
              />
            </Card>
          </div>
        </section>
      )}
      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold">
          Attendees ({event.attendees.length})
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {event.attendees.map((a) => {
            const name =
              a.user.profile?.displayName ||
              a.user.profile?.fullName ||
              "Member";
            return (
              <Link
                key={a.userId}
                href={a.user.profile?.username ? `/u/${a.user.profile.username}` : "#"}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-surface p-2.5 hover:bg-surface-2"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                  {a.user.profile?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.user.profile.avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    name.charAt(0)
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {name}
                </span>
                {a.attendedAt && (
                  <span className="shrink-0 text-xs font-semibold text-green-600">
                    ✓
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}