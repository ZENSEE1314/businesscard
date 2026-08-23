"use client";

import { useEffect, useState } from "react";
import { Download, Check } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// "Add to Home Screen" button. Uses the native install prompt on Android/Chrome;
// falls back to short instructions on iOS/Safari (and when already installed).
export function InstallButton({
  label = "Add to Home Screen",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone;
    const ua = window.navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua);
    // One-time feature detection on mount.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (standalone) setInstalled(true);
    setIsIOS(ios);
    /* eslint-enable react-hooks/set-state-in-effect */

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed) return null;

  async function onClick() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    setHint(
      isIOS
        ? "Tap the Share icon, then “Add to Home Screen”."
        : "Open your browser menu, then “Add to Home Screen” / “Install app”.",
    );
  }

  return (
    <div className={className}>
      <button
        onClick={onClick}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 text-sm font-medium hover:bg-surface-2"
      >
        {installed ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        {label}
      </button>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
