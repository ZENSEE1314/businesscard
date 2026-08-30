import "server-only";
import { prisma } from "@/lib/db/prisma";
import { classifyActivityWithThresholds, type ActivityStatus } from "@/lib/activity";
import { getActivityThresholds } from "@/lib/settings";
import { daysBetweenLocalDates, localDateKey } from "@/lib/time";

// Admin-only user network tree.
//
// Parent relationship: User.referredById — set when a user signs up through
// another member's referral link or digital card (QR / NFC / shared link /
// event invite). Ordinary saved contacts are NEVER treated as parents.
//
// Cycle safety: referredById is written only at signup from an existing
// account's code, so cycles cannot form through normal flows; the loader
// additionally tracks visited ids per walk as a hard guarantee.

export interface TreeNode {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  companyName: string | null;
  membershipTier: string | null;
  createdAt: string;
  memberDays: number;
  lastLoginAt: string | null;
  daysSinceLogin: number | null;
  activityStatus: ActivityStatus;
  points: number;
  contactCount: number;
  directReferrals: number;
  totalDescendants: number | null; // computed lazily for expanded roots
  signupSource: string | null;
  children?: TreeNode[];
  hasChildren: boolean;
  /** Client-side expansion spinner flag (never set by the server). */
  loading?: boolean;
}

const nodeSelect = {
  id: true,
  email: true,
  status: true,
  points: true,
  membershipTier: true,
  createdAt: true,
  lastLoginAt: true,
  loginStreak: true,
  lastLoginDay: true,
  signupSource: true,
  profile: {
    select: {
      username: true,
      fullName: true,
      displayName: true,
      avatarUrl: true,
      companyName: true,
    },
  },
  _count: { select: { referrals: true, contactsOwned: true } },
} as const;

type NodeRow = {
  id: string;
  email: string;
  status: string;
  points: number;
  membershipTier: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  loginStreak: number;
  lastLoginDay: string | null;
  signupSource: string | null;
  profile: {
    username: string;
    fullName: string;
    displayName: string | null;
    avatarUrl: string | null;
    companyName: string | null;
  } | null;
  _count: { referrals: number; contactsOwned: number };
};

async function toTreeNode(row: NodeRow): Promise<TreeNode> {
  const thresholds = await getActivityThresholds();
  const todayKey = localDateKey();
  return {
    id: row.id,
    name: row.profile?.displayName || row.profile?.fullName || "(no name)",
    username: row.profile?.username ?? "",
    avatarUrl: row.profile?.avatarUrl ?? null,
    companyName: row.profile?.companyName ?? null,
    membershipTier: row.membershipTier,
    createdAt: row.createdAt.toISOString(),
    memberDays: Math.max(0, daysBetweenLocalDates(todayKey, localDateKey(row.createdAt))),
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    daysSinceLogin: row.lastLoginAt
      ? Math.max(0, daysBetweenLocalDates(todayKey, localDateKey(row.lastLoginAt)))
      : null,
    activityStatus: classifyActivityWithThresholds(
      { createdAt: row.createdAt, lastLoginAt: row.lastLoginAt },
      thresholds,
    ),
    points: row.points,
    contactCount: row._count.contactsOwned,
    directReferrals: row._count.referrals,
    totalDescendants: null,
    signupSource: row.signupSource,
    hasChildren: row._count.referrals > 0,
  };
}

/** Children of one user (one level). Used for lazy expansion. */
export async function getChildren(parentId: string): Promise<TreeNode[]> {
  const rows = await prisma.user.findMany({
    where: { referredById: parentId },
    orderBy: { createdAt: "asc" },
    select: nodeSelect,
  });
  return Promise.all(rows.map((r) => toTreeNode(r as NodeRow)));
}

/**
 * Admin-only: reassign a user's referrer (move them to a different branch of
 * the network tree). Cycle-safe: refuses to set a descendant as the new parent.
 */
export async function reassignReferrer(
  targetId: string,
  newParentId: string | null,
): Promise<void> {
    // Prevent cycles: the new parent must not be the target or a descendant of it.
  if (newParentId) {
    if (newParentId === targetId) {
      throw new Error("Cannot assign a user as their own referrer.");
    }
    // Quick BFS: the new parent must not be a descendant of the target — that
    // would close a referral loop.
    const visited = new Set<string>([targetId]);
    const queue: string[] = [targetId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const kids = await prisma.user.findMany({
        where: { referredById: current },
        select: { id: true },
      });
      for (const k of kids) {
        if (k.id === newParentId) {
          throw new Error("Cannot set a descendant as the new referrer.");
        }
        if (!visited.has(k.id)) {
          visited.add(k.id);
          queue.push(k.id);
        }
      }
    }
  }
  // null explicitly detaches the member (becomes a root). Prisma needs the
  // field present with null — `undefined` would skip the update entirely.
  await prisma.user.update({
    where: { id: targetId },
    data: { referredById: newParentId },
  });
}

/** Count all descendants of a user iteratively (no recursion blowups). */
export async function countDescendants(rootId: string): Promise<number> {
  let count = 0;
  const queue: string[] = [rootId];
  const visited = new Set<string>([rootId]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    const childIds = await prisma.user.findMany({
      where: { referredById: current },
      select: { id: true },
    });
    for (const c of childIds) {
      if (visited.has(c.id)) continue; // circular-reference guard
      visited.add(c.id);
      count += 1;
      queue.push(c.id);
    }
  }
  return count;
}

/**
 * Root nodes of the forest: users with no referrer. Optionally filtered by
 * activity status / tier / source after classification.
 */
export async function getRoots(filters: {
  status?: string;
  tier?: string;
  source?: string;
}): Promise<TreeNode[]> {
  const where: Record<string, unknown> = { referredById: null };
  if (filters.tier) where.membershipTier = filters.tier;
  if (filters.source) where.signupSource = filters.source;

  const rows = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: nodeSelect,
  });

  let nodes = await Promise.all(rows.map((r) => toTreeNode(r as NodeRow)));
  if (filters.status) nodes = nodes.filter((n) => n.activityStatus === filters.status);
  return nodes;
}

/**
 * Ancestor chain of a user (for search "jump to"): returns the path from the
 * top-level root down to the searched user, inclusive.
 */
export async function getPathToUser(userId: string): Promise<TreeNode[] | null> {
  const visited = new Set<string>();
  const chain: NodeRow[] = [];
  let cursor: string | null = userId;

  while (typeof cursor === "string" && !visited.has(cursor)) {
    const id: string = cursor;
    visited.add(id);
    const found = await prisma.user.findUnique({
      where: { id },
      select: { ...nodeSelect, referredById: true },
    });
    if (!found) return null;
    const row = found as NodeRow & { referredById: string | null };
    chain.unshift(row);
    cursor = row.referredById;
    if (chain.length > 50) return null; // safety valve
  }

  if (chain.length === 0) return null;
  return Promise.all(chain.map((r) => toTreeNode(r)));
}