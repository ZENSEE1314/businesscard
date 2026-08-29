import { describe, it, expect } from "vitest";
import { classifyActivityWithThresholds } from "@/lib/activity";
import { computeStreak, computeBonus, DEFAULT_CHECKIN_SETTINGS } from "@/lib/checkin";
import { localDateKey } from "@/lib/time";

const T = { activeWithinDays: 7, inactiveWithinDays: 30 };
// Reference "now" is the real local today (Asia/Jakarta) so the thresholds are
// exercised against the actual current date, not a frozen timestamp.
const NOW = new Date(`${localDateKey()}T10:00:00Z`);

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 86_400_000);
}

describe("activity classification", () => {
  it("ACTIVE within the active window", () => {
    expect(
      classifyActivityWithThresholds(
        { createdAt: daysAgo(100), lastLoginAt: daysAgo(3) },
        T,
      ),
    ).toBe("ACTIVE");
    expect(
      classifyActivityWithThresholds(
        { createdAt: daysAgo(100), lastLoginAt: NOW },
        T,
      ),
    ).toBe("ACTIVE");
  });

  it("INACTIVE between active and dormant thresholds", () => {
    expect(
      classifyActivityWithThresholds(
        { createdAt: daysAgo(200), lastLoginAt: daysAgo(12) },
        T,
      ),
    ).toBe("INACTIVE");
    expect(
      classifyActivityWithThresholds(
        { createdAt: daysAgo(200), lastLoginAt: daysAgo(30) },
        T,
      ),
    ).toBe("INACTIVE");
  });

  it("DORMANT beyond the inactive threshold", () => {
    expect(
      classifyActivityWithThresholds(
        { createdAt: daysAgo(400), lastLoginAt: daysAgo(31) },
        T,
      ),
    ).toBe("DORMANT");
  });

  it("NEW for fresh accounts that never logged in", () => {
    expect(
      classifyActivityWithThresholds({ createdAt: daysAgo(2), lastLoginAt: null }, T),
    ).toBe("NEW");
  });

  it("never-logged-in old accounts become DORMANT", () => {
    expect(
      classifyActivityWithThresholds(
        { createdAt: daysAgo(90), lastLoginAt: null, onboarded: true },
        T,
      ),
    ).toBe("DORMANT");
  });

  it("respects custom thresholds", () => {
    const custom = { activeWithinDays: 1, inactiveWithinDays: 5 };
    expect(
      classifyActivityWithThresholds({ createdAt: daysAgo(50), lastLoginAt: daysAgo(2) }, custom),
    ).toBe("INACTIVE");
    expect(
      classifyActivityWithThresholds({ createdAt: daysAgo(50), lastLoginAt: daysAgo(6) }, custom),
    ).toBe("DORMANT");
  });
});

describe("check-in streak computation", () => {
  it("starts at 1 on first ever check-in", () => {
    expect(computeStreak(null, 0, "2026-08-26")).toBe(1);
  });

  it("increments when yesterday was checked in", () => {
    expect(computeStreak("2026-08-25", 4, "2026-08-26")).toBe(5);
  });

  it("resets after a missed day", () => {
    expect(computeStreak("2026-08-24", 9, "2026-08-26")).toBe(1);
  });

  it("is idempotent within the same day (defensive)", () => {
    expect(computeStreak("2026-08-26", 7, "2026-08-26")).toBe(7);
  });
});

describe("streak milestone bonuses", () => {
  const settings = DEFAULT_CHECKIN_SETTINGS; // milestones at 7/30/100

  it("no bonus below the first milestone", () => {
    expect(computeBonus(1, settings)).toBe(0);
    expect(computeBonus(6, settings)).toBe(0);
  });

  it("awards the day-7 tier at exactly seven days", () => {
    expect(computeBonus(7, settings)).toBe(25);
  });

  it("keeps the highest reached tier", () => {
    expect(computeBonus(29, settings)).toBe(25);
    expect(computeBonus(30, settings)).toBe(100);
    expect(computeBonus(150, settings)).toBe(500);
  });

  it("returns zero when streak bonuses are disabled", () => {
    expect(computeBonus(30, { ...settings, streakBonusEnabled: false })).toBe(0);
  });
});