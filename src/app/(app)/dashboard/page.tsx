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
  Eye,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDashboardData } from "@/features/dashboard/queries";
import { getLocale, tt } from "@/lib/i18n/server";
import { CheckInCard } from "@/components/checkin-card";
import { FollowUpButton } from "@/components/follow-up-button";
import { MissionsCard } from "@/features/missions/missions-card";
import { getMissionBoard } from "@/lib/missions";
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

  const [data, missionBoard] = await Promise.all([
    getDashboardData(),
    getMissionBoard(user.id),
  ]);
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

      {/* Weekly networking missions */}
      <MissionsCard board={missionBoard} />

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

      {/* Today's daily business matches — same pick as the /matches deck */}
      <section>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {tt(locale, "dash.todaysMatches")}
          </h2>
          <Link href="/matches" className="text-xs font-medium text-primary">
            {tt(locale, "dash.openDeck")} <ArrowRight className="inline h-3 w-3" />
          </Link>
        </div>
        <p className="mb-2 text-xs text-muted">
          {tt(locale, "dash.todaysMatchesHint", { n: data.dailyMatchQuota })}
        </p>
        {data.dailyMatches.length === 0 ? (
          <Card className="p-5 text-sm text-muted">{tt(locale, "dash.noMatchesYet")}</Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.dailyMatches.map((m) => (
              <Card key={m.userId} className="p-4">
                <div className="flex items-center gap-3">
                  {m.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                      {initials(m.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/u/${m.username}`}
                      className="block truncate text-sm font-medium hover:text-primary"
                    >
                      {m.name}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {m.subtitle ?? (m.isBusiness ? "Business member" : "BridgeX member")}
                    </p>
                  </div>
                </div>
                {m.matchedOn.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.matchedOn.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700"
                      >
                        ✓ {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/u/${m.username}`}
                    className="flex h-8 flex-1 items-center justify-center rounded-lg border border-border text-xs font-semibold text-primary transition-colors hover:bg-surface-2"
                  >
                    {tt(locale, "dash.viewCard")}
                  </Link>
                  <Link
                    href={`/chat?with=${encodeURIComponent(m.username)}`}
                    className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-brand-600 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {tt(locale, "dash.messageCta")}
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
        {data.dailyMatchQuota < 3 && (
          <p className="mt-2 text-center text-xs text-muted">
            <Link href="/membership" className="font-medium text-brand-700 underline">
              {tt(locale, "dash.matchesUpgrade")}
            </Link>
          </p>
        )}
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

      {/* Who viewed my card — real ProfileView / contact-save analytics */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted">
          <Eye className="h-4 w-4" /> {tt(locale, "dash.whoViewed")}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <StatTile label={tt(locale, "dash.totalViews")} value={data.cardStats.totalViews} />
          <StatTile
            label={tt(locale, "dash.newViewers")}
            value={data.cardStats.newViewersLast7Days}
          />
          <StatTile
            label={tt(locale, "dash.contactSaves")}
            value={data.cardStats.totalContactSaves}
          />
        </div>
        {data.cardStats.totalViews === 0 ? (
          <Card className="mt-3 p-5 text-sm text-muted">
            {tt(locale, "dash.noViewsYet")}
          </Card>
        ) : (
          <Card className="mt-3 p-5">
            <h3 className="text-sm font-semibold">{tt(locale, "dash.recentViewers")}</h3>
            <ul className="mt-3 divide-y divide-border">
              {data.cardStats.recentViewers.slice(0, 5).map((v, i) => (
                <li key={`${v.username ?? "anon"}-${i}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  {v.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                      {v.name ? initials(v.name) : "👤"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    {v.username ? (
                      <Link
                        href={`/u/${v.username}`}
                        className="block truncate text-sm font-medium hover:text-primary"
                      >
                        {v.name ?? "BridgeX member"}
                      </Link>
                    ) : (
                      <p className="truncate text-sm font-medium">
                        {v.name ?? tt(locale, "dash.anonymousViewer")}
                      </p>
                    )}
                    <p className="truncate text-xs text-muted">{v.companyName ?? ""}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">
                    {new Intl.DateTimeFormat("en", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(v.at)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
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