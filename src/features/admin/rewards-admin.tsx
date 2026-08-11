"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/client";
import { timeAgo } from "@/lib/utils";

export interface AdminReward {
  id: string;
  title: string;
  pointsCost: number;
  stock: number | null;
  active: boolean;
}
export interface AdminRedemption {
  id: string;
  code: string;
  status: string;
  pointsSpent: number;
  createdAt: string;
  reward: { title: string };
  user: { email: string; profile: { fullName: string } | null };
}

export function RewardsAdmin({
  rewards,
  redemptions,
}: {
  rewards: AdminReward[];
  redemptions: AdminRedemption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    pointsCost: "500",
    stock: "",
    maxPerUser: "3",
    category: "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [rows, setRows] = useState(redemptions);
  const [rewardList, setRewardList] = useState(rewards);

  async function deleteReward(id: string, title: string) {
    if (!window.confirm(`Delete reward "${title}"?`)) return;
    const res = await apiFetch<{ deleted: boolean; archived: boolean }>(
      `/api/admin/rewards/${id}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      if (res.data?.archived) {
        setRewardList((rs) =>
          rs.map((r) => (r.id === id ? { ...r, active: false } : r)),
        );
        setMsg("Reward had redemptions, so it was archived (hidden from members).");
      } else {
        setRewardList((rs) => rs.filter((r) => r.id !== id));
      }
    }
  }

  async function createReward() {
    if (!form.title.trim()) return;
    setBusy(true);
    const res = await apiFetch<{ id: string }>("/api/admin/rewards", {
      method: "POST",
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        pointsCost: Number(form.pointsCost),
        stock: form.stock ? Number(form.stock) : null,
        maxPerUser: form.maxPerUser ? Number(form.maxPerUser) : null,
        category: form.category,
      }),
    });
    setBusy(false);
    if (res.ok && res.data) {
      setRewardList((rs) => [
        {
          id: res.data!.id,
          title: form.title,
          pointsCost: Number(form.pointsCost),
          stock: form.stock ? Number(form.stock) : null,
          active: true,
        },
        ...rs,
      ]);
      setForm({ ...form, title: "", description: "" });
      setMsg("Reward created.");
      router.refresh();
    } else setMsg(res.error ?? "Failed.");
  }

  async function setStatus(id: string, status: string) {
    const res = await apiFetch(`/api/admin/redemptions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (res.ok) setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-3 p-5">
        <h2 className="font-semibold">Create reward</h2>
        {msg && <p className="text-sm text-muted">{msg}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Free Coffee" />
          </div>
          <div>
            <Label>Points cost</Label>
            <Input type="number" value={form.pointsCost} onChange={(e) => setForm({ ...form, pointsCost: e.target.value })} />
          </div>
          <div>
            <Label>Stock (blank = unlimited)</Label>
            <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
          <div>
            <Label>Max per user</Label>
            <Input type="number" value={form.maxPerUser} onChange={(e) => setForm({ ...form, maxPerUser: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <Button onClick={createReward} disabled={busy}>
          <Plus className="h-4 w-4" /> Create reward
        </Button>
      </Card>

      <div>
        <h2 className="mb-2 font-semibold">Rewards ({rewardList.length})</h2>
        <div className="space-y-2">
          {rewardList.map((r) => (
            <Card key={r.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1 text-sm">
                <span className="font-medium">{r.title}</span>
                <span className="text-muted">
                  {" "}
                  · {r.pointsCost} pts
                  {r.stock !== null ? ` · ${r.stock} left` : ""}
                  {!r.active ? " · archived" : ""}
                </span>
              </div>
              <Button
                size="sm"
                variant="danger"
                onClick={() => deleteReward(r.id, r.title)}
                aria-label="Delete reward"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">Redemptions</h2>
        {rows.length === 0 ? (
          <Card className="p-6 text-center text-muted">No redemptions yet.</Card>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <Card key={r.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.reward.title}</span>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs">{r.status}</span>
                  </div>
                  <div className="text-sm text-muted">
                    {r.user.profile?.fullName ?? r.user.email} · {r.code} · {r.pointsSpent} pts · {timeAgo(r.createdAt)}
                  </div>
                </div>
                {(r.status === "PENDING" || r.status === "APPROVED") && (
                  <div className="flex gap-2">
                    {r.status === "PENDING" && (
                      <Button size="sm" onClick={() => setStatus(r.id, "APPROVED")}>Approve</Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "FULFILLED")}>Fulfill</Button>
                    <Button size="sm" variant="danger" onClick={() => setStatus(r.id, "REJECTED")}>Reject + refund</Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
