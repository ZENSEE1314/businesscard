import Link from "next/link";
import { Trophy, BadgeCheck, ChevronRight, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

interface RecipientView {
  id: string;
  rank: number | null;
  name: string;
  logoUrl: string | null;
  href: string;
  subtitle: string | null;
  verified: boolean;
}

export default async function AwardsPage() {
  const awards = await prisma.award.findMany({
    where: { active: true },
    orderBy: [{ featured: "desc" }, { year: "desc" }],
    include: {
      recipients: {
        orderBy: { rank: "asc" },
        include: {
          businessProfile: {
            select: {
              slug: true,
              name: true,
              logoUrl: true,
              verification: true,
              category: { select: { name: true } },
              city: true,
            },
          },
          user: {
            select: {
              profile: {
                select: {
                  username: true,
                  fullName: true,
                  avatarUrl: true,
                  jobTitle: true,
                },
              },
            },
          },
        },
      },
    },
  });

  function toView(rec: (typeof awards)[number]["recipients"][number]): RecipientView | null {
    if (rec.businessProfile) {
      const b = rec.businessProfile;
      return {
        id: rec.id,
        rank: rec.rank,
        name: b.name,
        logoUrl: b.logoUrl,
        href: `/business/${b.slug}`,
        subtitle: [b.category?.name, b.city].filter(Boolean).join(" · ") || null,
        verified: b.verification === "VERIFIED",
      };
    }
    if (rec.user?.profile) {
      const p = rec.user.profile;
      return {
        id: rec.id,
        rank: rec.rank,
        name: p.fullName,
        logoUrl: p.avatarUrl,
        href: `/u/${p.username}`,
        subtitle: p.jobTitle,
        verified: false,
      };
    }
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 sm:px-4">
            <div className="mb-4 px-1">
        <h1 className="text-xl font-bold">Awards</h1>
        <p className="text-sm text-muted">
          Recognising the best of the Member Club.
        </p>
        <Link
          href="/events"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
        >
          <CalendarDays className="h-4 w-4" />
          See upcoming community events →
        </Link>
      </div>

      {awards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
          No awards yet.
        </div>
      ) : (
        <div className="space-y-5">
          {awards.map((award) => {
            const winners = award.recipients
              .map(toView)
              .filter((r): r is RecipientView => r !== null);
            return (
              <Card key={award.id} className="overflow-hidden">
                <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-amber-50 to-transparent p-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-amber-100 text-amber-600">
                    {award.badgeUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={award.badgeUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Trophy className="h-6 w-6" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold">
                      {award.name}
                      {award.year ? ` ${award.year}` : ""}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      {award.category && <span>{award.category}</span>}
                      {award.featured && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
                          Featured
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {award.description && (
                  <p className="px-4 pt-3 text-sm text-muted">{award.description}</p>
                )}

                {winners.length > 0 ? (
                  <div className="space-y-2 p-3">
                    {winners.map((rec) => (
                      <Link
                        key={rec.id}
                        href={rec.href}
                        className="flex items-center gap-3 rounded-xl border border-border p-2.5 hover:bg-surface-2"
                      >
                        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-brand-50 text-brand-700">
                          {rec.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={rec.logoUrl} alt={rec.name} className="h-full w-full object-cover" />
                          ) : (
                            <Trophy className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {rec.rank ? (
                              <span className="text-sm font-bold text-amber-600">#{rec.rank}</span>
                            ) : null}
                            <span className="truncate font-semibold">{rec.name}</span>
                            {rec.verified && <BadgeCheck className="h-4 w-4 text-blue-500" />}
                          </div>
                          {rec.subtitle && (
                            <div className="text-xs text-muted">{rec.subtitle}</div>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="p-4 text-sm text-muted">Winners to be announced.</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
