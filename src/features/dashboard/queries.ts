import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCheckInStatus } from "@/lib/checkin";
import { membershipDays } from "@/lib/time";
import { classifyActivityWithThresholds } from "@/lib/activity";
import { getCardStats, type CardStats } from "@/lib/card-stats";
import { getDailyMatches, type DailyMatch } from "@/features/matches/daily";

// Dashboard read-model: every metric comes from real database values.
// Nothing here is hardcoded — missing data renders as a friendly empty state.

export interface DashboardSuggestedMatch {
  userId: string;
  username: string;
  name: string;
  companyName: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  sharedInterests: number;
  // Which of the viewer's "looking for" tags this member can help with.
  matchedLookingFor: string[];
}

export interface DashboardData {
  greetingName: string;
  avatarUrl: string | null;
  companyName: string | null;
  points: number;
  memberDays: number;
  contactCount: number;
  unreadMessages: number;
  loginStreak: number;
  totalLoginDays: number;
  lastLoginAt: Date | null;
  activityStatus: string;
  referralCount: number;
  checkin: Awaited<ReturnType<typeof getCheckInStatus>>;
  recentConnections: {
    id: string;
    username: string;
    name: string;
    companyName: string | null;
    avatarUrl: string | null;
    addedAt: Date;
  }[];
  suggestedMatches: DashboardSuggestedMatch[];
  upcomingEvents: { id: string; title: string; startsAt: Date }[];
  pendingFollowUps: number;
  followUps: {
    contactId: string;
    username: string;
    name: string;
    companyName: string | null;
    avatarUrl: string | null;
    daysWaiting: number;
  }[];
  referredUsers: {
    id: string;
    username: string;
    name: string;
    companyName: string | null;
    avatarUrl: string | null;
    joinedAt: Date;
  }[];
  // "Who viewed my card" analytics (ProfileView + CONTACT_SAVE events).
  cardStats: CardStats;
  // Today's deterministic business matches (same pick as the /matches deck).
  dailyMatches: DailyMatch[];
  dailyMatchQuota: number;
  cardPath: string | null;
}

