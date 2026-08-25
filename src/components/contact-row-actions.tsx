"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/client";

/**
 * Deletes a contact from the signed-in user's OWN list.
 * Only removes the in-app relationship — never a user account and never
 * anything in the phone's address book.
 */
export function DeleteContactButton({
  contactId,
  name,
}: {
  contactId: string;
  name: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function remove() {
    setBusy(true);
    setError(null);
    const res = await apiFetch(`/api/contacts/${contactId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Could not delete this contact.");
      return;
    }
    startTransition(() => router.refresh());
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={remove}
          disabled={busy}
          className="rounded-lg bg-danger px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm"}
        </button>
        <button
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
          disabled={busy}
          className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1">
      {error && (
        <span role="alert" className="max-w-[140px] truncate text-xs text-danger">
          {error}
        </span>
      )}
      <button
        onClick={() => setConfirming(true)}
        aria-label={`Remove ${name} from your contacts`}
        title="Remove from contacts"
        className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted hover:bg-red-50 hover:text-danger"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </span>
  );
}