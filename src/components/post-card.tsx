import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui";
import { timeAgo, whatsappNumber, absoluteUrl } from "@/lib/utils";
import { PostActions } from "@/features/feed/post-actions";
import type { FeedPost } from "@/features/feed/queries";

export function PostCard({ post }: { post: FeedPost }) {
  const biz = post.author.businessProfile;
  const liked = Array.isArray(post.likes) && post.likes.length > 0;
  const bookmarked = Array.isArray(post.bookmarks) && post.bookmarks.length > 0;
  const wa = whatsappNumber(post.ctaValue);

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-50 text-sm font-bold text-brand-700">
          {biz?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={biz.logoUrl} alt={biz.name} className="h-full w-full object-cover" />
          ) : (
            (biz?.name ?? "B").charAt(0)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={biz ? `/business/${biz.slug}` : "#"}
              className="truncate font-semibold hover:underline"
            >
              {biz?.name ?? "Business"}
            </Link>
            {biz?.verification === "VERIFIED" && (
              <BadgeCheck className="h-4 w-4 text-blue-500" aria-label="Verified business" />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            {biz?.category?.name && <span>{biz.category.name}</span>}
            <span>·</span>
            <time>{timeAgo(post.createdAt)}</time>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-3">
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{post.body}</p>
        {post.location && (
          <p className="mt-2 text-sm text-muted">📍 {post.location}</p>
        )}
      </div>

      {/* Images */}
      {post.images.length > 0 && (
        <div
          className={`grid gap-0.5 ${post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
        >
          {post.images.slice(0, 4).map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img.id}
              src={img.url}
              alt=""
              loading="lazy"
              className="h-full max-h-96 w-full object-cover"
            />
          ))}
        </div>
      )}

      {/* CTA */}
      {post.ctaType !== "NONE" && (
        <div className="px-4 pt-3">
          {post.ctaType === "WHATSAPP" && wa ? (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center rounded-lg bg-green-500 px-4 text-sm font-medium text-white"
            >
              {post.ctaLabel ?? "WhatsApp"}
            </a>
          ) : post.ctaType === "WEBSITE" && post.websiteUrl ? (
            <a
              href={post.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center rounded-lg bg-surface-2 px-4 text-sm font-medium"
            >
              {post.ctaLabel ?? "Visit website"}
            </a>
          ) : null}
        </div>
      )}

      {/* Actions */}
      <PostActions
        postId={post.id}
        initialLiked={liked}
        initialLikeCount={post.likeCount}
        initialBookmarked={bookmarked}
        commentCount={post.commentCount}
        postUrl={absoluteUrl(`/post/${post.id}`)}
      />
    </Card>
  );
}
