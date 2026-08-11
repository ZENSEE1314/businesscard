"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/client";

export interface AdminAward {
  id: string;
  name: string;
  year: number | null;
  category: string | null;
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

function AwardRow({
  award,
  onAssign,
}: {
  award: AdminAward;
  onAssign: (awardId: string, slug: string, rank: string) => void;
}) {
  const [slug, setSlug] = useState("");
  const [rank, setRank] = useState("");
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <span className="font-semibold">
          {award.name} {award.year}
        </span>
        {award.featured && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Featured</span>
        )}
      </div>
      {award.recipients.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {award.recipients.map((r) => (
            <span key={r.id} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs">
              🏆 {r.businessProfile?.name ?? r.user?.profile?.fullName ?? "—"}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Input className="h-9 w-48" placeholder="business slug or @username" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <Input className="h-9 w-20" placeholder="rank" value={rank} onChange={(e) => setRank(e.target.value)} />
        <Button size="sm" variant="outline" disabled={!slug} onClick={() => onAssign(award.id, slug, rank)}>
          Assign winner
        </Button>
      </div>
    </Card>
  );
}
