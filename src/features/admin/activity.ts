import "server-only";
import { Prisma, type MembershipTier } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  classifyActivityWithThresholds,
  type ActivityStatus,
} from "@/lib/activity";
import { getActivityThresholds } from "@/lib/settings";
import { addDaysToLocalDate, daysBetweenLocalDates, localDateKey } from "@/lib/time";

// Admin-only user-activity reporting. Every caller must be behind the admin
// layout guard AND these helpers are only imported by /admin pages/routes.

export interface ActivityFilters {
  search?: string;
  status?: ActivityStatus | "";
  tier?: MembershipTier | "";
  joinedWithinDays?: number;
  loginRecencyDays?: number; // users whose last login is within N days
  sort?: "recent_login" | "oldest_login" | "newest" | "points";
  page?: number;
  pageSize?: number;
}

export interface ActivityRow {
  id: string;
  email: string;
  role: string;
  status: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  companyName: string | null;
  membershipTier: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  totalLoginDays: number;
  loginStreak: number;
  checkinStreak: number;
  points: number;
  contactCount: number;
  referralCount: number;
  activityStatus: ActivityStatus;
  memberDays: number;
  daysSinceLogin: number | null;
}

const PAGE_SIZE = 25;

function buildWhere(filters: ActivityFilters): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};
  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { profile: { fullName: { contains: q, mode: "insensitive" } } },
      { profile: { displayName: { contains: q, mode: "insensitive" } } },
      { profile: { companyName: { contains: q, mode: "insensitive" } } },
      { profile: { username: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (filters.tier) where.membershipTier = filters.tier;
  return where;
}

/** Loads users and classifies them in memory (thresholds are settings-driven). */
async function loadClassified(filters: ActivityFilters) {
  const [users, thresholds] = await Promise.all([
    prisma.user.findMany({
      where: buildWhere(filters),
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        points: true,
        membershipTier: true,
        createdAt: true,
        lastLoginAt: true,
        totalLoginDays: true,
        loginStreak: true,
        referredById: true,
        profile: {
          select: {
            username: true,
            fullName: true,
            displayName: true,
            avatarUrl: true,
            companyName: true,
          },
        },
        _count: { select: { contactsOwned: true, referrals: true } },
      },
    }),
    getActivityThresholds(),
  ]);

  const todayKey = localDateKey();

  // Current daily check-in streak per user: the most recent check-in dated
  // today or yesterday carries the live streak; anything older means it lapsed.
  const yesterdayKey = addDaysToLocalDate(todayKey, -1);
  const recentCheckins = await prisma.dailyCheckIn.findMany({
    where: {
      userId: { in: users.map((u) => u.id) },
      localDate: { in: [todayKey, yesterdayKey] },
    },
    select: { userId: true, localDate: true, streakDay: true },
    orderBy: { localDate: "desc" },
  });
  const checkinStreakByUser = new Map<string, number>();
  for (const c of recentCheckins) {
    if (checkinStreakByUser.has(c.userId)) continue; // keep the most recent
    const gap = daysBetweenLocalDates(todayKey, c.localDate);
    checkinStreakByUser.set(c.userId, gap <= 1 ? c.streakDay : 0);
  }

  return users.map((u) => {
    const activityStatus = classifyActivityWithThresholds(
      {
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
        onboarded: Boolean(u.profile?.fullName),
      },
      thresholds,
    );
    const row: ActivityRow & { referredById: string | null } = {
      id: u.id,
      email: u.email,
      role: u.role,
      status: u.status,
      fullName: u.profile?.displayName || u.profile?.fullName || "(no name)",
      username: u.profile?.username ?? "",
      avatarUrl: u.profile?.avatarUrl ?? null,
      companyName: u.profile?.companyName ?? null,
      membershipTier: u.membershipTier,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      totalLoginDays: u.totalLoginDays,
      loginStreak: u.loginStreak,
      checkinStreak: checkinStreakByUser.get(u.id) ?? 0,
      points: u.points,
      contactCount: u._count.contactsOwned,
      referralCount: u._count.referrals,
      activityStatus,
      memberDays: Math.max(0, daysBetweenLocalDates(todayKey, localDateKey(u.createdAt))),
      daysSinceLogin: u.lastLoginAt
        ? Math.max(0, daysBetweenLocalDates(todayKey, localDateKey(u.lastLoginAt)))
        : null,
      referredById: u.referredById,
    };
    return row;
  });
}

