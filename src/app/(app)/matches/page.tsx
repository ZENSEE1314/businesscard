import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getLocale, tt } from "@/lib/i18n/server";
import { SwipeDeck } from "@/features/matches/swipe-deck";
import { getDailyMatches } from "@/features/matches/daily";
import { FREE_TIER_LABEL } from "@/lib/membership";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Matches" };

export default async function MatchesPage() {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");
  const locale = await getLocale();

  // Daily matches: every member gets a fresh, random set each day. The pick
  // is deterministic for (viewer, day) so reloading shows the same people,
  // but the deck reshuffles at midnight. Previously matched members (even
  // saved contacts) CAN appear again — matching again is how follow-ups
  // happen. Tag matches are surfaced to the front within the daily pick.
  // The SAME daily pick also powers the dashboard card.
  const { matches: dailyPicks, quota } = await getDailyMatches(
    viewer.id,
    viewer.membershipTier,
  );

  const tierLabel =
    viewer.membershipTier === "BRIDGEMASTER"
      ? "BridgeMaster"
      : viewer.membershipTier === "BRIDGEMAKER"
        ? "BridgeMaker"
        : FREE_TIER_LABEL;

  return (
    <div className="mx-auto w-full max-w-md py-4">
      <div className="px-1 pb-3">
        <h1 className="text-xl font-bold">{tt(locale, "matches.title")}</h1>
        <p className="mt-1 text-sm text-muted">{tt(locale, "matches.swipeHint")}</p>
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand-600" />
            {tt(locale, "matches.dailyNote", { n: quota })}
          </p>
          <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
            {tierLabel}
          </span>
        </div>
        {quota < 3 && (
          <p className="mt-2 text-center text-xs text-muted">
            <Link href="/membership" className="font-medium text-brand-700 underline">
              {tt(locale, "matches.upgradeForMore")}
            </Link>
          </p>
        )}
      </div>

      <SwipeDeck
        candidates={dailyPicks}
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
