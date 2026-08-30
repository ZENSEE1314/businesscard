import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Matches" };

interface MatchRow {
  userId: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  headline: string | null;
  jobTitle: string | null;
  companyName: string | null;
  isBusiness: boolean;
  matchedOn: string[];
}

export default async function MatchesPage() {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");

  const viewerProfile = await prisma.profile.findUnique({
    where: { userId: viewer.id },
    select: { canHelp: true, lookingFor: true },
  });
  const viewingCanHelp = viewerProfile?.canHelp ?? [];
  const viewingLookingFor = viewerProfile?.lookingFor ?? [];

  const [people, businesses] = await Promise.all([
    prisma.profile.findMany({
      where: {
        userId: { not: viewer.id },
        user: { status: "ACTIVE" },
        OR: [
          ...(viewingCanHelp.length > 0 ? [{ lookingFor: { hasSome: viewingCanHelp } }] : []),
          ...(viewingLookingFor.length > 0 ? [{ canHelp: { hasSome: viewingLookingFor } }] : []),
        ],
      },
      take: 30,
      select: {
        userId: true,
        fullName: true,
        username: true,
        avatarUrl: true,
        headline: true,
        jobTitle: true,
        companyName: true,
        canHelp: true,
        lookingFor: true,
      },
    }),
    prisma.businessProfile.findMany({
      where: {
        user: { status: "ACTIVE", id: { not: viewer.id } },
        OR: [
          ...(viewingCanHelp.length > 0 ? [{ lookingFor: { hasSome: viewingCanHelp } }] : []),
          ...(viewingLookingFor.length > 0 ? [{ canHelp: { hasSome: viewingLookingFor } }] : []),
        ],
      },
      take: 30,
      select: {
        userId: true,
        name: true,
        slug: true,
        logoUrl: true,
        headline: true,
        canHelp: true,
        lookingFor: true,
        user: { select: { profile: { select: { username: true } } } },
      },
    }),
  ]);

  const matchSets: MatchRow[] = [
    ...people.map((p): MatchRow => ({
      userId: p.userId,
      name: p.fullName,
      username: p.username,
      avatarUrl: p.avatarUrl,
      headline: p.headline,
      jobTitle: p.jobTitle,
      companyName: p.companyName,
      isBusiness: false,
      matchedOn: [
        ...viewingCanHelp.filter((t) => p.lookingFor.includes(t)).map((t) => `${t} ← you offer this`),
        ...viewingLookingFor.filter((t) => p.canHelp.includes(t)).map((t) => `${t} ← you need this`),
      ],
    })),
    ...businesses.map((b): MatchRow => ({
      userId: b.userId,
      name: b.name,
      username: b.user.profile?.username ?? b.slug,
      avatarUrl: b.logoUrl,
      headline: b.headline,
      jobTitle: null,
      companyName: null,
      isBusiness: true,
      matchedOn: [
        ...viewingCanHelp.filter((t) => b.lookingFor.includes(t)).map((t) => `${t} ← you offer this`),
        ...viewingLookingFor.filter((t) => b.canHelp.includes(t)).map((t) => `${t} ← you need this`),
      ],
    })),
  ].sort((a, b) => b.matchedOn.length - a.matchedOn.length);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 py-4">
      <div className="px-1">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Sparkles className="h-5 w-5 text-brand-600" /> Matches
        </h1>
        <p className="mt-1 text-sm text-muted">
          We pair what you offer with what people need — and who can help with
          what you&apos;re looking for.
        </p>
      </div>

      {matchSets.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">
          No matches yet. Add what you offer and what you&apos;re looking for to
          your profile to unlock suggestions.
        </Card>
      ) : (
        matchSets.map((m) => (
          <Card key={m.userId} className="p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-50 text-brand-700">
                {m.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  m.name.charAt(0)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-semibold">{m.name}</span>
                  <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted">
                    {m.isBusiness ? "Business" : "Member"}
                  </span>
                </div>
                <p className="truncate text-xs text-muted">
                  {m.headline ?? m.jobTitle ?? m.companyName ?? ""}
                </p>
              </div>
              {m.username && (
                <Link
                  href={`/chat?with=${encodeURIComponent(m.username)}`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-surface-2"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Message
                </Link>
              )}
            </div>
            {m.matchedOn.length > 0 && (
              <ul className="mt-3 space-y-1">
                {m.matchedOn.map((h) => (
                  <li key={h} className="rounded-lg bg-brand-50 px-2 py-1 text-xs text-brand-700">
                    {h}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
