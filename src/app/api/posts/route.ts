import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireBusiness } from "@/lib/permissions/guards";
import { getCurrentUser } from "@/lib/auth/current-user";
import { postCreateSchema } from "@/lib/validation/post";
import { getFeedPosts, type FeedCursor } from "@/features/feed/queries";
import { awardPoints, PointEvents } from "@/lib/points/engine";
import { handle, ok, created, getClientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";

// Create a post. Business owners (and admins) only — normal users are rejected
// at the backend regardless of any UI state.
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireBusiness();
    enforceRateLimit(`post:${user.id}:${getClientIp(req)}`, 30, 60 * 60 * 1000);

    const input = postCreateSchema.parse(await req.json());
    const noneCta = input.ctaType === "NONE";

    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        body: input.body,
        status: input.status === "DRAFT" ? "DRAFT" : "PUBLISHED",
        location: input.location || null,
        websiteUrl: input.websiteUrl || null,
        ctaType: input.ctaType,
        ctaLabel: noneCta ? null : input.ctaLabel || null,
        ctaValue: noneCta ? null : input.ctaValue || null,
        images: input.images?.length
          ? {
              create: input.images.map((img, i) => ({
                url: img.url,
                thumbUrl: img.thumbUrl ?? null,
                width: img.width ?? null,
                height: img.height ?? null,
                sortOrder: i,
              })),
            }
          : undefined,
      },
      select: { id: true, status: true },
    });

    if (post.status === "PUBLISHED") {
      await awardPoints({
        userId: user.id,
        eventKey: PointEvents.CREATE_POST,
        referenceType: "post",
        referenceId: post.id,
        idempotencyKey: `create_post:${post.id}`,
      }).catch(() => undefined);
    }

    return created({ id: post.id });
  });
}

// Cursor-paginated feed for infinite scroll.
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await getCurrentUser();
    const url = new URL(req.url);
    const sort = url.searchParams.get("sort") === "popular" ? "popular" : "latest";

    let cursor: FeedCursor | null = null;
    const rawCursor = url.searchParams.get("cursor");
    if (rawCursor) {
      try {
        cursor = JSON.parse(Buffer.from(rawCursor, "base64url").toString());
      } catch {
        cursor = null;
      }
    }

    const { items, nextCursor } = await getFeedPosts({
      cursor,
      sort,
      viewerId: user?.id ?? null,
    });

    const encoded = nextCursor
      ? Buffer.from(JSON.stringify(nextCursor)).toString("base64url")
      : null;

    return ok({ items, nextCursor: encoded });
  });
}
