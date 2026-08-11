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
  const hasImages = post.images.length > 0;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <Link
          href={biz ? `/business/${biz.slug}` : "#"}
          className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-50 text-sm font-bold text-brand-700"
        >
          {biz?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={biz.logoUrl} alt={biz.name} className="h-full w-full object-cover" />
          ) : (
            (biz?.name ?? "B").charAt(0)
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <Link
              href={biz ? `/business/${biz.slug}` : "#"}
              className="truncate text-sm font-semibold hover:underline"
            >
              {biz?.name ?? "Business"}
            </Link>
            {biz?.verification === "VERIFIED" && (
              <BadgeCheck className="h-4 w-4 text-blue-500" aria-label="Verified business" />
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            {biz?.category?.name && <span>{biz.category.name}</span>}
            {post.location && <span>· {post.location}</span>}
          </div>
        </div>
      </div>

      {/* Media — whole photo shown (letterboxed, never cropped), swipeable */}
      {hasImages && (
        <div className="relative bg-surface-2">
          <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
            {post.images.map((img) => (
              <Link
                key={img.id}
                href={`/post/${post.id}`}
                className="flex h-96 w-full shrink-0 snap-center items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt=""
                  loading="lazy"
                  className="max-h-full max-w-full object-contain"
                />
              </Link>
            ))}
          </div>
          {post.images.length > 1 && (
            <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
              1/{post.images.length}
            </span>
          )}
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

      {/* Caption */}
      <div className="px-4 pb-2">
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
          {biz && (
            <Link href={`/business/${biz.slug}`} className="mr-1.5 font-semibold hover:underline">
              {biz.name}
            </Link>
          )}
          {post.body}
        </p>
        {post.commentCount > 0 && (
          <Link href={`/post/${post.id}`} className="mt-1 block text-sm text-muted">
            View all {post.commentCount} comments
          </Link>
        )}
        <time className="mt-1 block text-[11px] uppercase tracking-wide text-muted-2">
          {timeAgo(post.createdAt)}
        </time>
      </div>

      {/* CTA */}
      {post.ctaType !== "NONE" && (
        <div className="px-4 pb-4">
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
    </Card>
  );
}
