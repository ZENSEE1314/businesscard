"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Flame,
  Gift,
  CheckCircle2,
  Loader2,
  ChevronDown,
  PartyPopper,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "@/lib/client";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";

interface CheckinStatus {
  enabled: boolean;
  checkedInToday: boolean;
  todayPoints: number | null;
  streak: number;
  totalCheckInDays: number;
  nextMilestone: { day: number; bonus: number } | null;
  basePoints: number;
  milestones: { day: number; bonus: number }[];
}

interface ClaimResponse {
  awarded: boolean;
  reason?: string;
  pointsAwarded: number;
  bonusPoints: number;
  streakDay: number;
  balance: number;
  status: CheckinStatus;
}

const CONFETTI_COLORS = [
  "#2563eb",
  "#22d3ee",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
];

/** Tiny deterministic PRNG (mulberry32) — keeps the confetti lint-pure. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One-shot confetti burst rendered over the card when a check-in lands. */
function Confetti() {
  const pieces = useMemo(() => {
    const rand = seededRandom(42);
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: 8 + rand() * 84,
      tx: Math.round(rand() * 160 - 80),
      ty: -Math.round(60 + rand() * 120),
      rot: Math.round(rand() * 540 - 270),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + rand() * 6,
      delay: rand() * 120,
    }));
  }, []);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {pieces.map((p) => (
        <span
          key={p.id}
          className="anim-confetti absolute top-1/2 block rounded-sm"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 0.6,
              background: p.color,
              "--tx": `${p.tx}px`,
              "--ty": `${p.ty}px`,
              "--rot": `${p.rot}deg`,
              animationDelay: `${p.delay}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function CheckInCard({ initial }: { initial: CheckinStatus }) {
  const router = useRouter();
  const t = useT();
  const [status, setStatus] = useState(initial);
  const [justClaimed, setJustClaimed] = useState<number | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [milestoneHit, setMilestoneHit] = useState(false);
  const [stripOpen, setStripOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  async function claim() {
    setError(null);
    setSubmitting(true);
    const res = await apiFetch<ClaimResponse>("/api/checkin", {
      method: "POST",
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "Check-in failed. Please try again.");
      return;
    }
    setStatus(res.data.status);
    if (res.data.awarded) {
      setJustClaimed(res.data.pointsAwarded);
      setMilestoneHit(res.data.bonusPoints > 0);
      setStripOpen(true); // pop the 7-day rewards open so the hit is visible
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 1100);
    }
    startTransition(() => router.refresh());
  }

  if (!status.enabled) return null;

  const busy = submitting || pending;

  return (
    <div className="relative rounded-2xl border border-border bg-surface p-5 shadow-sm">
      {celebrating && <Confetti />}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Gift
              className={cn(
                "h-5 w-5 text-brand-600",
                celebrating && "anim-wiggle",
              )}
            />
            {t("checkin.title")}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {status.checkedInToday
              ? t("checkin.claimedToday", { n: status.todayPoints ?? 0 })
              : t("checkin.earnToday", { n: status.basePoints })}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
            status.checkedInToday
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700",
          )}
        >
          {status.checkedInToday ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" /> {t("checkin.doneToday")}
            </>
          ) : (
            t("checkin.pending")
          )}
        </span>
      </div>

      {/* Animated claim celebration banner */}
      {justClaimed !== null && (
        <div
          key={justClaimed}
          className="anim-pop mt-3 flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-brand-600 to-accent px-4 py-3 text-white shadow-md"
        >
          <p className="flex items-center gap-2 text-sm font-semibold">
            <PartyPopper className="h-4 w-4" />
            {t("checkin.success", { n: justClaimed })}
          </p>
          {milestoneHit && (
            <span className="anim-wiggle inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold">
              <Sparkles className="h-3 w-3" /> Milestone bonus!
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 font-medium",
            celebrating && "anim-wiggle text-orange-600",
          )}
        >
          <Flame className="h-4 w-4 text-orange-500" />
          {t("checkin.dayStreak", { n: status.streak })}
        </span>
        <span className="text-muted">
          {t("checkin.totalDays", { n: status.totalCheckInDays })}
        </span>
        {status.nextMilestone && (
          <span className="text-muted">
            {t("checkin.nextBonus", {
              bonus: status.nextMilestone.bonus,
              day: status.nextMilestone.day,
            })}
          </span>
        )}
      </div>

      {/* 7-day milestone rewards — click to expand */}
      <button
        type="button"
        onClick={() => setStripOpen((o) => !o)}
        aria-expanded={stripOpen}
        className="mt-4 flex w-full items-center justify-between rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-left transition-colors hover:bg-border/40"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-amber-500" />
          7-day milestone rewards
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted transition-transform duration-300",
            stripOpen && "rotate-180",
          )}
        />
      </button>
      <div className={cn("anim-collapse", stripOpen && "open")}>
        <div>
          <SevenDayStrip
            streak={status.streak}
            checkedInToday={status.checkedInToday}
            basePoints={status.basePoints}
            milestones={status.milestones}
            wiggle={milestoneHit}
          />
          {biggerMilestonesNote(status.milestones)}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {!status.checkedInToday && (
        <button
          onClick={claim}
          disabled={busy}
          className={cn(
            "anim-float mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-fg shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 sm:w-auto",
            !busy && "anim-glow",
          )}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? t("checkin.checkingIn") : t("checkin.checkInNow")}
        </button>
      )}
    </div>
  );
}

function SevenDayStrip({
  streak,
  checkedInToday,
  basePoints,
  milestones,
  wiggle,
}: {
  streak: number;
  checkedInToday: boolean;
  basePoints: number;
  milestones: { day: number; bonus: number }[];
  wiggle: boolean;
}) {
  const days = [1, 2, 3, 4, 5, 6, 7];
  const doneThrough = Math.min(streak, 7); // days already checked in
  const todayTile = checkedInToday
    ? Math.min(streak, 7)
    : Math.min(streak + 1, 7); // where the next claim lands
  return (
    <div className="grid grid-cols-7 gap-1.5 pt-3">
      {days.map((d) => {
        const bonus = milestones.find((m) => m.day === d)?.bonus ?? 0;
        const done = d <= doneThrough;
        const isToday = d === todayTile && !checkedInToday;
        const total = basePoints + bonus;
        return (
          <div
            key={d}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-center",
              done ? "border-green-200 bg-green-50" : "border-border bg-surface",
              isToday &&
                "anim-glow border-brand-300 bg-brand-50 ring-2 ring-brand-200",
              wiggle && bonus > 0 && done && "anim-wiggle",
            )}
          >
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wide",
                done ? "text-green-600" : "text-muted",
              )}
            >
              D{d}
            </span>
            <span
              className={cn(
                "text-sm font-extrabold",
                bonus > 0 ? "text-amber-600" : "text-brand-700",
                done && "text-green-700",
              )}
            >
              +{total}
            </span>
            {bonus > 0 ? (
              <Gift className="h-3 w-3 text-amber-500" />
            ) : done ? (
              <CheckCircle2 className="h-3 w-3 text-green-500" />
            ) : (
              <span className="h-3 w-3 rounded-full border border-dashed border-border" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function biggerMilestonesNote(milestones: { day: number; bonus: number }[]) {
  const bigger = milestones.filter((m) => m.day > 7);
  return (
    <p className="mt-2 text-xs text-muted">
      Bonus days pay <span className="font-semibold text-amber-600">base + bonus</span>. Miss a
      day and the streak restarts — keep it alive!
      {bigger.length > 0 && (
        <> Bigger bonuses ahead: {bigger.map((m) => `day ${m.day} +${m.bonus}`).join(", ")}.</>
      )}
    </p>
  );
}