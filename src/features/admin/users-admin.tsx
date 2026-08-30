"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Pencil, Trash2 } from "lucide-react";
import { Button, Card, Input, Label } from "@/components/ui";
import { apiFetch } from "@/lib/client";
import { FREE_TIER_LABEL } from "@/lib/membership";

const TIER_LABEL: Record<string, string> = {
  BRIDGEMAKER: "BridgeMaker",
  BRIDGEMASTER: "BridgeMaster",
  FREE: FREE_TIER_LABEL,
};

interface SearchRow {
  userId: string;
  fullName: string;
  username: string;
  companyName: string | null;
  membershipTier: string | null;
}

export function UsersAdmin() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [detail, setDetail] = useState<Record<string, string | number | null> | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async (query: string) => {
    setMsg(null);
    const res = await apiFetch<{ results: SearchRow[] }>(
      `/api/admin/users/search?q=${encodeURIComponent(query)}`,
    );
    if (res.ok) {
      setResults(res.data?.results ?? []);
      setSearched(true);
    } else {
      setResults([]);
      setMsg(res.error ?? "Could not load users.");
    }
  }, []);

  // Show every member on load — no need to search first.
  useEffect(() => {
    load("");
  }, [load]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    await load(q);
  }

  async function open(userId: string) {
    setMsg(null);
    setDetail(null);
    const res = await apiFetch<Record<string, string | number | null>>(`/api/admin/users/${userId}`);
    if (res.ok && res.data) {
      setDetail(res.data);
    } else {
      setMsg(res.error ?? "Could not load user.");
    }
  }

  function set<K extends string>(k: K, v: string) {
    setDetail((d) => (d ? { ...d, [k]: v } : d));
  }

  async function save() {
    if (!detail) return;
    setBusy(true);
    setMsg(null);
    const payload: Record<string, unknown> = {
      fullName: detail.fullName || undefined,
      email: detail.email || undefined,
      jobTitle: detail.jobTitle || undefined,
      companyName: detail.companyName || undefined,
      bio: detail.bio || undefined,
      points: detail.points !== undefined && detail.points !== "" ? Number(detail.points) : undefined,
      membershipTier: detail.membershipTier,
      role: detail.role,
      status: detail.status,
    };
    const res = await apiFetch(`/api/admin/users/${detail.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    setBusy(false);
    setMsg(res.ok ? "Saved." : res.error ?? "Failed to save.");
    if (res.ok) router.refresh();
  }

  async function remove() {
    if (!detail) return;
    if (!confirm(`Permanently delete ${detail.fullName || detail.email}? This cannot be undone.`)) return;
    setBusy(true);
    setMsg(null);
    const res = await apiFetch(`/api/admin/users/${detail.id}`, { method: "DELETE" });
    setBusy(false);
    setMsg(res.ok ? "Deleted." : res.error ?? "Delete failed.");
    if (res.ok) {
      setDetail(null);
      setResults([]);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={search} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3">
        <Search className="h-4 w-4 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by name, username or company… (empty = all)"
          className="h-11 w-full bg-transparent text-sm outline-none"
        />
        {q && (
          <Button type="button" size="sm" variant="outline" onClick={() => { setQ(""); load(""); }}>
            Clear
          </Button>
        )}
        <Button type="submit" size="sm">Search</Button>
      </form>
      {msg && <p className="text-sm text-red-600">{msg}</p>}

      {searched && (
        <>
        <p className="text-xs text-muted">{results.length} member{results.length === 1 ? "" : "s"}</p>
        <ul className="space-y-2">
          {results.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted">No users found.</Card>
          )}
          {results.map((r) => (
            <li key={r.userId}>
              <Card className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{r.fullName}</p>
                  <p className="truncate text-xs text-muted">
                    @{r.username}
                    {r.companyName ? ` · ${r.companyName}` : ""}
                    {` · ${TIER_LABEL[r.membershipTier ?? "FREE"]}`}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => open(r.userId)}>
                  <Pencil className="h-4 w-4" /> Manage
                </Button>
              </Card>
            </li>
          ))}
        </ul>
        </>
      )}

      {detail && (
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-bold">Manage user</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="u-name">Full name</Label>
              <Input id="u-name" value={detail.fullName ?? ""} onChange={(e) => set("fullName", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="u-email">Email</Label>
              <Input id="u-email" value={detail.email ?? ""} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="u-job">Job title</Label>
              <Input id="u-job" value={detail.jobTitle ?? ""} onChange={(e) => set("jobTitle", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="u-co">Company</Label>
              <Input id="u-co" value={detail.companyName ?? ""} onChange={(e) => set("companyName", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="u-points">Points</Label>
              <Input id="u-points" type="number" min={0} value={detail.points ?? 0} onChange={(e) => set("points", e.target.value)} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="u-tier">Package</Label>
              <select id="u-tier" value={detail.membershipTier ?? "FREE"} onChange={(e) => set("membershipTier", e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm">
                <option value="FREE">{FREE_TIER_LABEL}</option>
                <option value="BRIDGEMAKER">BridgeMaker</option>
                <option value="BRIDGEMASTER">BridgeMaster</option>
              </select>
            </div>
            <div>
              <Label htmlFor="u-role">Role</Label>
              <select id="u-role" value={detail.role ?? "USER"} onChange={(e) => set("role", e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm">
                <option value="USER">Member</option>
                <option value="BUSINESS">Business</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <Label htmlFor="u-status">Status</Label>
              <select id="u-status" value={detail.status ?? "ACTIVE"} onChange={(e) => set("status", e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm">
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="BANNED">Banned (blocked)</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="u-bio">Bio</Label>
            <textarea id="u-bio" rows={3} value={detail.bio ?? ""} onChange={(e) => set("bio", e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button onClick={save} disabled={busy}>Save changes</Button>
            <Button variant="outline" onClick={() => setDetail(null)}>Cancel</Button>
            <Button variant="danger" className="ml-auto" onClick={remove} disabled={busy}>
              <Trash2 className="h-4 w-4" /> Delete user
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