function greetingForHour(hour: number): string {
  // Greeting uses server time in the app timezone (Asia/Jakarta default).
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export async function getDashboardData(): Promise<DashboardData | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const [fullUser, checkin] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        points: true,
        createdAt: true,
        lastLoginAt: true,
        totalLoginDays: true,
        loginStreak: true,
        membershipTier: true,
        profile: {
          select: {
            username: true,
            fullName: true,
            displayName: true,
            avatarUrl: true,
            companyName: true,
            jobTitle: true,
            canHelp: true,
            lookingFor: true,
          },
        },
        _count: { select: { contactsOwned: true, referrals: true } },
      },
    }),
    getCheckInStatus(user.id),
  ]);

  if (!fullUser) return null;

  const activityStatus = classifyActivityWithThresholds(
    { createdAt: fullUser.createdAt, lastLoginAt: fullUser.lastLoginAt },
    { activeWithinDays: 7, inactiveWithinDays: 30 },
  );

  // Recent connections (newest five).
  const recentContacts = await prisma.contact.findMany({
    where: { ownerUserId: user.id, contact: { status: "ACTIVE" } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      createdAt: true,
      contact: {
        select: {
          id: true,
          profile: {
            select: {
              username: true,
              fullName: true,
              displayName: true,
              avatarUrl: true,
              companyName: true,
            },
          },
        },
      },
    },
  });

  // Unread messages across the user's conversations.
  const memberships = await prisma.conversationMember.findMany({
    where: { userId: user.id },
    select: { conversationId: true, lastReadAt: true },
  });
  let unreadMessages = 0;
  if (memberships.length > 0) {
    const ors = memberships.map((m) => ({
      conversationId: m.conversationId,
      senderId: { not: user.id },
      deletedAt: null,
      ...(m.lastReadAt ? { createdAt: { gt: m.lastReadAt } } : {}),
    }));
    unreadMessages = await prisma.message.count({ where: { OR: ors } });
  }

  // Suggested business matches: members whose lookingFor/canHelp overlap with
  // the viewer's canHelp/lookingFor, excluding existing contacts and self.
  const myCanHelp = fullUser.profile?.canHelp ?? [];
  const myLookingFor = fullUser.profile?.lookingFor ?? [];
  let suggestedMatches: DashboardSuggestedMatch[] = [];
  if (myCanHelp.length > 0 || myLookingFor.length > 0) {
    const candidates = await prisma.user.findMany({
      where: {
        id: { not: user.id },
        status: "ACTIVE",
        contactsOwned: { none: { ownerUserId: user.id } },
        profile: {
          OR: [
            { lookingFor: { hasSome: myCanHelp } },
            { canHelp: { hasSome: myLookingFor } },
          ],
        },
      },
      select: {
        id: true,
        profile: {
          select: {
            username: true,
            fullName: true,
            displayName: true,
            avatarUrl: true,
            companyName: true,
            jobTitle: true,
            canHelp: true,
            lookingFor: true,
          },
        },
      },
      take: 20,
    });

    suggestedMatches = candidates
      .map((c) => {
        const theirCanHelp = c.profile?.canHelp ?? [];
        const theirLookingFor = c.profile?.lookingFor ?? [];
        // Tags this member can help with that the viewer is looking for.
        const matchedLookingFor = theirCanHelp.filter((t) =>
          myLookingFor.includes(t),
        );
        const shared =
          theirLookingFor.filter((t) => myCanHelp.includes(t)).length +
          matchedLookingFor.length;
        return {
          userId: c.id,
          username: c.profile?.username ?? "",
          name: c.profile?.displayName || c.profile?.fullName || "Member",
          companyName: c.profile?.companyName ?? null,
          jobTitle: c.profile?.jobTitle ?? null,
          avatarUrl: c.profile?.avatarUrl ?? null,
          sharedInterests: shared,
          matchedLookingFor,
        };
      })
      .filter((m) => m.sharedInterests > 0)
      // Prioritise members who can help with what the viewer is looking for.
      .sort(
        (a, b) =>
          b.matchedLookingFor.length - a.matchedLookingFor.length ||
          b.sharedInterests - a.sharedInterests,
      )
      .slice(0, 6);
  }

  // Upcoming events: BridgeX currently models events as dated posts/awards;
  // surface nothing rather than fake rows until an Event model exists.
  const upcomingEvents: { id: string; title: string; startsAt: Date }[] = [];

  // Follow-up reminders: contacts added 3+ days ago that the owner has not yet
  // marked followed up. Clicking "Follow up" sets followedUpAt and removes them.
  const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000);
  const followUpContacts = await prisma.contact.findMany({
    where: {
      ownerUserId: user.id,
      followedUpAt: null,
      createdAt: { lt: threeDaysAgo },
      contact: { status: "ACTIVE" },
    },
    orderBy: { createdAt: "asc" },
    take: 8,
    select: {
      id: true,
      createdAt: true,
      contact: {
        select: {
          profile: {
            select: {
              username: true,
              fullName: true,
              displayName: true,
              avatarUrl: true,
              companyName: true,
            },
          },
        },
      },
    },
  });
  const followUps = followUpContacts.map((c) => ({
    contactId: c.id,
    username: c.contact.profile?.username ?? "",
    name: c.contact.profile?.displayName || c.contact.profile?.fullName || "Member",
    companyName: c.contact.profile?.companyName ?? null,
    avatarUrl: c.contact.profile?.avatarUrl ?? null,
    daysWaiting: Math.max(
      0,
      Math.floor((Date.now() - c.createdAt.getTime()) / 86_400_000),
    ),
  }));
  const pendingFollowUps = followUps.length;

  // Network growth: the members who joined through this user's link or card.
  const referred = await prisma.user.findMany({
    where: { referredById: user.id },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      createdAt: true,
      profile: {
        select: {
          username: true,
          fullName: true,
          displayName: true,
          avatarUrl: true,
          companyName: true,
        },
      },
    },
  });
  const referredUsers = referred.map((u) => ({
    id: u.id,
    username: u.profile?.username ?? "",
    name: u.profile?.displayName || u.profile?.fullName || "Member",
    companyName: u.profile?.companyName ?? null,
    avatarUrl: u.profile?.avatarUrl ?? null,
    joinedAt: u.createdAt,
  }));

  // "Who viewed my card" analytics + today's deterministic daily matches
  // (same seed as the /matches deck → both surfaces show the same people).
  const [cardStats, daily] = await Promise.all([
    getCardStats(user.id),
    getDailyMatches(user.id, fullUser.membershipTier),
  ]);

  return {
    greetingName:
      fullUser.profile?.displayName?.split(" ")[0] ||
      fullUser.profile?.fullName?.split(" ")[0] ||
      "there",
    avatarUrl: fullUser.profile?.avatarUrl ?? null,
    companyName: fullUser.profile?.companyName ?? null,
    points: fullUser.points,
    memberDays: membershipDays(fullUser.createdAt),
    contactCount: fullUser._count.contactsOwned,
    unreadMessages,
    loginStreak: fullUser.loginStreak,
    totalLoginDays: fullUser.totalLoginDays,
    lastLoginAt: fullUser.lastLoginAt,
    activityStatus,
    referralCount: fullUser._count.referrals,
    checkin,
    recentConnections: recentContacts.map((c) => ({
      id: c.contact.id,
      username: c.contact.profile?.username ?? "",
      name: c.contact.profile?.displayName || c.contact.profile?.fullName || "Member",
      companyName: c.contact.profile?.companyName ?? null,
      avatarUrl: c.contact.profile?.avatarUrl ?? null,
      addedAt: c.createdAt,
    })),
    suggestedMatches,
    upcomingEvents,
    pendingFollowUps,
    followUps,
    referredUsers,
    cardStats,
    dailyMatches: daily.matches,
    dailyMatchQuota: daily.quota,
    cardPath: fullUser.profile?.username ? `/u/${fullUser.profile.username}` : null,
  };
}

export { greetingForHour };