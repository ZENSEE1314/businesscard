"use client";

import { useEffect, useSyncExternalStore, useState } from "react";
import { Languages } from "lucide-react";
import { apiFetch } from "@/lib/client";
import {
  getPreferredLanguage,
  languageLabel,
  subscribePreferredLanguage,
} from "@/lib/preferred-language";

/**
 * Translate button for user-generated text (posts, comments, events,
 * marketplace). Translates into the viewer's chosen app language and toggles
 * between the original and the translation. Nothing is translated until the
 * viewer taps it, so lists stay cheap.
 */
export function TranslateButton({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  // Target language comes from the external store — hydrates as "en" and
  // syncs to the stored preference after mount, and follows live changes.
  const lang = useSyncExternalStore(
    subscribePreferredLanguage,
    getPreferredLanguage,
    () => "en",
  );
  const [translated, setTranslated] = useState<string | null>(null);
  const [showing, setShowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset any shown translation when the app language changes mid-view.
  useEffect(() => {
    function onChange() {
      setTranslated(null);
      setShowing(false);
    }
    window.addEventListener("app-language-change", onChange);
    return () => window.removeEventListener("app-language-change", onChange);
  }, []);

  async function onClick() {
    setError(null);
    if (translated) {
      setShowing((s) => !s);
      return;
    }
    setBusy(true);
    const res = await apiFetch<{ text: string }>("/api/ai/translate", {
      method: "POST",
      body: JSON.stringify({ text, target: lang }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Translation failed.");
      return;
    }
    setTranslated(res.data.text);
    setShowing(true);
  }

  if (!text.trim()) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-60"
      >
        <Languages className="h-3.5 w-3.5" />
        {busy
          ? "Translating…"
          : showing
            ? "Show original"
            : `Translate to ${languageLabel(lang)}`}
      </button>
      {error && <span className="ml-2 text-xs text-danger">{error}</span>}
      {showing && translated && (
        <p className="mt-1 whitespace-pre-wrap rounded-lg bg-surface-2 p-2 text-sm">
          {translated}
        </p>
      )}
    </div>
  );
}
