import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, normalizeLocale, type Locale } from "./config";
import { dict } from "./dictionary";

/** Reads the app locale from the cookie (defaults to English). */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}

/** Translate a key for a known locale (server components). */
export function tt(locale: Locale, key: string): string {
  const entry = dict[key];
  return entry ? (entry[locale] ?? entry.en) : key;
}
