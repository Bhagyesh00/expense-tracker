import { useState, useEffect, useCallback } from "react";
import {
  t as translate,
  getLocale,
  setLocale as setI18nLocale,
  initI18n,
  onLocaleChange,
  type Locale,
} from "@/lib/i18n";

// ---- Types ----

interface UseI18nReturn {
  /** Translate a key with optional interpolation params */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Current locale code */
  locale: Locale;
  /** Change the active locale */
  setLocale: (locale: Locale) => Promise<void>;
  /** Whether the i18n system has finished initializing */
  ready: boolean;
}

// ---- Hook ----

/**
 * Hook providing i18n translation function and locale management.
 * Re-renders the component when locale changes.
 * Loads persisted locale from AsyncStorage on mount.
 */
export function useI18n(): UseI18nReturn {
  const [locale, setLocaleState] = useState<Locale>(getLocale());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Initialize i18n on first mount
    initI18n().then(() => {
      if (mounted) {
        setLocaleState(getLocale());
        setReady(true);
      }
    });

    // Subscribe to locale changes
    const unsubscribe = onLocaleChange((newLocale) => {
      if (mounted) {
        setLocaleState(newLocale);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const setLocale = useCallback(async (newLocale: Locale) => {
    await setI18nLocale(newLocale);
  }, []);

  // Wrap translate to force re-render when locale changes
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      // This reference to `locale` ensures re-render triggers re-translation
      void locale;
      return translate(key, params);
    },
    [locale]
  );

  return { t, locale, setLocale, ready };
}
