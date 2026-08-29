import { z } from "zod";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/permissions/guards";
import { logAdminAction } from "@/lib/admin-log";
import { Errors, getClientIp, handle, ok } from "@/lib/api";

// Admin reassigns a member's referrer (the "parent" edge in the network tree).
// body: { userId, referrerId | null }  — null detaches the member to root.
const reassignSchema = z.object({
  userId: z.string().min(1),
  referrerId: z.string().min(1).nullable(),
});

/** Walks up the ancestor chain from `startId`; returns the visited id set. */
async function ancestorIds(startId: string): Promise<Set<string>> {
  const seen = new Set<string>();
  let cursor = startId;
  for (let depth = 0; depth < 64; depth += 1) {
    const row = await prisma.user.findUnique({
      where: { id: cursor },
      select: { referredById: true },
    });
    const parent = row?.referredById;
    if (!parent) break;
    if (seen.has(parent)) break; // cycle safety (should not happen)
    seen.add(parent);
    cursor = parent;
  }
  return seen;
}

/** True when `candidate` sits anywhere in the subtree rooted at `rootId`. */
async function isDescendant(rootId: string, candidate: string): Promise<boolean> {
  const queue = [rootId];
  const seen = new Set<string>([rootId]);
  while (queue.length > 0) {
    const current = queue.shift() as string;
    const children = await prisma.user.findMany({
      where: { referredById: current },
      select: { id: true },
    });
    for (const child of children) {
      if (child.id === candidate) return true;
      if (!seen.has(child.id)) {
        seen.add(child.id);
        queue.push(child.id);
      }
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const admin = await requireAdmin();
    const input = reassignSchema.parse(await req.json());

    const target = await prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        referredById: true,
        profile: { select: { fullName: true } },
      },
    });
    if (!target) throw Errors.notFound("User not found.");

    let referrerName: string | null = null;
    if (input.referrerId) {
      if (input.referrerId === target.id) {
        throw Errors.badRequest("A user cannot be their own referrer.");
      }
      const referrer = await prisma.user.findUnique({
        where: { id: input.referrerId },
        select: { id: true, profile: { select: { fullName: true } } },
      });
      if (!referrer) throw Errors.notFound("New referrer not found.");
      referrerName = referrer.profile?.fullName ?? referrer.id;

      // Cycle guard: the new referrer must not be inside the moved subtree,
      // otherwise the tree would loop forever.
      const wouldCycle =
        (await isDescendant(target.id, input.referrerId)) ||
        (await ancestorIds(input.referrerId)).has(target.id);
      if (wouldCycle) {
        throw Errors.badRequest(
          "That referrer is inside this member's own subtree — moving would create a loop.",
        );
      }
    }

    await prisma.user.update({
      where: { id: target.id },
      data: { referredById: input.referrerId },
    });

    await logAdminAction({
      adminId: admin.id,
      action: "tree.reassign",
      targetType: "user",
      targetId: target.id,
      targetUsername: target.profile?.fullName ?? target.id,
      oldValue: { referredById: target.referredById },
      newValue: { referredById: input.referrerId, referrerName },
      ip: getClientIp(req),
    });

    return ok({ updated: true, referrerName });
  });
}
