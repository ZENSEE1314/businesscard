import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, normalizeLocale, type Locale } from "./config";
import { dict } from "./dictionary";

/** Reads the app locale from the cookie (defaults to English). */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}

/** Translate a key for a known locale (server components; supports {params}). */
export function tt(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const entry = dict[key];
  const s = entry ? (entry[locale] ?? entry.en) : key;
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) =>
    k in params ? String(params[k]) : `{${k}}`,
  );
}
