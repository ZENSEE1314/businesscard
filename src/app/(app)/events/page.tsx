import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listUpcomingEvents, isPaidMember } from "@/features/events/queries";
import { EventCalendar } from "@/features/events/event-calendar";
import { EventForm } from "@/features/events/event-form";
import { RsvpButton } from "@/features/events/rsvp-button";
import { Card } from "@/components/ui";
import { TranslateButton } from "@/components/translate-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Events" };

function fmt(dt: string): string {
  return new Date(dt).toLocaleString("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function EventsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [events, isPaid] = await Promise.all([
    listUpcomingEvents(user.id),
    isPaidMember(user.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 py-4">
      <div className="px-1">
        <h1 className="text-xl font-bold">Events</h1>
        <p className="mt-1 text-sm text-muted">
          Meet the community in person. Paid members host their own events here.
        </p>
      </div>

      <Card className="p-4">
        <EventCalendar events={events} />
      </Card>

      <div className="space-y-3">
        {events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
            No upcoming events yet.
          </p>
        ) : (
          events.map((e) => (
            <Card key={e.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{e.title}</h2>
                  <p className="mt-0.5 text-xs text-muted">
                    Hosted by {e.hostName}
                    {e.hostTier ? ` · ${e.hostTier}` : ""}
                    {e.visibility === "MEMBERS_ONLY" ? " · Members only" : ""}
                  </p>
                </div>
              </div>
              <div className="mt-2 space-y-1 text-sm text-muted">
                <p className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 shrink-0" /> {fmt(e.startsAt)}
                  {e.endsAt ? ` – ${fmt(e.endsAt)}` : ""}
                </p>
                {e.location && (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0" /> {e.location}
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <Users className="h-4 w-4 shrink-0" />
                  {e.attendeeCount}
                  {e.capacity ? ` / ${e.capacity}` : ""} attending
                </p>
              </div>
              {e.description && (
                <>
                  <p className="mt-2 whitespace-pre-line text-sm">{e.description}</p>
                  <TranslateButton text={e.description} className="mt-1" />
                </>
              )}
              <div className="mt-3">
                <RsvpButton
                  eventId={e.id}
                  going={e.rsvpStatus === "GOING"}
                  full={e.capacity !== null && e.attendeeCount >= e.capacity}
                />
              </div>
            </Card>
          ))
        )}
      </div>

      {isPaid ? (
        <div>
          <h2 className="mb-2 px-1 font-semibold">Host an event</h2>
          <EventForm />
        </div>
      ) : (
        <Card className="border-dashed p-5 text-center">
          <p className="text-sm font-semibold">Want to host your own event?</p>
          <p className="mt-1 text-sm text-muted">
            Event hosting is a paid member benefit (BridgeMaker / BridgeMaster).
          </p>
          <a href="/membership" className="mt-2 inline-block text-sm font-medium text-brand-700 underline">
            See membership plans →
          </a>
        </Card>
      )}
    </div>
  );
}
