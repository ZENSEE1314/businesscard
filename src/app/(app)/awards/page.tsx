import Link from "next/link";
import { Trophy, BadgeCheck } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AwardsPage() {
  const awards = await prisma.award.findMany({
    where: { active: true },
    orderBy: [{ featured: "desc" }, { year: "desc" }],
    include: {
      recipients: {
        include: {
          businessProfile: {
            select: { slug: true, name: true, verification: true },
          },
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 sm:px-4">
      <h1 className="px-1 pb-3 text-xl font-bold">Business Awards</h1>

      {awards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
          No awards yet.
        </div>
      ) : (
        <div className="space-y-4">
          {awards.map((award) => (
            <Card key={award.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-600">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">
                    {award.name}
                    {award.year ? ` ${award.year}` : ""}
                  </h3>
                  {award.description && (
                    <p className="text-sm text-muted">{award.description}</p>
                  )}
                </div>
              </div>

              {award.recipients.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                  {award.recipients.map((rec) =>
                    rec.businessProfile ? (
                      <Link
                        key={rec.id}
                        href={`/business/${rec.businessProfile.slug}`}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2"
                      >
                        <span className="font-medium">🏆 {rec.businessProfile.name}</span>
                        {rec.businessProfile.verification === "VERIFIED" && (
                          <BadgeCheck className="h-4 w-4 text-blue-500" />
                        )}
                      </Link>
                    ) : null,
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
