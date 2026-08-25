"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { apiFetch } from "@/lib/client";

interface SettingsPayload {
  dailyCheckIn: {
    enabled: boolean;
    basePoints: number;
    autoCheckInOnLogin: boolean;
    streakBonusEnabled: boolean;
    milestones: { day: number; bonus: number }[];
    maxDailyPoints: number;
  };
  activityThresholds: { activeWithinDays: number; inactiveWithinDays: number };
  cardRanking: { enabled: boolean; method: string; maxConnections: number };
  aiProfile: { enabled: boolean };
  loginRateLimit: {
    emailFailuresAllowed: number;
    ipFailuresAllowed: number;
    windowMinutes: number;
  };
  ai: {
    envEnabled: boolean;
    model: string | null;
    baseUrlConfigured: boolean;
    reachable: boolean;
    detail: string;
  };
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 w-24 rounded-lg border border-border bg-surface px-3 text-right text-sm"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--primary)]"
      />
    </label>
  );
}

export default function AdminSettingsPage() {
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<SettingsPayload>("/api/admin/settings").then((res) => {
      if (res.ok) setData(res.data);
      else setError(res.error ?? "Failed to load settings.");
    });
  }, []);

  async function save() {
    if (!data) return;
    setSaving(true);
    setSavedMsg(null);
    setError(null);
    const res = await apiFetch("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({
        dailyCheckIn: data.dailyCheckIn,
        activityThresholds: data.activityThresholds,
        cardRanking: data.cardRanking,
        aiProfile: data.aiProfile,
        loginRateLimit: data.loginRateLimit,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Save failed.");
      return;
    }
    setSavedMsg("Settings saved.");
    setTimeout(() => setSavedMsg(null), 2500);
  }

  if (error && !data) {
    return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>;
  }
  if (!data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
      </div>
    );
  }

  const d = data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Platform Settings</h1>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save all
        </button>
      </div>

      {savedMsg && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">{savedMsg}</p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <Section
        title="Daily check-in & points"
        description="Uses the existing points balance — no separate token system."
      >
        <Toggle label="Daily check-in enabled" checked={d.dailyCheckIn.enabled} onChange={(v) => setData({ ...d, dailyCheckIn: { ...d.dailyCheckIn, enabled: v } })} />
        <NumberField label="Base points per day" value={d.dailyCheckIn.basePoints} onChange={(v) => setData({ ...d, dailyCheckIn: { ...d.dailyCheckIn, basePoints: v } })} />
        <Toggle label="Auto check-in on first login of the day" checked={d.dailyCheckIn.autoCheckInOnLogin} onChange={(v) => setData({ ...d, dailyCheckIn: { ...d.dailyCheckIn, autoCheckInOnLogin: v } })} />
        <Toggle label="Streak bonuses enabled" checked={d.dailyCheckIn.streakBonusEnabled} onChange={(v) => setData({ ...d, dailyCheckIn: { ...d.dailyCheckIn, streakBonusEnabled: v } })} />
        <NumberField label="Max points per claim" value={d.dailyCheckIn.maxDailyPoints} onChange={(v) => setData({ ...d, dailyCheckIn: { ...d.dailyCheckIn, maxDailyPoints: v } })} />
        <div>
          <p className="mb-2 text-sm font-medium">Streak milestones</p>
          {d.dailyCheckIn.milestones.map((m, i) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                Day
                <input
                  type="number"
                  min={1}
                  value={m.day}
                  onChange={(e) => {
                    const milestones = [...d.dailyCheckIn.milestones];
                    milestones[i] = { ...m, day: Number(e.target.value) };
                    setData({ ...d, dailyCheckIn: { ...d.dailyCheckIn, milestones } });
                  }}
                  className="h-9 w-20 rounded-lg border border-border bg-surface px-2 text-right text-sm"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                Bonus pts
                <input
                  type="number"
                  min={0}
                  value={m.bonus}
                  onChange={(e) => {
                    const milestones = [...d.dailyCheckIn.milestones];
                    milestones[i] = { ...m, bonus: Number(e.target.value) };
                    setData({ ...d, dailyCheckIn: { ...d.dailyCheckIn, milestones } });
                  }}
                  className="h-9 w-20 rounded-lg border border-border bg-surface px-2 text-right text-sm"
                />
              </label>
              <button
                onClick={() =>
                  setData({
                    ...d,
                    dailyCheckIn: {
                      ...d.dailyCheckIn,
                      milestones: d.dailyCheckIn.milestones.filter((_, j) => j !== i),
                    },
                  })
                }
                className="ml-auto rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-surface-2"
              >
                Remove
              </button>
            </div>
          ))}
          {d.dailyCheckIn.milestones.length < 10 && (
            <button
              onClick={() =>
                setData({
                  ...d,
                  dailyCheckIn: {
                    ...d.dailyCheckIn,
                    milestones: [...d.dailyCheckIn.milestones, { day: 7, bonus: 25 }],
                  },
                })
              }
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2"
            >
              + Add milestone
            </button>
          )}
        </div>
      </Section>

      <Section title="Activity thresholds" description="Days since last successful login.">
        <NumberField label="Active within (days)" value={d.activityThresholds.activeWithinDays} min={1} onChange={(v) => setData({ ...d, activityThresholds: { ...d.activityThresholds, activeWithinDays: v } })} />
        <NumberField label="Inactive until (days)" value={d.activityThresholds.inactiveWithinDays} min={2} onChange={(v) => setData({ ...d, activityThresholds: { ...d.activityThresholds, inactiveWithinDays: v } })} />
        <p className="text-xs text-muted">Beyond the inactive threshold users are Dormant.</p>
      </Section>

      <Section title="Public cards — top connections" description="Shown below every public digital name card (max seven).">
        <Toggle label="Show top connections on public cards" checked={d.cardRanking.enabled} onChange={(v) => setData({ ...d, cardRanking: { ...d.cardRanking, enabled: v } })} />
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Ranking method</span>
          <select
            value={d.cardRanking.method}
            onChange={(e) => setData({ ...d, cardRanking: { ...d.cardRanking, method: e.target.value } })}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm"
          >
            <option value="activity">Recent activity</option>
            <option value="points">Points balance</option>
            <option value="membership">Membership tier</option>
            <option value="connections">Connection count</option>
          </select>
        </label>
        <NumberField label="Connections to show (max 7)" value={d.cardRanking.maxConnections} onChange={(v) => setData({ ...d, cardRanking: { ...d.cardRanking, maxConnections: Math.min(7, v) } })} />
      </Section>

      <Section title="AI profile generation" description="Ollama service used for AI-assisted profile content.">
        <Toggle label="AI generation enabled (admin switch)" checked={d.aiProfile.enabled} onChange={(v) => setData({ ...d, aiProfile: { enabled: v } })} />
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Environment configured</dt><dd>{d.ai.baseUrlConfigured ? "Yes" : "No — OLLAMA_BASE_URL missing"}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Model</dt><dd className="font-mono text-xs">{d.ai.model ?? "—"}</dd></div>
          <div className="flex justify-between">
            <dt className="text-muted">Service reachable</dt>
            <dd>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${d.ai.reachable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {d.ai.reachable ? "Reachable" : "Unreachable"}
              </span>
            </dd>
          </div>
        </dl>
        <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">{d.ai.detail}</p>
      </Section>

      <Section title="Login rate limiting" description="Only FAILED attempts count; successful logins clear the account counter.">
        <NumberField label="Failed attempts allowed per account" value={d.loginRateLimit.emailFailuresAllowed} min={3} onChange={(v) => setData({ ...d, loginRateLimit: { ...d.loginRateLimit, emailFailuresAllowed: v } })} />
        <NumberField label="Failed attempts allowed per IP" value={d.loginRateLimit.ipFailuresAllowed} min={5} onChange={(v) => setData({ ...d, loginRateLimit: { ...d.loginRateLimit, ipFailuresAllowed: v } })} />
        <NumberField label="Window (minutes)" value={d.loginRateLimit.windowMinutes} min={1} onChange={(v) => setData({ ...d, loginRateLimit: { ...d.loginRateLimit, windowMinutes: v } })} />
        <p className="text-xs text-muted">
          Per-account limits stop password spraying; the generous per-IP limit keeps
          unrelated users behind shared carrier NAT (XL Axiata, Telkomsel…) working.
        </p>
      </Section>
    </div>
  );
}