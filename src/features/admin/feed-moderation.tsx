"use client";

import { useState } from "react";
import Link from "next/link";
import { EyeOff, Eye, Trash2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { apiFetch } from "@/lib/client";
import { timeAgo } from "@/lib/utils";

export interface AdminPost {
  id: string;
  body: string;
  status: string;
  createdAt: string;
  author: { businessProfile: { name: string; slug: string } | null };
}

export function FeedModeration({ initial }: { initial: AdminPost[] }) {
  const [posts, setPosts] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function moderate(id: string, status: string) {
    if (status === "DELETED" && !window.confirm("Delete this post?")) return;
    setBusy(id);
    const res = await apiFetch(`/api/admin/posts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setBusy(null);
    if (res.ok) {
      setPosts((p) => p.map((x) => (x.id === id ? { ...x, status } : x)));
    }
  }

  if (posts.length === 0) {
    return <Card className="p-8 text-center text-muted">No posts.</Card>;
  }

  return (
    <div className="space-y-2">
      {posts.map((p) => (
        <Card key={p.id} className="flex flex-wrap items-center gap-3 p-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link href={`/post/${p.id}`} className="font-medium hover:underline">
                {p.author.businessProfile?.name ?? "Business"}
              </Link>
              <StatusBadge status={p.status} />
            </div>
            <p className="truncate text-sm text-muted">{p.body}</p>
            <span className="text-xs text-muted-2">{timeAgo(p.createdAt)}</span>
          </div>
          <div className="flex gap-2">
            {p.status === "PUBLISHED" ? (
              <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => moderate(p.id, "HIDDEN")}>
                <EyeOff className="h-4 w-4" /> Hide
              </Button>
            ) : p.status === "HIDDEN" ? (
              <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => moderate(p.id, "PUBLISHED")}>
                <Eye className="h-4 w-4" /> Restore
              </Button>
            ) : null}
            {p.status !== "DELETED" && (
              <Button size="sm" variant="danger" disabled={busy === p.id} onClick={() => moderate(p.id, "DELETED")}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PUBLISHED: "bg-green-100 text-green-700",
    HIDDEN: "bg-amber-100 text-amber-700",
    DELETED: "bg-red-100 text-red-700",
    DRAFT: "bg-surface-2 text-muted",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? ""}`}>
      {status}
    </span>
  );
}
