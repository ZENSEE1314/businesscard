import { prisma } from "@/lib/db/prisma";
import { FeedModeration, type AdminPost } from "@/features/admin/feed-moderation";

export const dynamic = "force-dynamic";

export default async function AdminFeedPage() {
  const rows = await prisma.post.findMany({
    where: { status: { not: "DELETED" } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      author: {
        select: { businessProfile: { select: { name: true, slug: true } } },
      },
    },
  });
  const initial = JSON.parse(JSON.stringify(rows)) as AdminPost[];

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Feed moderation</h1>
      <FeedModeration initial={initial} />
    </div>
  );
}
