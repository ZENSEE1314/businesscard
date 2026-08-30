// Viewer's preferred app language for on-demand translation. Stored per-device
// in localStorage (no account/DB dependency) so anyone can pick their language.

export const STORAGE_KEY = "app-language";

export interface LanguageOption {
  code: string;
  label: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "en", label: "English" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "zh", label: "中文" },
  { code: "ta", label: "தமிழ்" },
  { code: "hi", label: "हिन्दी" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
];

const SUPPORTED = new Set(LANGUAGE_OPTIONS.map((o) => o.code));

/** Reads the stored language, falling back to the browser language or English. */
export function getPreferredLanguage(): string {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && SUPPORTED.has(v)) return v;
  } catch {
    /* storage unavailable */
  }
  try {
    const nav = navigator.language?.slice(0, 2).toLowerCase();
    if (nav && SUPPORTED.has(nav)) return nav;
  } catch {
    /* no navigator */
  }
  return "en";
}

export function setPreferredLanguage(code: string) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
}

export function languageLabel(code: string): string {
  return LANGUAGE_OPTIONS.find((o) => o.code === code)?.label ?? code;
}
