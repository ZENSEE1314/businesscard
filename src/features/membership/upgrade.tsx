"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Crown, Loader2 } from "lucide-react";
import { Button, Card, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/client";
import { getTierConfig } from "@/lib/membership";

function getTierLabel(tier: string): string {
  if (tier === "BRIDGEMAKER" || tier === "BRIDGEMASTER") {
    return getTierConfig(tier).label;
  }
  return tier;
}

export interface TierView {
  tier: "BRIDGEMAKER" | "BRIDGEMASTER";
  label: string;
  priceLabel: string;
  tagline: string;
  benefits: string[];
  highlighted?: boolean;
}

export interface Bank {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

interface PendingOrder {
  id: string;
  tier: string;
  orderCode: string;
  priceLabel: string;
}

export function MembershipUpgrade({
  tiers,
  bank,
  isGuest,
  currentTier,
  pending,
}: {
  tiers: TierView[];
  bank: Bank;
  isGuest: boolean;
  currentTier: string | null;
  pending: PendingOrder | null;
}) {
  const [order, setOrder] = useState<PendingOrder | null>(pending);
  const [busyTier, setBusyTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [proofSent, setProofSent] = useState(false);

  async function choose(tier: string) {
    setBusyTier(tier);
    setError(null);
    const res = await apiFetch<{ order: PendingOrder }>("/api/membership/order", {
      method: "POST",
      body: JSON.stringify({ tier }),
    });
    setBusyTier(null);
    if (!res.ok || !res.data) {
      setError(res.error ?? "Could not start your order.");
      return;
    }
    setOrder(res.data.order);
  }

  async function sendProof() {
    if (!order) return;
    await apiFetch(`/api/membership/${order.id}/proof`, {
      method: "POST",
      body: JSON.stringify({ paymentNote: note }),
    });
    setProofSent(true);
  }

  // Active member — no upgrade needed.
  if (currentTier) {
    const label = getTierLabel(currentTier);
    return (
      <Card className="p-6 text-center">
        <Crown className="mx-auto h-8 w-8 text-amber-500" />
        <h2 className="mt-2 text-lg font-bold">
          You&rsquo;re a {label} member 🎉
        </h2>
        <p className="mt-1 text-sm text-muted">
          Your business membership is active. Manage your business profile and
          post to the Hub anytime.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Link
            href="/me/edit"
            className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg"
          >
            Edit business profile
          </Link>
        </div>
      </Card>
    );
  }

  // Pending order — show payment instructions.
  if (order) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-bold">Complete your payment</h2>
        <p className="mt-1 text-sm text-muted">
          Transfer the membership fee to the account below, then let us know.
          An admin will verify and activate your membership.
        </p>

        <div className="mt-4 space-y-2 rounded-xl bg-surface-2 p-4 text-sm">
          <Row label="Membership" value={`${order.tier}`} />
          <Row label="Amount" value={order.priceLabel} strong />
          <Row label="Order code" value={order.orderCode} strong />
          <div className="my-2 border-t border-border" />
          <Row label="Bank" value={bank.bankName} />
          <Row label="Account no." value={bank.accountNumber} strong />
          <Row label="Account name" value={bank.accountHolder} />
        </div>
        <p className="mt-2 text-xs text-muted">
          Use your order code <strong>{order.orderCode}</strong> as the transfer
          reference.
        </p>

        {proofSent ? (
          <div className="mt-4 rounded-lg bg-green-50 px-3 py-3 text-sm text-success">
            Thanks! Your payment is awaiting verification. You’ll be notified
            once your membership is active.
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            <Textarea
              rows={2}
              placeholder="Payment reference / note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button onClick={sendProof} className="w-full">
              I’ve paid — notify admin
            </Button>
          </div>
        )}
      </Card>
    );
  }

  // Pricing grid.
  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {tiers.map((t) => (
          <Card
            key={t.tier}
            className={`flex flex-col p-5 ${t.highlighted ? "ring-2 ring-primary" : ""}`}
          >
            {t.highlighted && (
              <span className="mb-2 inline-flex w-fit rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                Most popular
              </span>
            )}
            <h3 className="text-lg font-bold">{t.label}</h3>
            <p className="text-sm text-muted">{t.tagline}</p>
            <div className="mt-3">
              <span className="text-2xl font-extrabold">{t.priceLabel}</span>
              <span className="text-sm text-muted"> / year</span>
            </div>
            <ul className="mt-4 flex-1 space-y-2 text-sm">
              {t.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {b}
                </li>
              ))}
            </ul>
            <div className="mt-5">
              {isGuest ? (
                <Link
                  href="/register"
                  className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-fg"
                >
                  Join to choose
                </Link>
              ) : (
                <Button
                  className="w-full"
                  variant={t.highlighted ? "primary" : "outline"}
                  disabled={busyTier !== null}
                  onClick={() => choose(t.tier)}
                >
                  {busyTier === t.tier ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    `Choose ${t.label}`
                  )}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
