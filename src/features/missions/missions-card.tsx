"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Target, Gift, CheckCircle2, Loader2, PartyPopper } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";

// ---------------------------------------------------------------------------
// Weekly networking missions card. Progress bars for the five weekly goals,
// claim buttons powered by POST /api/missions/claim, and the all-five bonus.
// ---------------------------------------------------------------------------

export interface MissionViewClient {
  key: string;
  target: number;
  progress: number;
  reward: number;
  completed: boolean;
  claimed: boolean;
}

export interface MissionBoardClient {
  weekKey: string;
  missions: MissionViewClient[];
  completedCount: number;
  claimedCount: number;
  bonusReward: number;
  bonusClaimed: boolean;
  allCompleted: boolean;
}

interface ClaimResponse {
  awarded: number;
  balance: number;
}

function weekLabel(weekKey: string): string {
  const monday = new Date(Date.parse(`${weekKey}T00:00:00Z`));
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(monday);
}

export function MissionsCard({ board }: { board: MissionBoardClient }) {
  const router = useRouter();
  const t = useT();
  const [state, setState] = useState(board);
  const [claimedNow, setClaimedNow] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function claim(missionKey: string) {
    setError(null);
    setBusyKey(missionKey);
    const res = await apiFetch<ClaimResponse>("/api/missions/claim", {
      method: "POST",
      body: JSON.stringify({ missionKey }),
    });
    setBusyKey(null);
    if (!res.ok) {
      setError(res.error ?? "Could not claim the reward.");
      return;
    }
    setState((b) => ({
      ...b,
      missions:
        missionKey === "mission:all"
          ? b.missions
          : b.missions.map((m) =>
              m.key === missionKey ? { ...m, claimed: true } : m,
            ),
      bonusClaimed: missionKey === "mission:all" ? true : b.bonusClaimed,
      claimedCount:
        missionKey === "mission:all" ? b.claimedCount : b.claimedCount + 1,
    }));
    setClaimedNow(missionKey);
    setTimeout(() => setClaimedNow(null), 1200);
    startTransition(() => router.refresh());
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Target className="h-5 w-5 text-brand-600" />
            {t("mission.title")}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("mission.subtitle")}</p>
        </div>
        <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold">
          {t("mission.weekOf", { date: weekLabel(state.weekKey) })}
        </span>
      </div>

      <ul className="mt-4 space-y-3">
        {state.missions.map((m) => (
          <MissionRow
            key={m.key}
            mission={m}
            label={t(`mission.${m.key}`)}
            progressLabel={t("mission.progressOf", {
              done: m.progress,
              target: m.target,
            })}
            claimLabel={t("mission.claim", { n: m.reward })}
            claimedLabel={t("mission.claimed")}
            justClaimed={claimedNow === m.key}
            busy={busyKey === m.key}
            anyBusy={busyKey !== null}
            onClaim={() => claim(m.key)}
          />
        ))}
      </ul>
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {/* All-five bonus */}
      <div
        className={cn(
          "mt-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3",
          state.allCompleted && !state.bonusClaimed
            ? "anim-glow border-amber-300 bg-amber-50"
            : "border-border bg-surface-2",
        )}
      >
        <p className="flex items-center gap-2 text-sm font-semibold">
          <PartyPopper className="h-4 w-4 text-amber-500" />
          {t("mission.allBonus", { n: state.bonusReward })}
        </p>
        {state.bonusClaimed ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
            <CheckCircle2 className="h-4 w-4" /> {t("mission.claimed")}
          </span>
        ) : state.allCompleted ? (
          <button
            onClick={() => claim("mission:all")}
            disabled={busyKey !== null}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg transition-transform active:scale-95 disabled:opacity-60"
          >
            {busyKey === "mission:all" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Gift className="h-3.5 w-3.5" />
            )}
            {t("mission.claimAll", { n: state.bonusReward })}
          </button>
        ) : (
          <span className="text-xs text-muted">{state.completedCount}/5</span>
        )}
      </div>
    </div>
  );
}

function MissionRow({
  mission,
  label,
  progressLabel,
  claimLabel,
  claimedLabel,
  justClaimed,
  busy,
  anyBusy,
  onClaim,
}: {
  mission: MissionViewClient;
  label: string;
  progressLabel: string;
  claimLabel: string;
  claimedLabel: string;
  justClaimed: boolean;
  busy: boolean;
  anyBusy: boolean;
  onClaim: () => void;
}) {
  const pct = Math.min(100, Math.round((mission.progress / mission.target) * 100));
  return (
    <li className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "truncate text-sm font-medium",
              mission.completed && "text-green-700",
            )}
          >
            {label}
          </p>
          <span className="shrink-0 text-xs tabular-nums text-muted">
            {progressLabel}
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              mission.completed ? "bg-green-500" : "bg-brand-500",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {mission.claimed ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
          <CheckCircle2 className="h-3.5 w-3.5" /> {claimedLabel}
        </span>
      ) : mission.completed ? (
        <button
          onClick={onClaim}
          disabled={anyBusy}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg transition-transform active:scale-95 disabled:opacity-60",
            justClaimed && "anim-wiggle",
          )}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Gift className="h-3.5 w-3.5" />
          )}
          {claimLabel}
        </button>
      ) : (
        <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
          +{mission.reward}
        </span>
      )}
    </li>
  );
}