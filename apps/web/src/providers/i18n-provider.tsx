"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  loadLocale,
  t as translate,
  formatNumber as fmtNumber,
  formatDate as fmtDate,
  getCurrentLocale,
  type Locale,
} from "@/lib/i18n";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string>) => string;
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [, setRenderKey] = useState(0);

  useEffect(() => {
    // Try to load saved locale from localStorage
    const saved = localStorage.getItem("expenseflow-locale") as Locale | null;
    if (saved) {
      loadLocale(saved).then(() => {
        setLocaleState(saved);
        setRenderKey((k) => k + 1);
      });
    }
  }, []);

  const setLocale = useCallback(async (newLocale: Locale) => {
    await loadLocale(newLocale);
    setLocaleState(newLocale);
    localStorage.setItem("expenseflow-locale", newLocale);
    // Force re-render so all t() calls pick up the new locale
    setRenderKey((k) => k + 1);
  }, []);

  const value: I18nContextValue = {
    locale,
    setLocale,
    t: translate,
    formatNumber: fmtNumber,
    formatDate: fmtDate,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback for components outside provider
    return {
      locale: "en",
      setLocale: () => {},
      t: translate,
      formatNumber: fmtNumber,
      formatDate: fmtDate,
    };
  }
  return ctx;
}
