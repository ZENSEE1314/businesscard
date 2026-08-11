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

// Member Club tiers. Annual fee in Indonesian Rupiah. Benefits mirror the
// Member Club program (name card, TikTok/web ads, magazine, networking, gala).
export const MEMBERSHIP_TIERS: Record<Tier, TierConfig> = {
  BASIC: {
    tier: "BASIC",
    label: "Basic",
    priceIdr: 5_000_000,
    tagline: "Get your business online and seen.",
    tiktokAds: 1,
    webAds: 3,
    magazine: "none",
    networkingFree: false,
    galaMonthlyFree: false,
    grandGalaTable: false,
    benefits: [
      "Free digital name card",
      "1× TikTok ad feature",
      "3× website ad placements",
      "Business profile & feed posting",
    ],
  },
  GOLD: {
    tier: "GOLD",
    label: "Gold",
    priceIdr: 25_000_000,
    tagline: "Grow your reach and network.",
    tiktokAds: 5,
    webAds: 10,
    magazine: "small",
    networkingFree: true,
    galaMonthlyFree: false,
    grandGalaTable: false,
    highlighted: true,
    benefits: [
      "Free digital name card",
      "5× TikTok ad features",
      "10× website ad placements",
      "Magazine — small page",
      "Free weekly business networking",
      "Business profile & feed posting",
    ],
  },
  DIAMOND: {
    tier: "DIAMOND",
    label: "Diamond",
    priceIdr: 100_000_000,
    tagline: "The full Member Club experience.",
    tiktokAds: 5,
    webAds: 10,
    magazine: "full",
    networkingFree: true,
    galaMonthlyFree: true,
    grandGalaTable: true,
    benefits: [
      "Free digital name card",
      "5× TikTok ad features",
      "10× website ad placements",
      "Magazine — full page",
      "Free weekly business networking",
      "Free monthly members gala dinner",
      "Grand gala dinner — 1 free table (10 pax)",
      "Business profile & feed posting",
    ],
  },
};

export const TIER_ORDER: Tier[] = ["BASIC", "GOLD", "DIAMOND"];

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
