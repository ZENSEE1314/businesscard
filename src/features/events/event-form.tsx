"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/client";

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Computed once at module load (stable for the session, purity-safe).
const DEFAULT_START = toLocalInputValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

// Event creation form — shown to paid members only (page enforces the gate).
export function EventForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    startsAt: DEFAULT_START,
    endsAt: "",
    capacity: "",
    visibility: "PUBLIC",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await apiFetch("/api/events", {
      method: "POST",
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        location: form.location,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        capacity: form.capacity ? Number(form.capacity) : null,
        visibility: form.visibility,
      }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/events");
      router.refresh();
    } else {
      setMsg(res.error ?? "Failed to create the event.");
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="ev-title">Event title</Label>
          <Input
            id="ev-title"
            required
            minLength={3}
            maxLength={140}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Business networking night"
          />
        </div>
        <div>
          <Label htmlFor="ev-desc">Description</Label>
          <Textarea
            id="ev-desc"
            maxLength={2000}
            rows={4}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What should attendees expect?"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="ev-start">Starts</Label>
            <Input
              id="ev-start"
              type="datetime-local"
              required
              value={form.startsAt}
              onChange={(e) => set("startsAt", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ev-end">Ends (optional)</Label>
            <Input
              id="ev-end"
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => set("endsAt", e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="ev-loc">Location</Label>
            <Input
              id="ev-loc"
              maxLength={160}
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Jakarta Convention Center"
            />
          </div>
          <div>
            <Label htmlFor="ev-cap">Capacity (optional)</Label>
            <Input
              id="ev-cap"
              type="number"
              min={2}
              value={form.capacity}
              onChange={(e) => set("capacity", e.target.value)}
              placeholder="50"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="ev-vis">Who can see this event</Label>
          <select
            id="ev-vis"
            value={form.visibility}
            onChange={(e) => set("visibility", e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="PUBLIC">Everyone (public)</option>
            <option value="MEMBERS_ONLY">Members only</option>
          </select>
        </div>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        <Button type="submit" disabled={busy} className="w-full">
          Publish event
        </Button>
      </form>
    </Card>
  );
}
