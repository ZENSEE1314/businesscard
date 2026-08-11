"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { apiFetch } from "@/lib/client";
import { timeAgo } from "@/lib/utils";

export interface MembershipRow {
  id: string;
  tier: string;
  status: string;
  priceIdr: number;
  orderCode: string;
  paymentNote: string | null;
  createdAt: string;
  user: {
    email: string;
    profile: { fullName: string; username: string } | null;
  };
}

function idr(n: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;
}

export function MembershipReview({ initial }: { initial: MembershipRow[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function approve(id: string) {
    setBusy(id);
    const res = await apiFetch(`/api/admin/memberships/${id}/approve`, {
      method: "POST",
    });
    setBusy(null);
    if (res.ok) {
      setRows((r) => r.map((m) => (m.id === id ? { ...m, status: "ACTIVE" } : m)));
    }
  }

  async function reject(id: string) {
    const reason = window.prompt("Reason for rejection (optional):") ?? "";
    setBusy(id);
    const res = await apiFetch(`/api/admin/memberships/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    setBusy(null);
    if (res.ok) {
      setRows((r) => r.map((m) => (m.id === id ? { ...m, status: "REJECTED" } : m)));
    }
  }

  if (rows.length === 0) {
    return (
      <Card className="p-8 text-center text-muted">No membership orders yet.</Card>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((m) => (
        <Card key={m.id} className="flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {m.user.profile?.fullName ?? m.user.email}
              </span>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                {m.tier}
              </span>
              <StatusBadge status={m.status} />
            </div>
            <div className="text-sm text-muted">
              {m.user.email} · {idr(m.priceIdr)} · {m.orderCode} · {timeAgo(m.createdAt)}
            </div>
            {m.paymentNote && (
              <div className="mt-1 text-xs text-muted">Note: {m.paymentNote}</div>
            )}
          </div>
          {m.status === "PENDING" && (
            <div className="flex gap-2">
              <Button size="sm" disabled={busy === m.id} onClick={() => approve(m.id)}>
                <Check className="h-4 w-4" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy === m.id}
                onClick={() => reject(m.id)}
              >
                <X className="h-4 w-4" /> Reject
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700",
    ACTIVE: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    EXPIRED: "bg-surface-2 text-muted",
    CANCELLED: "bg-surface-2 text-muted",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? ""}`}>
      {status}
    </span>
  );
}
