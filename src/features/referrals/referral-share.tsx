"use client";

import { useRef, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

/**
 * Referral link + copy/share actions. The copy button confirms with a clear
 * "Copied!" state (plain text, always rendered properly), and falls back to a
 * hidden textarea + execCommand for browsers without the async clipboard API.
 */
export function ReferralShare({ link, shareText }: { link: string; shareText: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function copy() {
    setError(null);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
      } else {
        // Fallback for non-secure contexts (e.g. plain HTTP previews).
        const el = inputRef.current;
        if (!el) throw new Error("no input");
        el.focus();
        el.select();
        document.execCommand("copy");
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy automatically — select the link and copy it.");
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <div>
      <label
        htmlFor="referral-link"
        className="text-xs font-semibold uppercase tracking-wide text-muted"
      >
        Your referral link
      </label>
      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
        <input
          id="referral-link"
          ref={inputRef}
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"
          aria-label="Your referral link"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg transition-opacity hover:opacity-90 sm:flex-none"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copy link
              </>
            )}
          </button>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-surface-2 sm:flex-none"
          >
            <Share2 className="h-4 w-4" /> Share
          </a>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
      <p className="mt-2 text-xs text-muted">
        Anyone who joins through this link becomes your referral — you earn
        points when they sign up.
      </p>
    </div>
  );
}