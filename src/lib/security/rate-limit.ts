// Rate limiting for authentication and abuse-sensitive endpoints.
//
// WHY THIS EXISTS (production incident): the previous limiter counted EVERY
// login request — successful or not — against a single per-IP bucket of 20
// requests / 15 min. On Railway the app sits behind a shared edge proxy, and
// mobile carriers (XL Axiata, Telkomsel, ...) put thousands of subscribers
// behind carrier-grade NAT addresses, so many unrelated users exhausted one
// bucket and saw "Too many requests. Please slow down." on their FIRST login
// of the day.
//
// FIX, in application code (permanent):
//  1. Login throttling counts FAILED attempts only. Successful logins never
//     consume budget and clear the failed-attempt counter for that account.
//  2. Limits are enforced per-account (email) AND per-client-IP, so a shared
//     carrier IP cannot lock out unrelated users, while brute-forcing a single
//     account stays blocked.
//  3. Client IPs are extracted defensively from the Railway proxy chain:
//     spoofable XFF entries are ignored when they are private/reserved, IPv6
//     is normalized to its /64 so attackers cannot rotate within a subnet.
//  4. 429 responses include Retry-After so users see when they can retry.
//
// The store is in-memory (single-instance Railway default). The API below is
// store-agnostic: swap `store` for Redis to scale horizontally.

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
  retryAfterSec: number;
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
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt, retryAfterSec: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
    retryAfterSec: 0,
  };
}

/** Clears a bucket (used after a successful login to forgive past failures). */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Records a FAILED attempt without double-counting rapid retries of the same
 * click: identical key+window re-checks simply keep the original count.
 */
export function recordFailure(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  return checkRateLimit(key, limit, windowMs);
}

import { Errors } from "@/lib/api";

// Convenience wrapper that throws a 429 ApiError (with Retry-After) when the
// limit is exceeded. Used by non-login endpoints (register, AI, uploads...).
export function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): void {
  const result = checkRateLimit(key, limit, windowMs);
  if (!result.allowed) {
    throw Errors.tooMany(undefined, result.retryAfterSec);
  }
}

// ---------------------------------------------------------------------------
// Client IP extraction behind the Railway proxy chain
// ---------------------------------------------------------------------------

function isPublicIp(ip: string): boolean {
  // IPv4 loopback / private / link-local / CGNAT-reserved handling: CGNAT
  // (100.64.0.0/10) IS a real client address behind carrier NAT, so it counts
  // as public here — blocking on it is still scoped by the generous IP limit.
  const v4 =
    /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
  if (v4.test(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return false;
    if (a === 172 && b! >= 16 && b! <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false;
    return true;
  }
  // IPv6: loopback, link-local (fe80::/10), unique-local (fc00::/7) are not
  // client addresses; everything else (incl. normal global unicast) is.
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return false;
  if (/^fe[89ab]/.test(lower)) return false;
  if (/^f[cd]/.test(lower)) return false;
  return lower.includes(":");
}

/** Normalize an IP into a stable bucket key (IPv6 → /64 prefix). */
export function normalizeIp(ip: string): string {
  if (!ip) return "unknown";
  if (ip.includes(":")) {
    const groups = ip.split("%")[0]!.split("::");
    // Expand :: shorthand conservatively: use the leading groups we have.
    const head = groups[0]!.split(":").filter(Boolean);
    const prefix = head.slice(0, 4).join(":");
    return `v6:${prefix}`;
  }
  return `v4:${ip}`;
}

/**
 * Best-effort real client IP from proxy headers.
 *
 * X-Forwarded-For may contain client-spoofed entries followed by entries
 * appended by each trusted proxy. We walk RIGHT-to-LEFT (closest proxy last)
 * and take the rightmost public address — on Railway this is the address the
 * edge observed. Private entries (internal hops like 10.x / 172.16.x /
 * 192.168.x / fc00::/7) are skipped. Falls back to x-real-ip, then
 * cf-connecting-ip, then "unknown".
 */
export function extractClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      const candidate = parts[i]!;
      if (isPublicIp(candidate)) return candidate;
    }
    // All-private chain (e.g. local dev behind internal proxies): use the
    // leftmost entry so dev environments still get distinct buckets.
    if (parts.length > 0) return parts[0]!;
  }
  return (
    headers.get("x-real-ip") ??
    headers.get("cf-connecting-ip") ??
    "unknown"
  );
}