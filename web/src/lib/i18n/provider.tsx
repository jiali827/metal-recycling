"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { catalogs } from "./messages";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  LOCALES,
  type Locale,
  type MessageDict,
  type MessageKey,
} from "./types";

type Vars = Record<string, string | number>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Vars) => string;
  messages: MessageDict;
};

const I18nContext = createContext<I18nContextValue | null>(null);

/** Module-level locale for non-React helpers (e.g. confirmDelete). */
let activeLocale: Locale = DEFAULT_LOCALE;

export function getActiveLocale(): Locale {
  return activeLocale;
}

export function getActiveMessages(): MessageDict {
  return catalogs[activeLocale];
}

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Vars,
): string {
  const [ns, field] = key.split(".") as [keyof MessageDict, string];
  const section = catalogs[locale][ns] as Record<string, string>;
  let text = section?.[field] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

function isLocale(value: string | null): value is Locale {
  return !!value && (LOCALES as string[]).includes(value);
}

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredLocale();
    activeLocale = stored;
    setLocaleState(stored);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    activeLocale = locale;
    document.documentElement.lang = locale;
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }, [locale, ready]);

  const setLocale = useCallback((next: Locale) => {
    activeLocale = next;
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: Vars) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      messages: catalogs[locale],
    }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
