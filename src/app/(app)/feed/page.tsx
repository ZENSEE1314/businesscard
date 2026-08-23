import Link from "next/link";
import { Compass, Trophy, IdCard } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getFeedPosts } from "@/features/feed/queries";
import { PostCard } from "@/components/post-card";
import { Composer } from "@/features/feed/composer";

export const dynamic = "force-dynamic";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const QUICK = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/awards", label: "Awards", icon: Trophy },
  { href: "/me", label: "My card", icon: IdCard },
];

export default async function FeedPage() {
  const user = await getCurrentUser();
  const { items } = await getFeedPosts({ viewerId: user?.id });
  const canPost = user?.role === "BUSINESS" || user?.role === "ADMIN";
  const firstName = user?.fullName?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 sm:px-4">
      <div className="px-1 pb-3">
        <h1 className="text-xl font-bold">
          {greeting()}, {firstName}
        </h1>
        <p className="text-sm text-muted">Connect. Exchange cards. Do business.</p>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {QUICK.map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface py-3 text-xs font-medium hover:bg-surface-2"
          >
            <q.icon className="h-5 w-5 text-brand-600" />
            {q.label}
          </Link>
        ))}
      </div>

      {canPost && <Composer />}

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
