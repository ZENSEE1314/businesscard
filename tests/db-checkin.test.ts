import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { claimDailyCheckIn, getCheckInStatus } from "@/lib/checkin";
import { recordSuccessfulLogin } from "@/lib/activity";
import { dbEnabled, testDb, cleanupDb, makeUser } from "./db-helpers";

// DB-backed daily check-in tests. Skipped without TEST_DATABASE_URL.
describe.skipIf(!dbEnabled)("daily check-in (database)", () => {
  beforeAll(async () => {
    await cleanupDb();
  });

  afterAll(async () => {
    await testDb().$disconnect();
  });

  it("awards points exactly once on the first claim of the day", async () => {
    const prisma = testDb();
    const user = await makeUser("checkin1@test.local", "checkin1");

    const first = await claimDailyCheckIn(user.id);
    expect(first.awarded).toBe(true);
    expect(first.pointsAwarded).toBeGreaterThan(0);

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser?.points).toBe(first.pointsAwarded);

    const txs = await prisma.pointTransaction.findMany({
      where: { userId: user.id, eventKey: "daily_checkin" },
    });
    expect(txs).toHaveLength(1);
    expect(txs[0]!.amount).toBe(first.pointsAwarded);
    expect(txs[0]!.idempotencyKey).toBe(`daily_checkin:${user.id}:${first.localDate}`);
  });

  it("returns the existing claim on a second same-day attempt", async () => {
    const prisma = testDb();
    const user = await makeUser("checkin2@test.local", "checkin2");

    const first = await claimDailyCheckIn(user.id);
    const second = await claimDailyCheckIn(user.id);

    expect(second.awarded).toBe(false);
    expect(second.reason).toBe("duplicate");
    expect(second.pointsAwarded).toBe(first.pointsAwarded);

    // Balance unchanged — no double award.
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser?.points).toBe(first.pointsAwarded);
    expect(await prisma.dailyCheckIn.count({ where: { userId: user.id } })).toBe(1);
  });

  it("survives concurrent claims without double-awarding", async () => {
    const prisma = testDb();
    const user = await makeUser("checkin3@test.local", "checkin3");

    // Simulate repeated taps / parallel requests.
    const results = await Promise.all(
      Array.from({ length: 8 }, () => claimDailyCheckIn(user.id)),
    );

    const awarded = results.filter((r) => r.awarded);
    expect(awarded.length).toBe(1); // exactly one winner

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser?.points).toBe(awarded[0]!.pointsAwarded);
    expect(await prisma.dailyCheckIn.count({ where: { userId: user.id } })).toBe(1);
    expect(
      await prisma.pointTransaction.count({
        where: { userId: user.id, eventKey: "daily_checkin" },
      }),
    ).toBe(1);
  });

  it("reports streak and totals through the status read-model", async () => {
    const prisma = testDb();
    const user = await makeUser("checkin4@test.local", "checkin4");
    await claimDailyCheckIn(user.id);

    const status = await getCheckInStatus(user.id);
    expect(status.checkedInToday).toBe(true);
    expect(status.streak).toBe(1);
    expect(status.totalCheckInDays).toBe(1);
    expect(status.todayPoints).toBeGreaterThan(0);
    void prisma;
  });

  it("login tracking counts distinct days and maintains the streak", async () => {
    const prisma = testDb();
    const user = await makeUser("logins1@test.local", "logins1");

    const r1 = await recordSuccessfulLogin(user.id);
    expect(r1.countedNewDay).toBe(true);
    expect(r1.totalLoginDays).toBe(1);
    expect(r1.loginStreak).toBe(1);

    // Repeated logins on the same local day do not inflate counters.
    const r2 = await recordSuccessfulLogin(user.id);
    expect(r2.countedNewDay).toBe(false);
    expect(r2.totalLoginDays).toBe(1);
    expect(r2.loginStreak).toBe(1);

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser?.lastLoginDay).toBeTruthy();
    expect(dbUser?.totalLoginDays).toBe(1);
  });
});