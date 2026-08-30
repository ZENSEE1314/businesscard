"use client";

import { useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { apiFetch } from "@/lib/client";

type WriteField = "bio" | "whoIAm" | "whatICanOffer" | "whoIWantToFind" | "headline";

interface AiContext {
  fullName?: string;
  jobTitle?: string;
  company?: string;
  businessDescription?: string;
  expertise?: string[];
  services?: string[];
  products?: string[];
}

/**
 * Inline AI helper for a single text field. "Write" generates from the user's
 * profile facts; "Improve" rewrites the current draft. Both fill the field via
 * onResult so the user can still edit the result.
 */
export function AiWriteButton({
  field,
  getDraft,
  getContext,
  onResult,
  language,
  className = "",
}: {
  field: WriteField;
  getDraft: () => string;
  getContext?: () => AiContext;
  onResult: (text: string) => void;
  language?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState<null | "write" | "improve">(null);
  const [error, setError] = useState<string | null>(null);

  async function run(mode: "write" | "improve") {
    setBusy(mode);
    setError(null);
    try {
      const draft = getDraft().trim();
      const body =
        mode === "improve"
          ? { mode: "rewrite" as const, text: draft, language }
          : {
              mode: "generate" as const,
              field,
              draft: draft || undefined,
              context: getContext?.(),
              language,
            };
      const res = await apiFetch<{ text: string }>("/api/ai/text", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(res.error ?? "AI request failed. Please try again.");
        return;
      }
      onResult(res.data.text);
    } catch {
      setError("Could not reach the AI service.");
    } finally {
      setBusy(null);
    }
  }

  const hasDraft = getDraft().trim().length > 0;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => run("write")}
        disabled={busy !== null}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-surface-2 disabled:opacity-60"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {busy === "write" ? "Writing…" : "Write with AI"}
      </button>
      {hasDraft && (
        <button
          type="button"
          onClick={() => run("improve")}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-muted hover:bg-surface-2 disabled:opacity-60"
        >
          <Wand2 className="h-3.5 w-3.5" />
          {busy === "improve" ? "Improving…" : "Improve with AI"}
        </button>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
