import Link from "next/link";
import { Search, BadgeCheck } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

interface Result {
  name: string;
  path: string;
  subtitle: string | null;
  headline: string | null;
  logoUrl: string | null;
  canHelp: string[];
  lookingFor: string[];
  verified: boolean;
  isBusiness: boolean;
}

function contains(q: string) {
  return { contains: q, mode: "insensitive" as const };
}

async function searchAll(q: string): Promise<Result[]> {
  const [people, businesses] = await Promise.all([
    prisma.profile.findMany({
      where: {
        user: { status: "ACTIVE" },
        OR: [
          { fullName: contains(q) },
          { username: contains(q) },
          { headline: contains(q) },
          { companyName: contains(q) },
          { jobTitle: contains(q) },
        ],
      },
      take: 20,
      select: {
        username: true,
        fullName: true,
        jobTitle: true,
        headline: true,
        avatarUrl: true,
        canHelp: true,
        lookingFor: true,
      },
    }),
    prisma.businessProfile.findMany({
      where: {
        user: { status: "ACTIVE" },
        OR: [
          { name: contains(q) },
          { headline: contains(q) },
          { description: contains(q) },
        ],
      },
      take: 20,
      select: {
        slug: true,
        name: true,
        headline: true,
        logoUrl: true,
        verification: true,
        canHelp: true,
        lookingFor: true,
        category: { select: { name: true } },
      },
    }),
  ]);

  const b: Result[] = businesses.map((x) => ({
    name: x.name,
    path: `/business/${x.slug}`,
    subtitle: x.category?.name ?? "Business",
    headline: x.headline,
    logoUrl: x.logoUrl,
    canHelp: x.canHelp,
    lookingFor: x.lookingFor,
    verified: x.verification === "VERIFIED",
    isBusiness: true,
  }));
  const p: Result[] = people.map((x) => ({
    name: x.fullName,
    path: `/u/${x.username}`,
    subtitle: x.jobTitle,
    headline: x.headline,
    logoUrl: x.avatarUrl,
    canHelp: x.canHelp,
    lookingFor: x.lookingFor,
    verified: false,
    isBusiness: false,
  }));
  return [...b, ...p];
}

const SUGGESTIONS = [
  "Investor",
  "Distributor",
  "Manufacturer",
  "Marketing",
  "Technology",
  "F&B",
];

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const results = query ? await searchAll(query) : [];

  return (
    <div className="mx-auto max-w-2xl py-4">
      <div className="mb-3 px-1">
        <h1 className="text-xl font-bold">Discover</h1>
        <p className="text-sm text-muted">
          Find people, businesses and opportunities — search what you need.
        </p>
      </div>

      <form action="/discover" method="get" className="mb-3">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3">
          <Search className="h-4 w-4 text-muted" />
          <input
            name="q"
            defaultValue={query}
            placeholder="e.g. distributor, investor, marketing, F&B…"
            className="h-11 w-full bg-transparent text-sm outline-none"
          />
        </div>
      </form>

      {!query && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <Link
              key={s}
              href={`/discover?q=${encodeURIComponent(s)}`}
              className="rounded-full border border-border px-3 py-1.5 text-sm hover:bg-surface-2"
            >
              {s}
            </Link>
          ))}
        </div>
      )}

      {query && results.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
          No matches for “{query}”.
        </div>
      )}

      <div className="space-y-3">
        {results.map((r) => (
          <Link key={r.path} href={r.path}>
            <Card className="p-4 hover:bg-surface-2">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-50 text-brand-700">
                  {r.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    r.name.charAt(0)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-semibold">{r.name}</span>
                    {r.verified && <BadgeCheck className="h-4 w-4 text-blue-500" />}
                    <span className="ml-1 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted">
                      {r.isBusiness ? "Business" : "Member"}
                    </span>
                  </div>
                  <div className="truncate text-xs text-muted">
                    {r.headline ?? r.subtitle ?? ""}
                  </div>
                </div>
              </div>
              {(r.canHelp.length > 0 || r.lookingFor.length > 0) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.canHelp.slice(0, 3).map((t) => (
                    <span key={`h${t}`} className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                      ✓ {t}
                    </span>
                  ))}
                  {r.lookingFor.slice(0, 3).map((t) => (
                    <span key={`l${t}`} className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      🔍 {t}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
