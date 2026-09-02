import "server-only";
import { prisma } from "@/lib/db/prisma";
import { dailyMatchCount, pickDailyMatches, todayMatchKey } from "@/lib/matches";
import type { MembershipTier } from "@prisma/client";

// Daily business matches — the SAME deterministic daily pick powers both the
// /matches swipe deck and the dashboard card, so a member sees the same people
// in both places for a given day. The deck reshuffles at local midnight
// (Asia/Jakarta) and previously-matched members can reappear (follow-ups).
//
// Daily quota by tier: Bridge Member 1 · BridgeMaker 2 · BridgeMaster 3.

export interface DailyMatch {
  userId: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  subtitle: string | null;
  about: string | null;
  isBusiness: boolean;
  canHelp: string[];
  lookingFor: string[];
  matchedOn: string[];
}

export async function getDailyMatches(
  viewerId: string,
  tier: MembershipTier | null | undefined,
): Promise<{ matches: DailyMatch[]; quota: number }> {
  const quota = dailyMatchCount(tier);
  const dayKey = todayMatchKey();

  const viewerProfile = await prisma.profile.findUnique({
    where: { userId: viewerId },
    select: { canHelp: true, lookingFor: true },
  });
  const myCanHelp = viewerProfile?.canHelp ?? [];
  const myLookingFor = viewerProfile?.lookingFor ?? [];

  const people = await prisma.profile.findMany({
    where: {
      userId: { not: viewerId },
      user: { status: "ACTIVE" },
    },
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

  const candidates: DailyMatch[] = people
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
    });

  const matches = pickDailyMatches(candidates, `${viewerId}:${dayKey}`, quota)
    // Within today's pick, show tag matches first.
    .sort((a, b) => b.matchedOn.length - a.matchedOn.length);

  return { matches, quota };
}