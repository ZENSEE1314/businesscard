"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { EventListItem } from "./queries";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Month-grid calendar. Days that have events show up to two clickable chips;
 * selecting a day scrolls it into the "selected day" summary below the grid.
 */
export function EventCalendar({ events }: { events: EventListItem[] }) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selected, setSelected] = useState<Date | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, EventListItem[]>();
    for (const e of events) {
      const d = new Date(e.startsAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const list = map.get(key) ?? [];
      if (list.length < 3) list.push(e);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i += 1) out.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) {
      out.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString("en", { month: "long", year: "numeric" });
  const selectedEvents = selected
    ? events.filter((e) => sameDay(new Date(e.startsAt), selected))
    : [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{monthLabel}</h2>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-surface-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-surface-2"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`x${i}`} />;
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          const dayEvents = byDay.get(key) ?? [];
          const isToday = sameDay(d, today);
          const isSelected = selected && sameDay(d, selected);
          return (
            <button
              type="button"
              key={key}
              onClick={() => setSelected(isSelected ? null : d)}
              className={[
                "min-h-14 rounded-lg border p-1 text-left align-top text-xs transition-colors",
                dayEvents.length > 0 ? "border-brand-200 bg-brand-50 hover:bg-brand-100" : "border-border",
                isSelected ? "ring-2 ring-brand-500" : "",
                isToday ? "font-bold" : "",
              ].join(" ")}
            >
              <span className={isToday ? "text-brand-700" : ""}>{d.getDate()}</span>
              {dayEvents.slice(0, 2).map((e) => (
                <span
                  key={e.id}
                  className="mt-0.5 block truncate rounded bg-brand-600 px-1 py-0.5 text-[10px] font-medium text-white"
                >
                  {e.title}
                </span>
              ))}
              {dayEvents.length > 2 && (
                <span className="block text-[10px] text-brand-700">
                  +{dayEvents.length - 2} more
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-3 rounded-xl border border-border p-3">
          <p className="text-sm font-semibold">
            {selected.toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          {selectedEvents.length === 0 ? (
            <p className="mt-1 text-sm text-muted">No events on this day.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {selectedEvents.map((e) => (
                <li key={e.id} className="text-sm">
                  <span className="font-medium">{e.title}</span>
                  <span className="text-muted">
                    {" "}
                    ·{" "}
                    {new Date(e.startsAt).toLocaleTimeString("en", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
