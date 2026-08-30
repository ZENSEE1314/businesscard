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

/** Returns a translate function bound to the current locale. */
export function useT(): (key: string) => string {
  const locale = useContext(LocaleContext);
  return (key: string) => {
    const entry = dict[key];
    return entry ? (entry[locale] ?? entry.en) : key;
  };
}
