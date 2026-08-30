import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getChildren, countDescendants, getPathToUser, reassignReferrer } from "@/features/admin/tree";
import { logAdminAction } from "@/lib/admin-log";
import { Errors, handle, ok, getClientIp } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users/tree
 *   ?parentId=...            → one level of children (lazy expansion)
 *   ?parentId=...&withCounts=1 → children plus total descendant counts
 *   ?username=...            → ancestor path from a root down to that member
 *
 * Admin-only: non-admins are rejected before any personal data is read.
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();
    if (user.role !== "ADMIN") throw Errors.forbidden();

    const sp = req.nextUrl.searchParams;
    const username = sp.get("username");
    const parentId = sp.get("parentId");

    if (username) {
      const profile = await prisma.profile.findUnique({
        where: { username: username.toLowerCase() },
        select: { userId: true },
      });
      if (!profile) throw Errors.notFound("No member with that username.");
      const path = await getPathToUser(profile.userId);
      if (!path) throw Errors.notFound("Could not build the path for that member.");
      return ok({ path });
    }

    if (!parentId) throw Errors.badRequest("parentId or username is required.");

    const withCounts = sp.get("withCounts") === "1";
    const children = await getChildren(parentId);

    if (withCounts) {
      for (const child of children) {
        child.totalDescendants = await countDescendants(child.id);
      }
    }

    return ok(children);
  });
}

// POST — reassign a member's referrer (move them to a different branch).
// Body: { targetId: string, newParentUsername?: string | null }
// newParentUsername is resolved to a user id server-side; null = detach to root.
export async function POST(req: NextRequest) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { targetId, newParentUsername } = (await req.json()) as {
      targetId: string;
      newParentUsername?: string | null;
    };
    if (!targetId) throw Errors.badRequest("targetId is required.");

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, referredById: true, profile: { select: { fullName: true, username: true } } },
    });
    if (!target) throw Errors.notFound("Member not found.");

    let newParentId: string | null = null;
    if (newParentUsername && newParentUsername.trim()) {
      const parent = await prisma.profile.findUnique({
        where: { username: newParentUsername.trim().toLowerCase() },
        select: { userId: true },
      });
      if (!parent) throw Errors.notFound("New referrer not found by username.");
      newParentId = parent.userId;
    }

    const oldParentId = target.referredById;
    await reassignReferrer(targetId, newParentId);

    const label = target.profile?.fullName ?? target.profile?.username ?? targetId;
    await logAdminAction({
      adminId: admin.id,
      action: "tree.reassign",
      targetType: "user",
      targetId: targetId,
      targetUsername: label,
      oldValue: { referredById: oldParentId },
      newValue: { referredById: newParentId },
      ip: getClientIp(req),
    });
    return ok({ reassigned: true });
  });
}

// Lazy import to keep the file self-contained.
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) throw Errors.unauthorized();
  if (user.role !== "ADMIN") throw Errors.forbidden();
  return user;
}