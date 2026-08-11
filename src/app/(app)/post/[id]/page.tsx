import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPostById } from "@/features/feed/queries";
import { PostCard } from "@/components/post-card";
import { Comments, type CommentNode } from "@/features/feed/comments";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const post = await getPostById(id, user?.id);
  if (!post) notFound();

  const commentRows = await prisma.comment.findMany({
    where: { postId: id, parentId: null, deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      author: {
        select: {
          id: true,
          profile: { select: { fullName: true, username: true, avatarUrl: true } },
        },
      },
      replies: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: {
              id: true,
              profile: {
                select: { fullName: true, username: true, avatarUrl: true },
              },
            },
          },
        },
      },
    },
  });

  const comments = JSON.parse(JSON.stringify(commentRows)) as CommentNode[];

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 sm:px-4">
      <PostCard post={post} />
      <Card className="mt-4 p-4">
        <Comments
          postId={id}
          initialComments={comments}
          currentUserId={user?.id ?? null}
          canComment={Boolean(user)}
        />
      </Card>
    </div>
  );
}
