"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Loader2, Search } from "lucide-react";
import { apiFetch } from "@/lib/client";
import type { TreeNode } from "@/features/admin/tree";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-amber-100 text-amber-700",
  DORMANT: "bg-red-100 text-red-700",
  NEW: "bg-blue-100 text-blue-700",
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function NodeRow({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const dimmed = node.activityStatus === "DORMANT" || node.activityStatus === "INACTIVE";
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2 ${dimmed ? "opacity-70" : ""}`}
      style={{ marginLeft: `${depth * 20}px` }}
    >
      <button
        onClick={onToggle}
        disabled={!node.hasChildren}
        aria-expanded={node.hasChildren ? expanded : undefined}
        aria-label={node.hasChildren ? `Toggle ${node.name}'s branch` : undefined}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-md hover:bg-surface-2 disabled:opacity-30"
      >
        {node.loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : node.hasChildren ? (
          expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )
        ) : null}
      </button>

      {node.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={node.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
      ) : (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700">
          {initials(node.name)}
        </div>
      )}

      <div className="min-w-[180px]">
        <p className="text-sm font-medium leading-tight">{node.name}</p>
        <p className="text-xs text-muted">
          {[node.companyName, node.membershipTier].filter(Boolean).join(" · ") || "—"}
        </p>
      </div>

      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[node.activityStatus]}`}>
        {node.activityStatus}
      </span>
      <span className="text-xs text-muted">Joined {node.memberDays}d ago</span>
      <span className="text-xs text-muted">
        Last login:{" "}
        {node.daysSinceLogin === null
          ? "never"
          : node.daysSinceLogin === 0
            ? "today"
            : `${node.daysSinceLogin}d ago`}
      </span>
      <span className="text-xs text-muted">{node.points} pts</span>
      <span className="text-xs text-muted">{node.contactCount} contacts</span>
      <span className="text-xs text-muted">
        {node.directReferrals} direct
        {node.totalDescendants !== null ? ` · ${node.totalDescendants} total` : ""}
      </span>
    </div>
  );
}

function Branch({
  node,
  depth,
}: {
  node: TreeNode & { loading?: boolean };
  depth: number;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const [children, setChildren] = useState<TreeNode[] | null>(node.children ?? null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!expanded && children === null) {
      setLoading(true);
      const res = await apiFetch<TreeNode[]>(
        `/api/admin/users/tree?parentId=${encodeURIComponent(node.id)}`,
      );
      setLoading(false);
      setChildren(res.ok ? res.data : []);
    }
    setExpanded((e) => !e);
  }

  return (
    <li>
      <NodeRow
        node={{ ...node, loading }}
        depth={depth}
        expanded={expanded}
        onToggle={toggle}
      />
      {expanded && children && children.length > 0 && (
        <ul className="border-l border-border/60" style={{ marginLeft: `${depth * 20 + 12}px` }}>
          {children.map((child) => (
            <Branch key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
      {expanded && children?.length === 0 && depth > 0 && (
        <p className="py-1 text-xs text-muted" style={{ marginLeft: `${(depth + 1) * 20}px` }}>
          No referred members yet.
        </p>
      )}
    </li>
  );
}

export function ReferralTree({ roots }: { roots: TreeNode[] }) {
  const [query, setQuery] = useState("");
  const [jumpPath, setJumpPath] = useState<TreeNode[] | null>(null);
  const [jumpError, setJumpError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setJumpError(null);
    // Resolve username → user id through the activity search endpoint's data:
    // simplest reliable path is the tree API with a username lookup done by
    // the server component route below.
    const res = await apiFetch<{ path: TreeNode[] }>(
      `/api/admin/users/tree?username=${encodeURIComponent(query.trim())}`,
    );
    setSearching(false);
    if (!res.ok) {
      setJumpError(res.error ?? "Search failed.");
      setJumpPath(null);
      return;
    }
    setJumpPath(res.data.path);
  }

  return (
    <div className="space-y-3">
      <form onSubmit={search} className="flex gap-2" role="search">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to member by username…"
            aria-label="Search tree"
            className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg disabled:opacity-60"
        >
          {searching ? "Searching…" : "Find"}
        </button>
      </form>

      {jumpError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
          {jumpError}
        </p>
      )}

      {jumpPath && (
        <section className="rounded-xl border border-border bg-surface p-3">
          <h2 className="mb-2 px-2 text-sm font-semibold">Path to member</h2>
          <ul>
            {jumpPath.map((n, i) => (
              <Branch key={`${n.id}-${i}`} node={n} depth={i} />
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-border bg-surface p-3">
        <h2 className="mb-2 px-2 text-sm font-semibold">Network roots (no referrer)</h2>
        {roots.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted">No users match the current filters.</p>
        ) : (
          <ul>
            {roots.map((r) => (
              <Branch key={r.id} node={r} depth={0} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}