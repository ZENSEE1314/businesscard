import { getCurrentUser } from "@/lib/auth/current-user";
import { getFeedPosts } from "@/features/feed/queries";
import { PostCard } from "@/components/post-card";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const user = await getCurrentUser();
  const { items } = await getFeedPosts({ viewerId: user?.id });

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 sm:px-4">
      <h1 className="px-1 pb-3 text-xl font-bold">Feed</h1>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
          No posts yet. Check back soon.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
