"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";
import { apiFetch } from "@/lib/client";
import { formatIdr } from "@/lib/membership";

export function WithdrawForm({
  available,
  minWithdrawal,
}: {
  available: number;
  minWithdrawal: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    bankName: "",
    accountNumber: "",
    accountHolder: "",
  });

  if (available <= 0) {
    return (
      <p className="text-sm text-muted">
        No available balance yet. Earn commission when a member you referred joins a paid
        package.
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await apiFetch("/api/referrals/withdrawals", {
      method: "POST",
      body: JSON.stringify({
        amountIdr: Number(form.amount.replace(/[^0-9]/g, "")),
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        accountHolder: form.accountHolder,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setOk(true);
      setForm({ amount: "", bankName: "", accountNumber: "", accountHolder: "" });
      router.refresh();
    } else {
      setMsg(res.error ?? "Failed to request withdrawal.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Withdrawal requested! The admin will review and pay it out manually.
        </p>
      )}
      <div>
        <Label htmlFor="wd-amount">Amount (IDR) — available {formatIdr(available)}</Label>
        <Input
          id="wd-amount"
          inputMode="numeric"
          required
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          placeholder={`min ${minWithdrawal.toLocaleString("id-ID")}`}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="wd-bank">Bank</Label>
          <Input
            id="wd-bank"
            required
            value={form.bankName}
            onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
            placeholder="BCA"
          />
        </div>
        <div>
          <Label htmlFor="wd-acc">Account number</Label>
          <Input
            id="wd-acc"
            required
            value={form.accountNumber}
            onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
            placeholder="1234567890"
          />
        </div>
        <div>
          <Label htmlFor="wd-holder">Account holder</Label>
          <Input
            id="wd-holder"
            required
            value={form.accountHolder}
            onChange={(e) => setForm((f) => ({ ...f, accountHolder: e.target.value }))}
            placeholder="Your name"
          />
        </div>
      </div>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
      <Button type="submit" disabled={busy} size="sm">
        {busy ? "Submitting…" : "Request withdrawal"}
      </Button>
    </form>
  );
}
