import type { MembershipTier } from "@prisma/client";

export type Tier = MembershipTier;

export interface TierConfig {
  tier: Tier;
  label: string;
  priceIdr: number;
  tagline: string;
  tiktokAds: number;
  webAds: number;
  magazine: "none" | "small" | "full";
  networkingFree: boolean;
  galaMonthlyFree: boolean;
  grandGalaTable: boolean;
  benefits: string[];
  highlighted?: boolean;
}

// BridgeX membership program.
//
//   Free            → no membership row (membershipTier = null)  "BridgeX Member"
//   BRIDGEMAKER     → second tier (first paid tier)              "BridgeMaker"
//   BRIDGEMASTER    → advanced tier                              "BridgeMaster"
//
// Annual fee in Indonesian Rupiah. Benefits mirror the Member Club program
// (name card, TikTok/web ads, magazine, networking, gala) plus marketplace
// posting for paid members.
export const MEMBERSHIP_TIERS: Record<Tier, TierConfig> = {
  BRIDGEMAKER: {
    tier: "BRIDGEMAKER",
    label: "BridgeMaker",
    priceIdr: 5_000_000,
    tagline: "Get your business online and seen.",
    tiktokAds: 3,
    webAds: 10,
    magazine: "none",
    networkingFree: false,
    galaMonthlyFree: false,
    grandGalaTable: false,
    benefits: [
      "Free digital name card",
      "3× TikTok ad features",
      "10× website ad placements",
      "Marketplace listing — post products & services",
      "Business profile & Hub posting",
    ],
  },
  BRIDGEMASTER: {
    tier: "BRIDGEMASTER",
    label: "BridgeMaster",
    priceIdr: 25_000_000,
    tagline: "The full Member Club experience.",
    tiktokAds: 5,
    webAds: 20,
    magazine: "full",
    networkingFree: true,
    galaMonthlyFree: true,
    grandGalaTable: false,
    highlighted: true,
    benefits: [
      "Everything in BridgeMaker",
      "Free digital name card",
      "5× TikTok ad features",
      "20× website ad placements",
      "Magazine — full page",
      "Free weekly business networking",
      "Free monthly members gala dinner",
      "Priority marketplace placement",
      "Business profile & Hub posting",
    ],
  },
};

export const TIER_ORDER: Tier[] = ["BRIDGEMAKER", "BRIDGEMASTER"];

export function getTierConfig(tier: Tier): TierConfig {
  return MEMBERSHIP_TIERS[tier];
}

// Indonesian Rupiah formatting: "Rp 5.000.000".
export function formatIdr(amount: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`;
}

const MEMBERSHIP_DURATION_MS = 365 * 24 * 60 * 60 * 1000;

export function membershipExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + MEMBERSHIP_DURATION_MS);
}
