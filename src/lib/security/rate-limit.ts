// In-memory sliding-window rate limiter. Adequate for a single-instance
// deployment (Railway default). For horizontal scaling, swap the store for
// Redis — the checkRateLimit signature stays the same.
//
// NOTE: this is a best-effort throttle, not a security boundary on its own.

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

// Periodic cleanup so the map does not grow unbounded.
let lastSweep = Date.now();
function sweep() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of store) {
    if (bucket.resetAt < now) store.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  sweep();
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  };
}

import { Errors } from "@/lib/api";

// Convenience wrapper that throws a 429 ApiError when the limit is exceeded.
export function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): void {
  const result = checkRateLimit(key, limit, windowMs);
  if (!result.allowed) {
    throw Errors.tooMany();
  }
}
