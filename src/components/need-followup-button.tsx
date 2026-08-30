"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Check } from "lucide-react";
import { apiFetch } from "@/lib/client";

/**
 * In a chat, re-flags this contact for follow-up (clears followedUpAt) so the
 * reminder reappears on the dashboard. If already awaiting follow-up, it just
 * shows that state.
 */
export function NeedFollowUpButton({
  contactId,
  alreadyFlagged,
}: {
  contactId: string;
  alreadyFlagged: boolean;
}) {
  const router = useRouter();
  const [flagged, setFlagged] = useState(alreadyFlagged);
  const [busy, setBusy] = useState(false);

  async function flag() {
    setBusy(true);
    const res = await apiFetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      body: JSON.stringify({ followedUp: false }),
    });
    setBusy(false);
    if (res.ok) {
      setFlagged(true);
      router.refresh();
    }
  }

  if (flagged) {
    return (
      <span
        title="This contact is on your follow-up list"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700"
      >
        <Check className="h-3.5 w-3.5" /> Follow-up set
      </span>
    );
  }

  return (
    <button
      onClick={flag}
      disabled={busy}
      title="Remind me to follow up with this contact"
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-surface-2 disabled:opacity-60"
    >
      <BellRing className="h-3.5 w-3.5" /> Need follow-up
    </button>
  );
}
