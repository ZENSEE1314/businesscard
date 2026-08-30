"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "./config";
import { dict } from "./dictionary";

const LocaleContext = createContext<Locale>("en");

/** Seeds the client tree with the locale read server-side from the cookie. */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

function interpolate(s: string, params?: Record<string, string | number>): string {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) =>
    k in params ? String(params[k]) : `{${k}}`,
  );
}

/** Returns a translate function bound to the current locale (supports {params}). */
export function useT(): (
  key: string,
  params?: Record<string, string | number>,
) => string {
  const locale = useContext(LocaleContext);
  return (key, params) => {
    const entry = dict[key];
    return interpolate(entry ? (entry[locale] ?? entry.en) : key, params);
  };
}
