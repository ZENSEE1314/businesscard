"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/client";
import { timeAgo } from "@/lib/utils";
import { TranslateButton } from "@/components/translate-button";
import { useT } from "@/lib/i18n/client";

interface CommentAuthor {
  id: string;
  profile: { fullName: string; username: string; avatarUrl: string | null } | null;
}
export interface CommentNode {
  id: string;
  body: string;
  createdAt: string;
  author: CommentAuthor;
  replies?: CommentNode[];
}

function Avatar({ author }: { author: CommentAuthor }) {
  const name = author.profile?.fullName ?? "?";
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-50 text-sm font-bold text-brand-700">
      {author.profile?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={author.profile.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        name.charAt(0)
      )}
    </div>
  );
}

function CommentItem({
  comment,
  currentUserId,
  onDelete,
}: {
  comment: CommentNode;
  currentUserId: string | null;
  onDelete: (id: string) => void;
}) {
  const canDelete = currentUserId === comment.author.id;
  return (
    <div className="flex gap-3">
      <Avatar author={comment.author} />
      <div className="flex-1">
        <div className="rounded-2xl bg-surface-2 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">
              {comment.author.profile?.fullName ?? "Member"}
            </span>
            {canDelete && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-muted hover:text-danger"
                aria-label="Delete comment"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="mt-0.5 whitespace-pre-wrap text-sm">{comment.body}</p>
        </div>
        <div className="ml-3 mt-0.5 flex items-center gap-3">
          <span className="text-xs text-muted">{timeAgo(comment.createdAt)}</span>
          <TranslateButton text={comment.body} />
        </div>
      </div>
    </div>
  );
}

export function Comments({
  postId,
  initialComments,
  currentUserId,
  canComment,
}: {
  postId: string;
  initialComments: CommentNode[];
  currentUserId: string | null;
  canComment: boolean;
}) {
  const t = useT();
  const [comments, setComments] = useState<CommentNode[]>(initialComments);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await apiFetch<{ comment: CommentNode; pointsAwarded: boolean }>(
      `/api/posts/${postId}/comments`,
      { method: "POST", body: JSON.stringify({ body }) },
    );
    setBusy(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? "Could not post comment.");
      return;
    }
    setComments((c) => [...c, res.data!.comment]);
    setBody("");
    if (res.data.pointsAwarded) setNotice("You earned points for commenting! 🎉");
  }

  async function remove(id: string) {
    const prev = comments;
    setComments((c) => c.filter((x) => x.id !== id));
    const res = await apiFetch(`/api/comments/${id}`, { method: "DELETE" });
    if (!res.ok) setComments(prev);
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">{t("hub.comments", { n: comments.length })}</h2>

      {canComment ? (
        <form onSubmit={submit} className="space-y-2">
          {error && <p className="text-sm text-danger">{error}</p>}
          {notice && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success">{notice}</p>
          )}
          <Textarea
            rows={2}
            placeholder={t("hub.addComment")}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? t("act.posting") : t("hub.comment")}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted">{t("hub.loginToComment")}</p>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-muted">{t("hub.beFirstComment")}</p>
        ) : (
          comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUserId={currentUserId}
              onDelete={remove}
            />
          ))
        )}
      </div>
    </div>
  );
}