export async function queryActivityRows(
  filters: ActivityFilters,
): Promise<{ rows: ActivityRow[]; total: number; pageSize: number }> {
  const classified = await loadClassified(filters);

  let rows = classified;

  // Post-load filters that depend on computed fields.
  if (filters.status) {
    rows = rows.filter((r) => r.activityStatus === filters.status);
  }
  if (filters.joinedWithinDays && filters.joinedWithinDays > 0) {
    rows = rows.filter((r) => r.memberDays <= filters.joinedWithinDays!);
  }
  if (filters.loginRecencyDays !== undefined && filters.loginRecencyDays >= 0) {
    rows = rows.filter(
      (r) => r.daysSinceLogin !== null && r.daysSinceLogin <= filters.loginRecencyDays!,
    );
  }

  switch (filters.sort) {
    case "oldest_login":
      rows.sort((a, b) => (a.lastLoginAt?.getTime() ?? 0) - (b.lastLoginAt?.getTime() ?? 0));
      break;
    case "newest":
      rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      break;
    case "points":
      rows.sort((a, b) => b.points - a.points);
      break;
    case "recent_login":
    default:
      rows.sort((a, b) => (b.lastLoginAt?.getTime() ?? 0) - (a.lastLoginAt?.getTime() ?? 0));
      break;
  }

  const pageSize = filters.pageSize ?? PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);
  const paged = rows.slice((page - 1) * pageSize, page * pageSize);

  return { rows: paged, total: rows.length, pageSize };
}

export interface ActivitySummary {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  dormantUsers: number;
  newUsers: number;
  loggedInToday: number;
  newThisWeek: number;
  avgLoginStreak: number;
  checkinPointsAwardedTotal: number;
}

export async function activitySummary(): Promise<ActivitySummary> {
  const thresholds = await getActivityThresholds();
  const users = await prisma.user.findMany({
    select: {
      createdAt: true,
      lastLoginAt: true,
      loginStreak: true,
    },
  });

  const todayKey = localDateKey();
  let active = 0;
  let inactive = 0;
  let dormant = 0;
  let fresh = 0;
  let loggedToday = 0;
  let streakSum = 0;

  for (const u of users) {
    const s = classifyActivityWithThresholds(
      { createdAt: u.createdAt, lastLoginAt: u.lastLoginAt },
      thresholds,
    );
    if (s === "ACTIVE") active += 1;
    else if (s === "INACTIVE") inactive += 1;
    else if (s === "DORMANT") dormant += 1;
    else fresh += 1;

    if (
      u.lastLoginAt &&
      daysBetweenLocalDates(todayKey, localDateKey(u.lastLoginAt)) === 0
    ) {
      loggedToday += 1;
    }
    streakSum += u.loginStreak;
  }

  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const [newThisWeek, checkinAgg] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.pointTransaction.aggregate({
      where: { eventKey: "daily_checkin", type: "EARN" },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalUsers: users.length,
    activeUsers: active,
    inactiveUsers: inactive,
    dormantUsers: dormant,
    newUsers: fresh,
    loggedInToday: loggedToday,
    newThisWeek,
    avgLoginStreak: users.length ? Math.round((streakSum / users.length) * 10) / 10 : 0,
    checkinPointsAwardedTotal: checkinAgg._sum.amount ?? 0,
  };
}

const CSV_COLUMNS: { header: string; pick: (r: ActivityRow) => string | number }[] = [
  { header: "Name", pick: (r) => r.fullName },
  { header: "Username", pick: (r) => r.username },
  { header: "Email", pick: (r) => r.email },
  { header: "Company", pick: (r) => r.companyName ?? "" },
  { header: "Membership", pick: (r) => (r.membershipTier === "BRIDGEMAKER" ? "BridgeMaker" : r.membershipTier === "BRIDGEMASTER" ? "BridgeMaster" : "Bridge Member") },
  { header: "Join date", pick: (r) => r.createdAt.toISOString().slice(0, 10) },
  { header: "Member days", pick: (r) => r.memberDays },
  { header: "Last login", pick: (r) => r.lastLoginAt?.toISOString() ?? "" },
  { header: "Days since login", pick: (r) => r.daysSinceLogin ?? "" },
  { header: "Total login days", pick: (r) => r.totalLoginDays },
  { header: "Login streak", pick: (r) => r.loginStreak },
  { header: "Check-in streak", pick: (r) => r.checkinStreak },
  { header: "Activity status", pick: (r) => r.activityStatus },
  { header: "Points", pick: (r) => r.points },
  { header: "Contacts", pick: (r) => r.contactCount },
  { header: "Referrals", pick: (r) => r.referralCount },
  { header: "Account status", pick: (r) => r.status },
];

export function activityRowsToCsv(rows: ActivityRow[]): string {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    CSV_COLUMNS.map((c) => c.header).join(","),
    ...rows.map((r) => CSV_COLUMNS.map((c) => escape(c.pick(r))).join(",")),
  ];
  return lines.join("\n");
}