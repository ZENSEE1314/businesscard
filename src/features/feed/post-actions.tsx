"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Bookmark, Share2 } from "lucide-react";
import { apiFetch } from "@/lib/client";

export function PostActions({
  postId,
  initialLiked,
  initialLikeCount,
  initialBookmarked,
  commentCount,
  postUrl,
}: {
  postId: string;
  initialLiked: boolean;
  initialLikeCount: number;
  initialBookmarked: boolean;
  commentCount: number;
  postUrl: string;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [busy, setBusy] = useState(false);

  async function toggleLike() {
    if (busy) return;
    setBusy(true);
    // Optimistic update.
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    const res = await apiFetch<{ liked: boolean; likeCount: number }>(
      `/api/posts/${postId}/like`,
      { method: "POST" },
    );
    if (res.ok && res.data) {
      setLiked(res.data.liked);
      setLikeCount(res.data.likeCount);
    } else {
      // revert
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
    setBusy(false);
  }

  async function toggleBookmark() {
    const next = !bookmarked;
    setBookmarked(next);
    const res = await apiFetch<{ bookmarked: boolean }>(
      `/api/posts/${postId}/bookmark`,
      { method: "POST" },
    );
    if (res.ok && res.data) setBookmarked(res.data.bookmarked);
    else setBookmarked(!next);
  }

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ url: postUrl }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(postUrl).catch(() => {});
    }
  }

  return (
    <div className="flex items-center gap-1 p-2 pt-3 text-sm text-muted">
      <button
        onClick={toggleLike}
        aria-pressed={liked}
        aria-label="Like"
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 hover:bg-surface-2"
      >
        <Heart className={`h-[18px] w-[18px] ${liked ? "fill-red-500 text-red-500" : ""}`} />
        {likeCount}
      </button>
      <Link
        href={`/post/${postId}`}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 hover:bg-surface-2"
      >
        <MessageCircle className="h-[18px] w-[18px]" />
        {commentCount}
      </Link>
      <button
        onClick={toggleBookmark}
        aria-pressed={bookmarked}
        aria-label="Bookmark"
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 hover:bg-surface-2"
      >
        <Bookmark className={`h-[18px] w-[18px] ${bookmarked ? "fill-primary text-primary" : ""}`} />
      </button>
      <button
        onClick={share}
        aria-label="Share"
        className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 hover:bg-surface-2"
      >
        <Share2 className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}
