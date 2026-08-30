"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flame, Gift, CheckCircle2, Loader2 } from "lucide-react";
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

export function CheckInCard({ initial }: { initial: CheckinStatus }) {
  const router = useRouter();
  const t = useT();
  const [status, setStatus] = useState(initial);
  const [justClaimed, setJustClaimed] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  async function claim() {
    setError(null);
    setSubmitting(true);
    const res = await apiFetch<ClaimResponse>("/api/checkin", { method: "POST" });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "Check-in failed. Please try again.");
      return;
    }
    setStatus(res.data.status);
    if (res.data.awarded) setJustClaimed(res.data.pointsAwarded);
    startTransition(() => router.refresh());
  }

  if (!status.enabled) return null;

  const busy = submitting || pending;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Gift className="h-5 w-5 text-brand-600" />
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

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium">
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

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {justClaimed !== null && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
          {t("checkin.success", { n: justClaimed })}
        </p>
      )}

      {!status.checkedInToday && (
        <button
          onClick={claim}
          disabled={busy}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-fg transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? t("checkin.checkingIn") : t("checkin.checkInNow")}
        </button>
      )}
    </div>
  );
}