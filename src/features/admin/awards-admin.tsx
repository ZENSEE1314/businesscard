"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, BadgeCheck, X, Pencil, Trash2, Check } from "lucide-react";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/client";

interface SearchResult {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  companyName: string | null;
  membershipTier: string | null;
  business: {
    slug: string;
    name: string;
    logoUrl: string | null;
    category: string | null;
    verified: boolean;
  } | null;
  handle: string;
}

export interface AdminAward {
  id: string;
  name: string;
  year: number | null;
  category: string | null;
  description?: string | null;
  active?: boolean;
  featured: boolean;
  recipients: {
    id: string;
    businessProfile: { name: string } | null;
    user: { profile: { fullName: string } | null } | null;
  }[];
}

export function AwardsAdmin({ awards }: { awards: AdminAward[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    category: "",
    year: String(new Date().getFullYear()),
    description: "",
    featured: false,
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createAward() {
    if (!form.name.trim()) return;
    setBusy(true);
    const res = await apiFetch("/api/admin/awards", {
      method: "POST",
      body: JSON.stringify({
        name: form.name,
        category: form.category,
        year: form.year ? Number(form.year) : null,
        description: form.description,
        featured: form.featured,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setForm({ ...form, name: "", description: "" });
      setMsg("Award created.");
      router.refresh();
    } else setMsg(res.error ?? "Failed.");
  }

  async function assign(awardId: string, slug: string, rank: string) {
    const res = await apiFetch(`/api/admin/awards/${awardId}/winners`, {
      method: "POST",
      body: JSON.stringify({ businessSlug: slug, rank: rank ? Number(rank) : null }),
    });
    if (res.ok) router.refresh();
    else alert(res.error ?? "Failed to assign.");
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-3 p-5">
        <h2 className="font-semibold">Create award</h2>
        {msg && <p className="text-sm text-muted">{msg}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Top Entertainment" />
          </div>
          <div>
            <Label>Category</Label>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Entertainment" />
          </div>
          <div>
            <Label>Year</Label>
            <Input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
            Featured
          </label>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <Button onClick={createAward} disabled={busy}>
          <Plus className="h-4 w-4" /> Create award
        </Button>
      </Card>

      <div className="space-y-3">
        <h2 className="font-semibold">Awards</h2>
        {awards.map((a) => (
          <AwardRow key={a.id} award={a} onAssign={assign} />
        ))}
      </div>
    </div>
  );
}

function Thumb({ url, fallback }: { url: string | null; fallback: string }) {
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-brand-50 text-sm font-bold text-brand-700">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        fallback.charAt(0)
      )}
    </div>
  );
}

function AwardRow({
  award,
  onAssign,
}: {
  award: AdminAward;
  onAssign: (awardId: string, handle: string, rank: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [rank, setRank] = useState("");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busyEdit, setBusyEdit] = useState(false);
  const [editMsg, setEditMsg] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: award.name,
    category: award.category ?? "",
    year: award.year ? String(award.year) : "",
    description: award.description ?? "",
    featured: award.featured,
  });

  useEffect(() => {
    if (selected) return;
    const q = query.trim();
    const timer = setTimeout(async () => {
      if (q.length < 1) {
        setResults([]);
        setOpen(false);
        return;
      }
      const res = await apiFetch<{ results: SearchResult[] }>(
        `/api/admin/users/search?q=${encodeURIComponent(q)}`,
      );
      if (res.ok && res.data) {
        setResults(res.data.results);
        setOpen(true);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, selected]);

  function assign() {
    if (!selected) return;
    onAssign(award.id, selected.handle, rank);
    setSelected(null);
    setRank("");
    setQuery("");
  }

  async function saveEdit() {
    setBusyEdit(true);
    setEditMsg(null);
    const res = await apiFetch(`/api/admin/awards/${award.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: editForm.name,
        category: editForm.category,
        year: editForm.year ? Number(editForm.year) : null,
        description: editForm.description,
        featured: editForm.featured,
      }),
    });
    setBusyEdit(false);
    if (res.ok) {
      setEditing(false);
      router.refresh();
    } else {
      setEditMsg(res.error ?? "Failed.");
    }
  }

  async function deleteAward() {
    if (!confirm(`Delete award "${award.name}"? Winners will be removed too.`)) return;
    const res = await apiFetch(`/api/admin/awards/${award.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else alert(res.error ?? "Failed to delete.");
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <span className="font-semibold">
          {award.name} {award.year}
        </span>
        {award.featured && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
            Featured
          </span>
        )}
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-surface-2"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            type="button"
            onClick={deleteAward}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-danger hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </div>
      {editing && (
        <div className="mt-3 space-y-3 rounded-xl border border-border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} />
            </div>
            <div>
              <Label>Year</Label>
              <Input value={editForm.year} onChange={(e) => setEditForm({ ...editForm, year: e.target.value })} />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" checked={editForm.featured}
                onChange={(e) => setEditForm({ ...editForm, featured: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
              Featured
            </label>
          </div>
          <Label>Description</Label>
          <Textarea rows={2} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
          <div className="flex gap-2">
            <Button size="sm" onClick={saveEdit} disabled={busyEdit}>
              <Check className="h-4 w-4" /> Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            {editMsg && <span className="text-sm text-red-600">{editMsg}</span>}
          </div>
        </div>
      )}
      {award.recipients.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {award.recipients.map((r) => (
            <span key={r.id} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs">
              🏆 {r.businessProfile?.name ?? r.user?.profile?.fullName ?? "—"}
            </span>
          ))}
        </div>
      )}

      {selected ? (
        <div className="mt-3 rounded-xl border border-border p-3">
          {/* Selected recipient — shows their company profile */}
          <div className="flex items-center gap-3">
            <Thumb
              url={selected.business?.logoUrl ?? selected.avatarUrl}
              fallback={selected.business?.name ?? selected.fullName}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-semibold">
                  {selected.business?.name ?? selected.fullName}
                </span>
                {selected.business?.verified && (
                  <BadgeCheck className="h-4 w-4 text-blue-500" />
                )}
              </div>
              <div className="text-xs text-muted">
                {selected.business
                  ? [selected.business.category, `owner: ${selected.fullName}`]
                      .filter(Boolean)
                      .join(" · ")
                  : [selected.jobTitle, selected.companyName, "personal member"]
                      .filter(Boolean)
                      .join(" · ")}
              </div>
              <div className="text-xs text-muted-2">@{selected.username}</div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-muted hover:text-foreground"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Input
              className="h-9 w-24"
              placeholder="rank"
              value={rank}
              onChange={(e) => setRank(e.target.value)}
            />
            <Button size="sm" onClick={assign}>
              Assign winner
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative mt-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3">
            <Search className="h-4 w-4 text-muted" />
            <input
              className="h-10 w-full bg-transparent text-sm outline-none"
              placeholder="Search a member or company…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setOpen(true)}
            />
          </div>
          {open && results.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-surface p-1 shadow-lg">
              {results.map((r) => (
                <button
                  key={r.userId}
                  type="button"
                  onClick={() => {
                    setSelected(r);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-surface-2"
                >
                  <Thumb
                    url={r.business?.logoUrl ?? r.avatarUrl}
                    fallback={r.business?.name ?? r.fullName}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {r.business?.name ?? r.fullName}
                    </div>
                    <div className="truncate text-xs text-muted">
                      {r.business
                        ? `${r.business.category ?? "Business"} · ${r.fullName}`
                        : `${r.jobTitle ?? "Member"}${r.companyName ? ` · ${r.companyName}` : ""}`}{" "}
                      · @{r.username}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
