// App UI language. Cookie-backed so server components can localize on render.
export const LOCALES = ["en", "zh", "id"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_COOKIE = "app-lang";

export const LOCALE_LABEL: Record<Locale, string> = {
  en: "English",
  zh: "中文",
  id: "Bahasa Indonesia",
};

export function normalizeLocale(value: string | null | undefined): Locale {
  return (LOCALES as readonly string[]).includes(value ?? "")
    ? (value as Locale)
    : "en";
}
