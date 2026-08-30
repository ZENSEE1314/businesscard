"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { useT } from "@/lib/i18n/client";

/**
 * Marks a contact as followed up (clears the dashboard reminder) and opens the
 * chat with that person so the user can send their follow-up message.
 */
export function FollowUpButton({
  contactId,
  username,
}: {
  contactId: string;
  username: string;
}) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function followUp() {
    setBusy(true);
    await apiFetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      body: JSON.stringify({ followedUp: true }),
    });
    const href = username ? `/chat?with=${encodeURIComponent(username)}` : "/chat";
    router.push(href);
  }

  return (
    <button
      onClick={followUp}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
      {t("dash.followUp")}
    </button>
  );
}
