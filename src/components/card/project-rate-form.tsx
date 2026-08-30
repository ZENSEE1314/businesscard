"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/client";

/** Rate + comment on a single project. One rating per person (updates). */
export function ProjectRateForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [open, setOpen] = useState(false);

  async function submit() {
    if (rating < 1) {
      setError("Pick a star rating.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await apiFetch(`/api/projects/${projectId}/rate`, {
      method: "POST",
      body: JSON.stringify({ rating, comment: comment.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Could not save your rating.");
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) {
    return <p className="mt-2 text-xs text-green-700">Thanks for rating this project!</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        <Star className="h-3.5 w-3.5" /> Rate this project
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-border bg-surface p-2.5">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
          >
            <Star
              className={`h-5 w-5 ${
                (hover || rating) >= n ? "fill-amber-400 text-amber-400" : "text-muted-2"
              }`}
            />
          </button>
        ))}
      </div>
      <textarea
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comment (optional)"
        className="mt-2 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand-500"
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          onClick={submit}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg disabled:opacity-60"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Post
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
