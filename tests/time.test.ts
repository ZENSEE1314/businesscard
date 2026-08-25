import { describe, it, expect } from "vitest";
import {
  localDateKey,
  daysBetweenLocalDates,
  addDaysToLocalDate,
  membershipDays,
  membershipDurationLabel,
} from "@/lib/time";

describe("localDateKey (Asia/Jakarta)", () => {
  it("maps a UTC instant to the Jakarta calendar day", () => {
    // 2026-08-25T18:30:00Z is 2026-08-26 01:30 in Jakarta (UTC+7).
    const instant = new Date("2026-08-25T18:30:00Z");
    expect(localDateKey(instant)).toBe("2026-08-26");
  });

  it("keeps the same date for mid-day Jakarta times", () => {
    const instant = new Date("2026-08-26T04:00:00Z"); // 11:00 Jakarta
    expect(localDateKey(instant)).toBe("2026-08-26");
  });

  it("rolls back to the previous Jakarta day near midnight UTC", () => {
    // 2026-08-26T17:00:00Z is 2026-08-27 00:00 Jakarta — next day.
    expect(localDateKey(new Date("2026-08-26T17:00:00Z"))).toBe("2026-08-27");
    // 2026-08-26T16:59:59Z is still 2026-08-26 23:59 Jakarta.
    expect(localDateKey(new Date("2026-08-26T16:59:59Z"))).toBe("2026-08-26");
  });
});

describe("daysBetweenLocalDates", () => {
  it("counts whole days", () => {
    expect(daysBetweenLocalDates("2026-08-26", "2026-08-20")).toBe(6);
    expect(daysBetweenLocalDates("2026-08-20", "2026-08-26")).toBe(-6);
    expect(daysBetweenLocalDates("2026-08-26", "2026-08-26")).toBe(0);
  });

  it("handles month boundaries", () => {
    expect(daysBetweenLocalDates("2026-09-01", "2026-08-31")).toBe(1);
  });
});

describe("addDaysToLocalDate", () => {
  it("adds and subtracts across month boundaries", () => {
    expect(addDaysToLocalDate("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDaysToLocalDate("2026-09-01", -1)).toBe("2026-08-31");
  });
});

describe("membership duration", () => {
  it("says 'Joined today' on the join day", () => {
    const joined = new Date("2026-08-26T02:00:00Z"); // 09:00 Jakarta
    const now = new Date("2026-08-26T10:00:00Z"); // 17:00 Jakarta
    expect(membershipDurationLabel(joined, now)).toBe("Joined today");
    expect(membershipDays(joined, now)).toBe(0);
  });

  it("pluralizes correctly after one day", () => {
    const joined = new Date("2026-08-25T02:00:00Z");
    const now = new Date("2026-08-26T10:00:00Z");
    expect(membershipDurationLabel(joined, now)).toBe("Member for 1 day");
  });

  it("handles long memberships", () => {
    const joined = new Date("2025-08-26T02:00:00Z");
    const now = new Date("2026-08-26T10:00:00Z");
    expect(membershipDurationLabel(joined, now)).toBe("Member for 365 days");
  });
});