import "server-only";
import type { AnalyticsEventType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// Fire-and-forget analytics. Never let tracking failures break a page render.
export async function recordEvent(opts: {
  type: AnalyticsEventType;
  userId?: string | null; // the actor (viewer/clicker), if signed in
  targetId?: string | null; // the subject (profile owner / post)
  ip?: string | null;
}): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        type: opts.type,
        userId: opts.userId ?? null,
        targetId: opts.targetId ?? null,
        ip: opts.ip ?? null,
      },
    });
  } catch {
    // swallow — analytics is best-effort
  }
}

// Records a profile view, de-duplicating repeat views from the same viewer/ip
// within a short window so counts are not inflated by refreshes.
export async function recordProfileView(opts: {
  viewedUserId: string;
  viewerId?: string | null;
  ip?: string | null;
}): Promise<void> {
  try {
    // Do not count the owner viewing themselves.
    if (opts.viewerId && opts.viewerId === opts.viewedUserId) return;

    const since = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6h window
    const existing = await prisma.profileView.findFirst({
      where: {
        viewedUserId: opts.viewedUserId,
        createdAt: { gte: since },
        ...(opts.viewerId
          ? { viewerId: opts.viewerId }
          : { ip: opts.ip ?? "unknown" }),
      },
      select: { id: true },
    });
    if (existing) return;

    await prisma.profileView.create({
      data: {
        viewedUserId: opts.viewedUserId,
        viewerId: opts.viewerId ?? null,
        ip: opts.ip ?? null,
      },
    });
    await recordEvent({
      type: "PROFILE_VIEW",
      userId: opts.viewerId,
      targetId: opts.viewedUserId,
      ip: opts.ip,
    });
  } catch {
    // best-effort
  }
}
