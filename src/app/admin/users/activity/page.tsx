import type { Metadata } from "next";
import Link from "next/link";
import { Download, Search } from "lucide-react";
import { queryActivityRows, activitySummary } from "@/features/admin/activity";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "User Activity" };

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-amber-100 text-amber-700",
  DORMANT: "bg-red-100 text-red-700",
  NEW: "bg-blue-100 text-blue-700",
};

/** Friendly package name. Free accounts are always "Bridge Member". */
function tierName(t: string | null): string {
  if (t === "BRIDGEMAKER") return "BridgeMaker";
  if (t === "BRIDGEMASTER") return "BridgeMaster";
  return "Bridge Member";
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const filters = {
    search: sp.q ?? "",
    status: (sp.status ?? "") as "" | "ACTIVE" | "INACTIVE" | "DORMANT" | "NEW",
    tier: (sp.tier ?? "") as "" | "BRIDGEMAKER" | "BRIDGEMASTER",
    joinedWithinDays: sp.joined ? Number(sp.joined) : undefined,
    loginRecencyDays: sp.loginRecency !== undefined && sp.loginRecency !== "" ? Number(sp.loginRecency) : undefined,
    sort: (sp.sort ?? "recent_login") as
      | "recent_login"
      | "oldest_login"
      | "newest"
      | "points",
    page,
    pageSize: 25,
  };

  const [{ rows, total, pageSize }, summary] = await Promise.all([
    queryActivityRows(filters),
    activitySummary(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const baseQs = new URLSearchParams(
    Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][],
  );
  const pageHref = (p: number) => {
    const qs = new URLSearchParams(baseQs);
    qs.set("page", String(p));
    return `/admin/users/activity?${qs.toString()}`;
  };
  const exportQs = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => v) as [string, string][],
  ).toString();

  const summaryTiles = [
    { label: "Total users", value: summary.totalUsers },
    { label: "Active", value: summary.activeUsers },
    { label: "Inactive", value: summary.inactiveUsers },
    { label: "Dormant", value: summary.dormantUsers },
    { label: "Logged in today", value: summary.loggedInToday },
    { label: "New this week", value: summary.newThisWeek },
    { label: "Avg streak", value: summary.avgLoginStreak },
    { label: "Check-in pts awarded", value: summary.checkinPointsAwardedTotal },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">User Activity Monitoring</h1>
        <a
          href={`/api/admin/users/activity?format=csv&${exportQs}`}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium hover:bg-surface-2"
        >
          <Download className="h-4 w-4" /> Export CSV
        </a>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summaryTiles.map((t) => (
          <Card key={t.label} className="p-4">
            <div className="text-xl font-extrabold">{t.value}</div>
            <div className="text-xs text-muted">{t.label}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <form className="flex flex-col gap-2 lg:flex-row" role="search">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            name="q"
            defaultValue={filters.search}
            placeholder="Search name, email, company, username…"
            aria-label="Search users"
            className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <select name="status" defaultValue={filters.status} aria-label="Filter by activity" className="h-10 rounded-xl border border-border bg-surface px-3 text-sm">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="DORMANT">Dormant</option>
          <option value="NEW">New</option>
        </select>
        <select name="tier" defaultValue={filters.tier} aria-label="Filter by tier" className="h-10 rounded-xl border border-border bg-surface px-3 text-sm">
          <option value="">All tiers</option>
          <option value="BRIDGEMAKER">BridgeMaker</option>
          <option value="BRIDGEMASTER">BridgeMaster</option>
        </select>
        <select name="sort" defaultValue={filters.sort} aria-label="Sort" className="h-10 rounded-xl border border-border bg-surface px-3 text-sm">
          <option value="recent_login">Most recent login</option>
          <option value="oldest_login">Least recent login</option>
          <option value="newest">Newest members</option>
          <option value="points">Most points</option>
        </select>
        <button type="submit" className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg">
          Apply
        </button>
      </form>

      {/* Table (responsive: cards on mobile, table on desktop) */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pr-3">Member</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Tier</th>
              <th className="px-3 py-2">Joined</th>
              <th className="px-3 py-2">Last login</th>
              <th className="px-3 py-2">Login days</th>
              <th className="px-3 py-2">Streak</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Points</th>
              <th className="px-3 py-2">Contacts</th>
              <th className="px-3 py-2">Referrals</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60">
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    {r.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700">
                        {initials(r.fullName)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.fullName}</p>
                      <p className="truncate text-xs text-muted">{r.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">{r.companyName ?? "—"}</td>
                <td className="px-3 py-2.5">{tierName(r.membershipTier)}</td>
                <td className="px-3 py-2.5" title={r.createdAt.toISOString()}>
                  {r.memberDays}d ago
                </td>
                <td className="px-3 py-2.5">
                  {r.daysSinceLogin === null ? "Never" : `${r.daysSinceLogin}d ago`}
                </td>
                <td className="px-3 py-2.5">{r.totalLoginDays}</td>
                <td className="px-3 py-2.5">{r.loginStreak}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[r.activityStatus]}`}>
                    {r.activityStatus}
                  </span>
                </td>
                <td className="px-3 py-2.5">{r.points}</td>
                <td className="px-3 py-2.5">{r.contactCount}</td>
                <td className="px-3 py-2.5">{r.referralCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <ul className="space-y-2 md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                {r.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                    {initials(r.fullName)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.fullName}</p>
                  <p className="truncate text-xs text-muted">{r.email}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[r.activityStatus]}`}>
                  {r.activityStatus}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div><dt className="text-muted">Joined</dt><dd>{r.memberDays}d ago</dd></div>
                <div><dt className="text-muted">Last login</dt><dd>{r.daysSinceLogin === null ? "Never" : `${r.daysSinceLogin}d`}</dd></div>
                <div><dt className="text-muted">Points</dt><dd>{r.points}</dd></div>
                <div><dt className="text-muted">Login days</dt><dd>{r.totalLoginDays}</dd></div>
                <div><dt className="text-muted">Streak</dt><dd>{r.loginStreak}</dd></div>
                <div><dt className="text-muted">Contacts</dt><dd>{r.contactCount}</dd></div>
              </dl>
            </Card>
          </li>
        ))}
      </ul>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">
          Page {page} of {totalPages} · {total} users
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={pageHref(page - 1)}
              className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface-2"
            >
              Previous
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={pageHref(page + 1)}
              className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface-2"
            >
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}