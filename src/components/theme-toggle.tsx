"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "theme";

/** Applies a theme by toggling `data-theme` on <html>. "system" removes it. */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

function readStored(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* storage unavailable — fall through to system */
  }
  return "system";
}

/** useSyncExternalStore subscription: theme changes here and in other tabs. */
function subscribeTheme(onChange: () => void): () => void {
  window.addEventListener("theme-change", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("theme-change", onChange);
    window.removeEventListener("storage", onChange);
  };
}

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/**
 * Light/dark/system theme switch. Persists the choice to localStorage and
 * applies it immediately; the inline script in the root layout applies the
 * stored value before first paint to avoid a flash.
 *
 * The active value is read through useSyncExternalStore so the component
 * hydrates with the server value ("system") and syncs to the stored theme
 * right after mount — no setState-in-effect needed.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeTheme, readStored, () => "system" as Theme);

  function choose(next: Theme) {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore persistence failure */
    }
    applyTheme(next);
    try {
      window.dispatchEvent(new Event("theme-change"));
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className={`inline-flex items-center rounded-full border border-border bg-surface p-0.5 ${className}`}
      role="radiogroup"
      aria-label="Theme"
    >
      {OPTIONS.map((o) => {
        const active = theme === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.label}
            onClick={() => choose(o.value)}
            className={`grid h-7 w-7 place-items-center rounded-full transition-colors ${
              active
                ? "bg-brand-600 text-white"
                : "text-muted hover:bg-surface-2"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="sr-only">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
