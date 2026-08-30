"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import {
  LANGUAGE_OPTIONS,
  getPreferredLanguage,
  setPreferredLanguage,
} from "@/lib/preferred-language";

/**
 * App language selector. Sets the viewer's preferred language (localStorage),
 * used as the target for the Translate buttons across posts, events and the
 * marketplace. Dispatches an "app-language-change" event so open TranslateButton
 * instances can react without a reload.
 */
export function LanguagePicker({ className = "" }: { className?: string }) {
  const [lang, setLang] = useState("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLang(getPreferredLanguage());
    setMounted(true);
  }, []);

  function choose(code: string) {
    setLang(code);
    setPreferredLanguage(code);
    try {
      window.dispatchEvent(new CustomEvent("app-language-change", { detail: code }));
    } catch {
      /* ignore */
    }
  }

  return (
    <label
      className={`inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-1 text-xs ${className}`}
      title="App language (used for translations)"
    >
      <Globe className="h-3.5 w-3.5 text-muted" />
      <span className="sr-only">App language</span>
      <select
        value={mounted ? lang : "en"}
        onChange={(e) => choose(e.target.value)}
        className="bg-transparent text-xs font-medium outline-none"
        aria-label="App language"
      >
        {LANGUAGE_OPTIONS.map((o) => (
          <option key={o.code} value={o.code}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
