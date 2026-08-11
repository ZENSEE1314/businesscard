import "server-only";
import { prisma } from "@/lib/db/prisma";

export const FEED_PAGE_SIZE = 10;

export interface FeedCursor {
  createdAt: string;
  id: string;
}

// Cursor-paginated published feed. Never loads the whole table.
export async function getFeedPosts(opts: {
  cursor?: FeedCursor | null;
  sort?: "latest" | "popular";
  viewerId?: string | null;
}) {
  const { cursor, sort = "latest", viewerId } = opts;

  const orderBy =
    sort === "popular"
      ? [{ likeCount: "desc" as const }, { createdAt: "desc" as const }]
      : [{ createdAt: "desc" as const }, { id: "desc" as const }];

  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      ...(cursor && sort === "latest"
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.createdAt) } },
              {
                createdAt: new Date(cursor.createdAt),
                id: { lt: cursor.id },
              },
            ],
          }
        : {}),
    },
    orderBy,
    take: FEED_PAGE_SIZE + 1,
    ...(cursor && sort === "popular"
      ? { skip: 1, cursor: { id: cursor.id } }
      : {}),
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      author: {
        select: {
          id: true,
          businessProfile: {
            select: {
              slug: true,
              name: true,
              logoUrl: true,
              verification: true,
              category: { select: { name: true } },
            },
          },
        },
      },
      likes: viewerId
        ? { where: { userId: viewerId }, select: { id: true } }
        : false,
      bookmarks: viewerId
        ? { where: { userId: viewerId }, select: { id: true } }
        : false,
    },
  });

  const hasMore = posts.length > FEED_PAGE_SIZE;
  const items = hasMore ? posts.slice(0, FEED_PAGE_SIZE) : posts;
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last
      ? { createdAt: last.createdAt.toISOString(), id: last.id }
      : null;

  return { items, nextCursor };
}

export type FeedPost = Awaited<ReturnType<typeof getFeedPosts>>["items"][number];
