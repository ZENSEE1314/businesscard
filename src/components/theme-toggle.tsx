"use client";

import { useEffect, useState } from "react";
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

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/**
 * Light/dark/system theme switch. Persists the choice to localStorage and
 * applies it immediately; the inline script in the root layout applies the
 * stored value before first paint to avoid a flash.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(readStored());
    setMounted(true);
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore persistence failure */
    }
    applyTheme(next);
  }

  return (
    <div
      className={`inline-flex items-center rounded-full border border-border bg-surface p-0.5 ${className}`}
      role="radiogroup"
      aria-label="Theme"
    >
      {OPTIONS.map((o) => {
        const active = mounted && theme === o.value;
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
