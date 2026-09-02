import {
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_LABEL,
  normalizeLocale,
} from "@/lib/i18n/config";

// The app language (English / 中文 / Bahasa Indonesia). Stored in a cookie so
// server-rendered pages localize, and mirrored to localStorage for client reads
// (e.g. the Translate button's target language).

export const STORAGE_KEY = "app-language";

export interface LanguageOption {
  code: string;
  label: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = LOCALES.map((code) => ({
  code,
  label: LOCALE_LABEL[code],
}));

function readCookie(): string | null {
  try {
    const m = document.cookie.match(
      new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`),
    );
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

/** Reads the app language (localStorage → cookie → browser → English). */
export function getPreferredLanguage(): string {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v) return normalizeLocale(v);
  } catch {
    /* storage unavailable */
  }
  const cookie = readCookie();
  if (cookie) return normalizeLocale(cookie);
  try {
    return normalizeLocale(navigator.language?.slice(0, 2).toLowerCase());
  } catch {
    return "en";
  }
}

/** Persists the app language to localStorage AND the server-readable cookie. */
export function setPreferredLanguage(code: string) {
  const loc = normalizeLocale(code);
  try {
    localStorage.setItem(STORAGE_KEY, loc);
  } catch {
    /* ignore */
  }
  try {
    // 1 year, site-wide; server reads this on every render.
    document.cookie = `${LOCALE_COOKIE}=${loc}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* ignore */
  }
}

/**
 * useSyncExternalStore subscription for the app language: reacts to in-app
 * changes ("app-language-change" events) and to edits in other tabs (storage).
 */
export function subscribePreferredLanguage(onChange: () => void): () => void {
  window.addEventListener("app-language-change", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("app-language-change", onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function languageLabel(code: string): string {
  return LOCALE_LABEL[normalizeLocale(code)];
}
