"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, CalendarX } from "lucide-react";
import { Button } from "@/components/ui";
import { apiFetch } from "@/lib/client";

export function RsvpButton({
  eventId,
  going,
  full,
}: {
  eventId: string;
  going: boolean;
  full: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function toggle(nextGoing: boolean) {
    setBusy(true);
    setMsg(null);
    const res = await apiFetch(`/api/events/${eventId}/rsvp`, {
      method: "POST",
      body: JSON.stringify({ going: nextGoing }),
    });
    setBusy(false);
    if (!res.ok) setMsg(res.error ?? "Failed.");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-stretch gap-1">
      {going ? (
        <Button variant="outline" size="sm" disabled={busy} onClick={() => toggle(false)}>
          <CalendarX className="h-4 w-4" /> Not going anymore
        </Button>
      ) : (
        <Button size="sm" disabled={busy || full} onClick={() => toggle(true)}>
          <CalendarCheck className="h-4 w-4" /> {full ? "Event full" : "I'll attend"}
        </Button>
      )}
      {msg && <p className="text-xs text-red-600">{msg}</p>}
    </div>
  );
}
