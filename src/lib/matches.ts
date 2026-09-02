import "server-only";
import { localDateKey } from "@/lib/time";
import type { MembershipTier } from "@prisma/client";

// ---------------------------------------------------------------------------
// Daily business matches. Every member gets a fresh set of random profiles
// each day (Asia/Jakarta local). The pick is deterministic for (userId, day)
// so refreshes during the day show the same set, but it changes every day and
// can include members they matched before (follow-ups).
//
// Daily match quota by tier:
//   Bridge Member (free)  → 1 match/day
//   BridgeMaker           → 2 matches/day
//   BridgeMaster          → 3 matches/day
// ---------------------------------------------------------------------------

export function dailyMatchCount(tier: MembershipTier | null | undefined): number {
  if (tier === "BRIDGEMASTER") return 3;
  if (tier === "BRIDGEMAKER") return 2;
  return 1;
}

/** xmur3 string hash → 32-bit seed (deterministic across processes). */
export function hashSeed(str: string): number {
  let h = 177_903_370 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 34_329_184_145);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 224_682_250_745);
  h = Math.imul(h ^ (h >>> 13), 326_648_990_9);
  return (h ^= h >>> 16) >>> 0;
}

/** mulberry32 PRNG — small, fast, deterministic. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d_2b_79_f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * Deterministic daily pick: shuffles a copy of `items` with a PRNG seeded by
 * `seedStr` (e.g. `${userId}:${dayKey}`) and returns the first `n`. Pure —
 * same inputs always produce the same output; different day keys reshuffle.
 */
export function pickDailyMatches<T>(items: readonly T[], seedStr: string, n: number): T[] {
  if (n <= 0 || items.length === 0) return [];
  const rand = mulberry32(hashSeed(seedStr));
  const pool = [...items];
  // Fisher–Yates from the end; early-exit once we have n picks.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
    if (pool.length - i >= n) break;
  }
  return pool.slice(0, Math.min(n, pool.length));
}

/** Today's local date key — the daily match rotation boundary. */
export function todayMatchKey(now: Date = new Date()): string {
  return localDateKey(now);
}
