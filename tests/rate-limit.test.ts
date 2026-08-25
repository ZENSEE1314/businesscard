import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  resetRateLimit,
  normalizeIp,
  extractClientIp,
} from "@/lib/security/rate-limit";

function headers(obj: Record<string, string>): Headers {
  return new Headers(obj);
}

describe("checkRateLimit basics", () => {
  beforeEach(() => {
    resetRateLimit("test:key");
  });

  it("allows requests under the limit and blocks beyond it", () => {
    const key = "test:key";
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 60_000).allowed).toBe(true);
    }
    const blocked = checkRateLimit(key, 5, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("reports retry-after seconds on the blocked result", () => {
    const key = "test:key";
    checkRateLimit(key, 1, 120_000); // fills the bucket
    const blocked = checkRateLimit(key, 1, 120_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(120);
  });

  it("keeps separate buckets per key (different users on one IP)", () => {
    // Simulates two different accounts behind one shared carrier IP.
    const a = "login:fail:email:a@x.com";
    const b = "login:fail:email:b@x.com";
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(a, 10, 60_000).allowed).toBe(true);
    }
    expect(checkRateLimit(a, 10, 60_000).allowed).toBe(false);
    // The other account is unaffected by a's failures.
    expect(checkRateLimit(b, 10, 60_000).allowed).toBe(true);
  });
});

describe("resetRateLimit (successful login clears failures)", () => {
  it("clears the counter so the next attempt is allowed", () => {
    const key = "login:fail:email:zen@x.com";
    for (let i = 0; i < 9; i++) checkRateLimit(key, 10, 60_000);
    // One failure left before lockout...
    expect(checkRateLimit(key, 10, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 10, 60_000).allowed).toBe(false);

    // ...but a successful login resets the account counter.
    resetRateLimit(key);
    expect(checkRateLimit(key, 10, 60_000).allowed).toBe(true);
  });
});

describe("normalizeIp", () => {
  it("passes IPv4 through", () => {
    expect(normalizeIp("203.0.113.7")).toBe("v4:203.0.113.7");
  });

  it("collapses IPv6 to its /64 prefix so subnet rotation cannot evade limits", () => {
    const a = normalizeIp("2001:db8:1234:5678::1");
    const b = normalizeIp("2001:db8:1234:5678:abcd::42");
    expect(a).toBe(b);
    expect(a.startsWith("v6:")).toBe(true);
  });
});

describe("extractClientIp behind proxy chains", () => {
  it("takes the rightmost public address from X-Forwarded-For", () => {
    // Client spoofed an entry, then Railway's edge appended the real IP.
    const h = headers({
      "x-forwarded-for": "1.2.3.4, 10.0.0.5, 198.51.100.23",
    });
    expect(extractClientIp(h)).toBe("198.51.100.23");
  });

  it("skips private/internal hops", () => {
    const h = headers({
      "x-forwarded-for": "192.168.1.10, 172.16.0.9, 203.0.113.99",
    });
    expect(extractClientIp(h)).toBe("203.0.113.99");
  });

  it("falls back to x-real-ip when XFF is absent", () => {
    const h = headers({ "x-real-ip": "198.51.100.55" });
    expect(extractClientIp(h)).toBe("198.51.100.55");
  });

  it("returns unknown without any headers", () => {
    expect(extractClientIp(headers({}))).toBe("unknown");
  });

  it("treats CGNAT addresses as real clients (carrier NAT)", () => {
    const h = headers({ "x-forwarded-for": "100.64.12.34" });
    expect(extractClientIp(h)).toBe("100.64.12.34");
  });

  it("uses leftmost entry when the whole chain is private (local dev)", () => {
    const h = headers({ "x-forwarded-for": "10.0.0.1, 10.0.0.2" });
    expect(extractClientIp(h)).toBe("10.0.0.1");
  });
});