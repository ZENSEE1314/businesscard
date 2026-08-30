import type { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  MessageSquare,
  Sparkles,
  Share2,
  CalendarDays,
  BellRing,
  ArrowRight,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDashboardData } from "@/features/dashboard/queries";
import { getLocale, tt } from "@/lib/i18n/server";
import { CheckInCard } from "@/components/checkin-card";
import { FollowUpButton } from "@/components/follow-up-button";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard" };

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function StatTile({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const inner = (
    <Card className="p-4">
      <div className="text-xl font-extrabold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </Card>
  );
  return href ? (
    <Link href={href} className="transition-opacity hover:opacity-80">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const data = await getDashboardData();
  if (!data) redirect("/login");

  const locale = await getLocale();
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: process.env.DAILY_CHECK_IN_TIMEZONE || "Asia/Jakarta",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
  const greeting =
    hour < 12
      ? tt(locale, "dash.goodMorning")
      : hour < 17
        ? tt(locale, "dash.goodAfternoon")
        : tt(locale, "dash.goodEvening");

  return (
    <div className="space-y-5">
      {/* Greeting header */}
      <section className="aurora rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-center gap-4">
          {data.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.avatarUrl}
              alt=""
              className="h-14 w-14 rounded-2xl object-cover"
            />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent text-lg font-bold text-white">
              {initials(data.greetingName)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">
              {greeting}, {data.greetingName}.
            </h1>
            <p className="truncate text-sm text-muted">
              {data.companyName ? `${data.companyName} · ` : ""}
              {data.memberDays === 0
                ? tt(locale, "dash.memberForToday")
                : tt(locale, "dash.memberForDays", { n: data.memberDays })}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label={tt(locale, "dash.points")} value={data.points} href="/rewards" />
          <StatTile label={tt(locale, "dash.contacts")} value={data.contactCount} href="/contacts" />
          <StatTile label={tt(locale, "dash.checkinStreak")} value={`${data.checkin.streak}d`} />
          <StatTile label={tt(locale, "dash.newMessages")} value={data.unreadMessages} href="/chat" />
        </div>

        <ul className="mt-4 space-y-1 text-sm text-muted">
          <li>
            {data.checkin.checkedInToday ? (
              <span className="font-medium text-green-700">
                {tt(locale, "dash.checkedInToday", { n: data.checkin.todayPoints ?? 0 })}
              </span>
            ) : (
              tt(locale, "dash.checkinPending")
            )}
          </li>
          <li>{tt(locale, "dash.totalLoginDays", { n: data.totalLoginDays })}</li>
        </ul>
      </section>

      {/* Daily check-in */}
      <CheckInCard initial={data.checkin} />

      {/* Quick actions */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
          {tt(locale, "dash.quickActions")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.cardPath && (
            <Link
              href={data.cardPath}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-4 text-sm font-medium hover:bg-surface-2"
            >
              <Share2 className="h-5 w-5 text-brand-600" />
              {tt(locale, "dash.myNameCard")}
            </Link>
          )}
          <Link
            href="/discover"
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-4 text-sm font-medium hover:bg-surface-2"
          >
            <Sparkles className="h-5 w-5 text-brand-600" />
            {tt(locale, "dash.businessHub")}
          </Link>
          <Link
            href="/chat"
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-4 text-sm font-medium hover:bg-surface-2"
          >
            <MessageSquare className="h-5 w-5 text-brand-600" />
            {tt(locale, "dash.messages")}
          </Link>
          <Link
            href="/rewards"
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-4 text-sm font-medium hover:bg-surface-2"
          >
            <Users className="h-5 w-5 text-brand-600" />
            {tt(locale, "dash.rewards")}
          </Link>
        </div>
      </section>

      {/* Recommended for what you're looking for */}
      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">
          {tt(locale, "dash.recommended")}
        </h2>
        <p className="mb-2 text-xs text-muted">
          {tt(locale, "dash.recommendedHint")}
        </p>
        {data.suggestedMatches.length === 0 ? (
          <Card className="p-5 text-sm text-muted">
            {tt(locale, "dash.noRecommendations")}
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.suggestedMatches.map((m) => (
              <Link key={m.userId} href={`/u/${m.username}`}>
                <Card className="p-4 transition-opacity hover:opacity-85">
                  <div className="flex items-center gap-3">
                    {m.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                        {initials(m.name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{m.name}</p>
                      <p className="truncate text-xs text-muted">
                        {[m.jobTitle, m.companyName].filter(Boolean).join(" · ") ||
                          "BridgeX member"}
                      </p>
                    </div>
                  </div>
                  {m.matchedLookingFor.length > 0 ? (
                    <div className="mt-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        {tt(locale, "dash.canHelpWith")}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {m.matchedLookingFor.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700"
                          >
                            ✓ {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs font-medium text-brand-700">
                      {tt(locale, "dash.sharedInterests", { n: m.sharedInterests })}
                    </p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent connections */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {tt(locale, "dash.recentConnections")}
          </h2>
          <Link href="/contacts" className="text-xs font-medium text-primary">
            {tt(locale, "dash.viewAll")} <ArrowRight className="inline h-3 w-3" />
          </Link>
        </div>
        {data.recentConnections.length === 0 ? (
          <Card className="p-5 text-sm text-muted">
            {tt(locale, "dash.noContactsYet")}
          </Card>
        ) : (
          <div className="space-y-2">
            {data.recentConnections.map((c) => (
              <Link
                key={c.id}
                href={`/u/${c.username}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 hover:bg-surface-2"
              >
                {c.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                    {initials(c.name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="truncate text-xs text-muted">{c.companyName ?? ""}</p>
                </div>
                <span className="text-xs text-muted">
                  {new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(
                    c.addedAt,
                  )}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Events & follow-ups */}
      <section className="grid gap-3 sm:grid-cols-2">
        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="h-4 w-4 text-brand-600" /> {tt(locale, "dash.upcomingEvents")}
          </h3>
          <p className="mt-2 text-sm text-muted">
            {tt(locale, "dash.eventsHint")}
          </p>
        </Card>
        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <BellRing className="h-4 w-4 text-amber-500" /> {tt(locale, "dash.followUps")}
          </h3>
          {data.followUps.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{tt(locale, "dash.allCaughtUp")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.followUps.map((f) => (
                <li key={f.contactId} className="flex items-center gap-3">
                  {f.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                      {initials(f.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link href={`/u/${f.username}`} className="truncate text-sm font-medium hover:text-primary">
                      {f.name}
                    </Link>
                    <p className="text-xs text-amber-700">
                      {tt(locale, "dash.waitingDays", { n: f.daysWaiting })}
                    </p>
                  </div>
                  <FollowUpButton contactId={f.contactId} username={f.username} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Network growth */}
      <section>
        <Card className="p-5">
          <h3 className="text-sm font-semibold">{tt(locale, "dash.networkGrowth")}</h3>
          <p className="mt-2 text-sm text-muted">
            {data.referralCount === 0
              ? tt(locale, "dash.growthZero")
              : tt(locale, "dash.growthCount", { n: data.referralCount })}
          </p>
          {data.referredUsers.length > 0 && (
            <ul className="mt-3 space-y-2">
              {data.referredUsers.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/u/${u.username}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5 hover:bg-surface-2"
                  >
                    {u.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                        {initials(u.name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{u.name}</p>
                      <p className="truncate text-xs text-muted">{u.companyName ?? "Bridge Member"}</p>
                    </div>
                    <span className="text-xs text-muted">
                      {new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(u.joinedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/referrals"
            className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-primary transition-colors hover:bg-surface-2"
          >
            {tt(locale, "dash.referAndEarn")} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>
      </section>
    </div>
  );
}