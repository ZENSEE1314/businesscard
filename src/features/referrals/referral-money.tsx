"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Plus } from "lucide-react";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/client";

const idr = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;

export interface MoneyState {
  total: number;
  paid: number;
  pending: number;
  available: number;
  minWithdrawalIdr: number;
  earnings: { id: string; amountIdr: number; tierLabel: string; memberName: string | null; createdAt: string }[];
  withdrawals: {
    id: string;
    amountIdr: number;
    status: "PENDING" | "APPROVED" | "PAID" | "REJECTED";
    bankName: string | null;
    accountNumber: string | null;
    accountHolder: string | null;
    adminNote: string | null;
    createdAt: string;
  }[];
}

const statusLabel: Record<string, { text: string; cls: string }> = {
  PENDING: { text: "Pending review", cls: "bg-amber-100 text-amber-700" },
  APPROVED: { text: "Approved — paying", cls: "bg-blue-100 text-blue-700" },
  PAID: { text: "Paid", cls: "bg-green-100 text-green-700" },
  REJECTED: { text: "Rejected", cls: "bg-red-100 text-red-700" },
};

export function ReferralMoney({ data }: { data: MoneyState }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ amountIdr: "", bankName: "", accountNumber: "", accountHolder: "", note: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await apiFetch("/api/referrals/withdrawals", {
      method: "POST",
      body: JSON.stringify({ ...form, amountIdr: Number(form.amountIdr) }),
    });
    setBusy(false);
    if (res.ok) {
      setForm({ amountIdr: "", bankName: "", accountNumber: "", accountHolder: "", note: "" });
      setOpen(false);
      router.refresh();
    } else {
      setMsg(res.error ?? "Failed to request withdrawal.");
    }
  }

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <Wallet className="h-4 w-4 text-brand-600" /> Referral money
      </h2>
      <p className="mt-1 text-sm text-muted">
        When someone you refer joins as a paid member (BridgeMaker / BridgeMaster),
        you earn <span className="font-semibold text-foreground">20% commission</span> on
        their membership fee.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-brand-50 p-3 text-center">
          <p className="text-lg font-bold text-brand-700">{idr(data.total)}</p>
          <p className="text-[11px] text-muted">Earned</p>
        </div>
        <div className="rounded-xl bg-surface-2 p-3 text-center">
          <p className="text-lg font-bold">{idr(data.available)}</p>
          <p className="text-[11px] text-muted">Available</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3 text-center">
          <p className="text-lg font-bold text-amber-700">{idr(data.pending)}</p>
          <p className="text-[11px] text-muted">In review</p>
        </div>
        <div className="rounded-xl bg-green-50 p-3 text-center">
          <p className="text-lg font-bold text-green-700">{idr(data.paid)}</p>
          <p className="text-[11px] text-muted">Paid out</p>
        </div>
      </div>

      <div className="mt-4">
        {!open ? (
          <Button type="button" variant="outline" size="sm"
            disabled={data.available < data.minWithdrawalIdr}
            onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Request withdrawal
          </Button>
        ) : (
          <form onSubmit={submit} className="space-y-3 rounded-xl border border-border p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="wd-amount">Amount (min {idr(data.minWithdrawalIdr)})</Label>
                <Input id="wd-amount" type="number" required min={data.minWithdrawalIdr} max={data.available}
                  value={form.amountIdr} onChange={(e) => setForm((f) => ({ ...f, amountIdr: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="wd-bank">Bank name</Label>
                <Input id="wd-bank" required value={form.bankName}
                  onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="wd-acct">Account number</Label>
                <Input id="wd-acct" required value={form.accountNumber}
                  onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="wd-holder">Account holder</Label>
                <Input id="wd-holder" required value={form.accountHolder}
                  onChange={(e) => setForm((f) => ({ ...f, accountHolder: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label htmlFor="wd-note">Note (optional)</Label>
              <Textarea id="wd-note" rows={2} maxLength={300} value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
            {msg && <p className="text-sm text-red-600">{msg}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={busy}>Submit request</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </form>
        )}
      </div>

      {data.withdrawals.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold">Withdrawal history</h3>
          <ul className="mt-2 space-y-2">
            {data.withdrawals.map((w) => {
              const s = statusLabel[w.status] ?? statusLabel.PENDING;
              return (
                <li key={w.id} className="rounded-xl border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{idr(w.amountIdr)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>
                      {s.text}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {w.bankName} · {w.accountNumber} ({w.accountHolder})
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {new Date(w.createdAt).toLocaleDateString("en", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                    {w.adminNote ? ` · Admin note: ${w.adminNote}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {data.earnings.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold">Commission history</h3>
          <ul className="mt-2 space-y-2">
            {data.earnings.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-xl bg-surface-2 p-3 text-sm">
                <div>
                  <p className="font-medium">+{idr(r.amountIdr)}</p>
                  <p className="text-xs text-muted">
                    {r.memberName ?? "Referred member"} joined {r.tierLabel}
                  </p>
                </div>
                <span className="text-xs text-muted">
                  {new Date(r.createdAt).toLocaleDateString("en", { day: "numeric", month: "short" })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}