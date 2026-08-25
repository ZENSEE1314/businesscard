"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, CheckCircle2, Loader2, MessageCircle, IdCard } from "lucide-react";
import { apiFetch } from "@/lib/client";

/**
 * "Save Contact" flow on a public digital card.
 *
 * - Signed-in visitors: saves the card owner into their BridgeX contacts
 *   (duplicate-safe), then offers message / view-card actions. The standard
 *   .vcf download stays available for the phone address book.
 * - Guests: downloads the standards-compliant vCard file directly and is
 *   invited to register (the register URL carries ref + src so the connection
 *   is created automatically after signup).
 *
 * A website can never silently write into a phone's address book — the .vcf
 * download opens the device's normal contact-import flow with user consent.
 */
export function SaveContactButton({
  username,
  vcardUrl,
  registerHref,
  source,
}: {
  username: string;
  vcardUrl: string;
  registerHref: string;
  source?: "QR_SCAN" | "SHARED_LINK" | "NFC_CARD" | "MANUAL";
}) {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setState("saving");
    setError(null);
    const res = await apiFetch("/api/contacts", {
      method: "POST",
      body: JSON.stringify({ username, source: source ?? "SHARED_LINK", sourceCardId: username }),
    });
    if (!res.ok) {
      // Duplicate (409) still counts as saved from the user's perspective.
      if (res.code === "conflict") {
        setState("saved");
        return;
      }
      setError(res.error ?? "Could not save this contact.");
      setState("idle");
      return;
    }
    setState("saved");
  }

  if (state === "saved") {
    return (
      <div className="space-y-2">
        <p className="flex items-center justify-center gap-2 rounded-xl bg-green-50 px-3 py-3 text-sm font-medium text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          Saved to your BridgeX contacts
        </p>
        <div className="flex gap-2">
          <Link
            href="/chat"
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface text-sm font-medium hover:bg-surface-2"
          >
            <MessageCircle className="h-4 w-4 text-primary" /> Message
          </Link>
          <Link
            href="/contacts"
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface text-sm font-medium hover:bg-surface-2"
          >
            <IdCard className="h-4 w-4" /> My contacts
          </Link>
        </div>
        <a
          href={vcardUrl}
          className="block text-center text-xs font-medium text-primary"
        >
          Also download phone contact (.vcf)
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <button
        onClick={save}
        disabled={state === "saving"}
        className="flex min-h-[48px] w-full flex-col items-center justify-center gap-0.5 rounded-xl bg-primary px-2 py-2.5 text-xs font-semibold text-primary-fg transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {state === "saving" ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <Download className="h-5 w-5" />
            Save contact
          </>
        )}
      </button>
      <a href={vcardUrl} className="block text-center text-xs font-medium text-primary">
        Download phone contact (.vcf)
      </a>
      {error && (
        <p role="alert" className="text-center text-xs text-danger">
          {error}
        </p>
      )}
      <p className="text-center text-[11px] leading-snug text-muted">
        New here?{" "}
        <Link href={registerHref} className="font-medium text-primary">
          Create a free account
        </Link>{" "}
        to keep this contact in BridgeX.
      </p>
    </div>
  );
}