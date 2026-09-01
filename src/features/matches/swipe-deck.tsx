"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { X, Heart, MessageCircle, Check, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/client";

export interface SwipeCandidate {
  userId: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  subtitle: string | null;
  about: string | null;
  isBusiness: boolean;
  canHelp: string[];
  lookingFor: string[];
  matchedOn: string[];
}

interface Labels {
  empty: string;
  pass: string;
  connect: string;
  connected: string;
  message: string;
  canHelp: string;
  lookingFor: string;
  matchTag: string;
}

const PASSED_KEY = "matches-passed";

function readPassed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(PASSED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function rememberPassed(userId: string) {
  try {
    const s = readPassed();
    s.add(userId);
    // Cap the history so it can't grow without bound.
    const arr = Array.from(s).slice(-500);
    localStorage.setItem(PASSED_KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Tinder-style swipe deck: one card at a time, drag or tap the buttons to pass
 * (left) or connect (right). Connecting saves the member to Contacts; passed
 * members are remembered per-device so they don't reappear.
 */
export function SwipeDeck({
  candidates,
  labels,
}: {
  candidates: SwipeCandidate[];
  labels: Labels;
}) {
  // Drop anyone already passed on this device.
  const deck = useMemo(() => {
    const passed = typeof window !== "undefined" ? readPassed() : new Set<string>();
    return candidates.filter((c) => !passed.has(c.userId));
  }, [candidates]);

  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [leaving, setLeaving] = useState<null | "left" | "right">(null);
  const [justConnected, setJustConnected] = useState<string | null>(null);
  const startX = useRef<number | null>(null);

  const current = deck[index];
  const next = deck[index + 1];

  function advance() {
    setDrag(0);
    setLeaving(null);
    setStartAndIndex();
  }

  function setStartAndIndex() {
    startX.current = null;
    setIndex((i) => i + 1);
  }

  function connect(c: SwipeCandidate) {
    // Fire-and-forget save to contacts; UI advances immediately.
    apiFetch("/api/contacts", {
      method: "POST",
      body: JSON.stringify({ username: c.username, source: "MANUAL" }),
    }).catch(() => undefined);
    setJustConnected(c.name);
    window.setTimeout(() => setJustConnected(null), 1500);
  }

  function decide(dir: "left" | "right") {
    if (!current || leaving) return;
    if (dir === "right") connect(current);
    else rememberPassed(current.userId);
    setLeaving(dir);
    window.setTimeout(advance, 250);
  }

  // --- pointer drag ---
  function onPointerDown(e: React.PointerEvent) {
    if (leaving) return;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (startX.current === null) return;
    setDrag(e.clientX - startX.current);
  }
  function onPointerUp() {
    if (startX.current === null) return;
    const threshold = 110;
    if (drag > threshold) decide("right");
    else if (drag < -threshold) decide("left");
    else setDrag(0);
    startX.current = null;
  }

  if (!current) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-brand-600" />
        <p className="mt-3 text-sm text-muted">{labels.empty}</p>
      </div>
    );
  }

  const rotation = Math.max(-12, Math.min(12, drag / 12));
  const offset = leaving === "left" ? -600 : leaving === "right" ? 600 : drag;
  const likeOpacity = Math.min(1, Math.max(0, drag / 110));
  const passOpacity = Math.min(1, Math.max(0, -drag / 110));

  return (
    <div className="select-none">
      <div className="relative h-[460px]">
        {/* Next card peeking behind */}
        {next && (
          <div className="absolute inset-0 scale-[0.96] opacity-70">
            <CardFace c={next} labels={labels} />
          </div>
        )}

        {/* Active card */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
          style={{
            transform: `translateX(${offset}px) rotate(${rotation}deg)`,
            transition: leaving || startX.current === null ? "transform 0.25s ease" : "none",
          }}
        >
          <CardFace c={current} labels={labels}>
            <span
              className="pointer-events-none absolute left-4 top-4 rounded-lg border-2 border-green-500 px-2 py-1 text-sm font-extrabold uppercase text-green-500"
              style={{ opacity: likeOpacity, transform: "rotate(-12deg)" }}
            >
              {labels.connect}
            </span>
            <span
              className="pointer-events-none absolute right-4 top-4 rounded-lg border-2 border-red-500 px-2 py-1 text-sm font-extrabold uppercase text-red-500"
              style={{ opacity: passOpacity, transform: "rotate(12deg)" }}
            >
              {labels.pass}
            </span>
          </CardFace>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-5 flex items-center justify-center gap-6">
        <button
          onClick={() => decide("left")}
          aria-label={labels.pass}
          className="grid h-14 w-14 place-items-center rounded-full border border-border bg-surface text-red-500 shadow-sm transition-transform hover:scale-105"
        >
          <X className="h-6 w-6" />
        </button>
        <Link
          href={`/chat?with=${encodeURIComponent(current.username)}`}
          aria-label={labels.message}
          className="grid h-12 w-12 place-items-center rounded-full border border-border bg-surface text-primary shadow-sm transition-transform hover:scale-105"
        >
          <MessageCircle className="h-5 w-5" />
        </Link>
        <button
          onClick={() => decide("right")}
          aria-label={labels.connect}
          className="grid h-14 w-14 place-items-center rounded-full border border-border bg-surface text-green-500 shadow-sm transition-transform hover:scale-105"
        >
          <Heart className="h-6 w-6" />
        </button>
      </div>

      {justConnected && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-medium text-green-700">
          <Check className="h-4 w-4" /> {labels.connected} {justConnected}
        </p>
      )}
    </div>
  );
}

function CardFace({
  c,
  labels,
  children,
}: {
  c: SwipeCandidate;
  labels: Labels;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-lg">
      <div className="relative flex h-52 items-center justify-center bg-gradient-to-br from-brand-500 to-accent">
        {c.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-5xl font-bold text-white">{initials(c.name)}</span>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white">
          {c.isBusiness ? "Business" : "Member"}
        </span>
        {children}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-lg font-bold">{c.name}</h2>
        {c.subtitle && <p className="text-sm text-muted">{c.subtitle}</p>}
        {c.about && <p className="mt-2 line-clamp-3 text-sm">{c.about}</p>}

        {c.matchedOn.length > 0 && (
          <div className="mt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
              {labels.matchTag}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {c.matchedOn.map((t) => (
                <span key={t} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                  ✓ {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {c.canHelp.length > 0 && (
          <div className="mt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{labels.canHelp}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {c.canHelp.map((t) => (
                <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">{t}</span>
              ))}
            </div>
          </div>
        )}

        {c.lookingFor.length > 0 && (
          <div className="mt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{labels.lookingFor}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {c.lookingFor.map((t) => (
                <span key={t} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
