import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getChildren, countDescendants, getPathToUser } from "@/features/admin/tree";
import { handle, ok, Errors } from "@/lib/api";

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