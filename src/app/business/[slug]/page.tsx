import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getBusinessCard } from "@/features/cards/queries";
import { getCurrentUser } from "@/lib/auth/current-user";
import { recordProfileView } from "@/lib/analytics";
import { PublicCard } from "@/components/card/public-card";
import { PostCard } from "@/components/post-card";
import { getFeedPosts } from "@/features/feed/queries";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? "0.0.0.0").trim();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const card = await getBusinessCard(slug);
  if (!card) return { title: "Not found" };
  const description = card.bio ?? `${card.name} on ${env.appName}`;
  return {
    title: card.name,
    description,
    openGraph: {
      title: card.name,
      description,
      url: card.profileUrl,
      images: card.avatarUrl ? [{ url: card.avatarUrl }] : undefined,
    },
    alternates: { canonical: card.profileUrl },
  };
}

export default async function BusinessCardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const card = await getBusinessCard(slug);
  if (!card) notFound();

  const viewer = await getCurrentUser();
  await recordProfileView({
    viewedUserId: card.userId,
    viewerId: viewer?.id ?? null,
    ip: await clientIp(),
  });

  // Recent posts by this business.
  const { items: posts } = await getFeedPosts({
    authorId: card.userId,
    viewerId: viewer?.id ?? null,
  });

  return (
    <main className="min-h-dvh px-4 py-8 aurora">
      <PublicCard
        card={card}
        isGuest={!viewer}
        isOwner={viewer?.id === card.userId}
      />
      {posts.length > 0 && (
        <div className="mx-auto mt-6 w-full max-w-md space-y-4">
          <h2 className="px-1 text-sm font-semibold text-muted">Recent posts</h2>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </main>
  );
}
