import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getLocale, tt } from "@/lib/i18n/server";
import { SwipeDeck, type SwipeCandidate } from "@/features/matches/swipe-deck";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Matches" };

export default async function MatchesPage() {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");
  const locale = await getLocale();

  const viewerProfile = await prisma.profile.findUnique({
    where: { userId: viewer.id },
    select: { canHelp: true, lookingFor: true },
  });
  const myCanHelp = viewerProfile?.canHelp ?? [];
  const myLookingFor = viewerProfile?.lookingFor ?? [];

  // Every other active member the viewer has NOT already saved as a contact.
  const people = await prisma.profile.findMany({
    where: {
      userId: { not: viewer.id },
      user: {
        status: "ACTIVE",
        contactsSaved: { none: { ownerUserId: viewer.id } },
      },
    },
    take: 80,
    orderBy: { createdAt: "desc" },
    select: {
      userId: true,
      fullName: true,
      displayName: true,
      username: true,
      avatarUrl: true,
      headline: true,
      jobTitle: true,
      companyName: true,
      city: true,
      country: true,
      canHelp: true,
      lookingFor: true,
      whoIAm: true,
      user: { select: { role: true } },
    },
  });

  const candidates: SwipeCandidate[] = people
    .filter((p) => p.username)
    .map((p) => {
      const matchedOn = [
        ...myCanHelp.filter((t) => p.lookingFor.includes(t)),
        ...myLookingFor.filter((t) => p.canHelp.includes(t)),
      ];
      return {
        userId: p.userId,
        username: p.username as string,
        name: p.displayName || p.fullName,
        avatarUrl: p.avatarUrl,
        subtitle:
          p.headline ||
          [p.jobTitle, p.companyName].filter(Boolean).join(" · ") ||
          [p.city, p.country].filter(Boolean).join(", ") ||
          null,
        about: p.whoIAm,
        isBusiness: p.user.role === "BUSINESS",
        canHelp: p.canHelp.slice(0, 6),
        lookingFor: p.lookingFor.slice(0, 6),
        matchedOn: Array.from(new Set(matchedOn)).slice(0, 6),
      };
    })
    // Surface tag matches first, keeping newest order within each group.
    .sort((a, b) => b.matchedOn.length - a.matchedOn.length);

  return (
    <div className="mx-auto w-full max-w-md py-4">
      <div className="px-1 pb-3">
        <h1 className="text-xl font-bold">{tt(locale, "matches.title")}</h1>
        <p className="mt-1 text-sm text-muted">{tt(locale, "matches.swipeHint")}</p>
      </div>

      <SwipeDeck
        candidates={candidates}
        labels={{
          empty: tt(locale, "matches.empty"),
          pass: tt(locale, "matches.pass"),
          connect: tt(locale, "matches.connect"),
          connected: tt(locale, "matches.connected"),
          message: tt(locale, "generic.message"),
          canHelp: tt(locale, "dash.canHelpWith"),
          lookingFor: tt(locale, "matches.lookingFor"),
          matchTag: tt(locale, "matches.matchTag"),
        }}
      />
    </div>
  );
}
