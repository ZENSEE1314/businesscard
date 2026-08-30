"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/client";

/**
 * Lets a signed-in viewer leave a star rating + comment for a card owner
 * ("Who I have helped"). One review per person; submitting again updates it.
 */
export function ReviewForm({ subjectUserId }: { subjectUserId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (rating < 1) {
      setError("Please pick a star rating.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await apiFetch("/api/reviews", {
      method: "POST",
      body: JSON.stringify({ subjectUserId, rating, comment: comment.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Could not save your review.");
      return;
    }
    setDone(true);
    setComment("");
    router.refresh();
  }

  if (done) {
    return (
      <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
        Thanks! Your review has been posted.
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-surface-2 p-3">
      <p className="text-sm font-medium">Did this person help you? Leave a review.</p>
      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="p-0.5"
          >
            <Star
              className={`h-6 w-6 ${
                (hover || rating) >= n
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-2"
              }`}
            />
          </button>
        ))}
      </div>
      <textarea
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share how they helped (optional)"
        className="mt-2 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-brand-500"
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      <button
        onClick={submit}
        disabled={busy}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg disabled:opacity-60"
      >
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Post review
      </button>
    </div>
  );
}
