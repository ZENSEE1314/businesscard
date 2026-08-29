"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Banknote } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { apiFetch } from "@/lib/client";

const idr = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;

const STATUS: Record<string, { text: string; cls: string }> = {
  PENDING: { text: "Pending", cls: "bg-amber-100 text-amber-700" },
  APPROVED: { text: "Approved", cls: "bg-blue-100 text-blue-700" },
  PAID: { text: "Paid", cls: "bg-green-100 text-green-700" },
  REJECTED: { text: "Rejected", cls: "bg-red-100 text-red-700" },
};

type Wd = {
  id: string;
  amountIdr: number;
  status: string;
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  note: string | null;
  adminNote: string | null;
  createdAt: string;
  user: string;
  processedByName: string | null;
};

export function WithdrawalsAdmin({ withdrawals }: { withdrawals: Wd[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});

  async function act(id: string, action: "approve" | "reject" | "paid") {
    setBusy(id);
    const res = await apiFetch(`/api/admin/withdrawals/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action, adminNote: note[id] || undefined }),
    });
    setBusy(null);
    if (res.ok) router.refresh();
    else alert(res.error ?? "Action failed.");
  }

  return (
    <div className="space-y-3">
      {withdrawals.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted">No withdrawal requests yet.</Card>
      )}
      {withdrawals.map((w) => {
        const s = STATUS[w.status] ?? STATUS.PENDING;
        const open = w.status === "PENDING";
        return (
          <Card key={w.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{idr(w.amountIdr)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>{s.text}</span>
                </div>
                <p className="mt-1 text-sm font-medium">{w.user}</p>
                <p className="text-xs text-muted">
                  {w.bankName} · {w.accountNumber} ({w.accountHolder})
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  Requested {new Date(w.createdAt).toLocaleString("en", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                {w.note && <p className="mt-1 text-xs text-muted">Note: {w.note}</p>}
                {w.adminNote && <p className="mt-1 text-xs text-muted">Admin note: {w.adminNote}</p>}
              </div>
            </div>
            {open ? (
              <div className="mt-3 flex flex-col gap-2">
                <input
                  value={note[w.id] ?? ""}
                  onChange={(e) => setNote((n) => ({ ...n, [w.id]: e.target.value }))}
                  placeholder="Admin note (optional)"
                  className="h-10 rounded-xl border border-border bg-surface px-3 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={busy === w.id} onClick={() => act(w.id, "approve")}>
                    <Check className="h-4 w-4" /> Approve
                  </Button>
                  <Button size="sm" variant="danger" disabled={busy === w.id} onClick={() => act(w.id, "reject")}>
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </div>
              </div>
            ) : (
              w.status === "APPROVED" && (
                <div className="mt-3">
                  <Button size="sm" disabled={busy === w.id} onClick={() => act(w.id, "paid")}>
                    <Banknote className="h-4 w-4" /> Mark paid
                  </Button>
                </div>
              )
            )}
          </Card>
        );
      })}
    </div>
  );
}
