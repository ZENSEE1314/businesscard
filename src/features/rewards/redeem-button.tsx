"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { apiFetch } from "@/lib/client";

export function RedeemButton({
  rewardId,
  pointsCost,
  affordable,
}: {
  rewardId: string;
  pointsCost: number;
  affordable: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function redeem() {
    if (!window.confirm(`Redeem this reward for ${pointsCost} points?`)) return;
    setBusy(true);
    setError(null);
    const res = await apiFetch<{ code: string; balance: number }>(
      `/api/rewards/${rewardId}/redeem`,
      { method: "POST" },
    );
    setBusy(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? "Could not redeem.");
      return;
    }
    setCode(res.data.code);
    router.refresh();
  }

  if (code) {
    return (
      <div className="rounded-lg bg-green-50 px-3 py-2 text-center text-sm text-success">
        Redeemed! Code <strong>{code}</strong>. Show it to claim.
      </div>
    );
  }

  return (
    <div>
      <Button
        size="sm"
        className="w-full"
        disabled={busy || !affordable}
        onClick={redeem}
      >
        {busy ? "Redeeming…" : affordable ? "Redeem" : "Not enough points"}
      </Button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
