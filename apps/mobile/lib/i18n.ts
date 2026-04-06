import AsyncStorage from "@react-native-async-storage/async-storage";

// ---- Types ----

export type Locale = string;
export type TranslationMap = Record<string, string>;

// ---- Constants ----

const LOCALE_STORAGE_KEY = "@expenseflow_locale";
const DEFAULT_LOCALE = "en";

// ---- State ----

let currentLocale: Locale = DEFAULT_LOCALE;
let translations: TranslationMap = {};
let fallbackTranslations: TranslationMap = {};
let listeners: Array<(locale: Locale) => void> = [];

// ---- Locale Registry ----

const localeLoaders: Record<Locale, () => Promise<{ default: TranslationMap }>> = {
  en: () => import("@/lib/i18n/en"),
  hi: () => import("@/lib/i18n/hi"),
};

// ---- Functions ----

/**
 * Load translations for a given locale.
 * Falls back to English if the locale is not found.
 */
export async function loadLocale(locale: Locale): Promise<void> {
  try {
    // Always load English as fallback
    if (Object.keys(fallbackTranslations).length === 0) {
      const enModule = await localeLoaders.en();
      fallbackTranslations = enModule.default;
    }

    if (locale === "en") {
      translations = fallbackTranslations;
    } else if (localeLoaders[locale]) {
      const module = await localeLoaders[locale]();
      translations = module.default;
    } else {
      // Unknown locale - use English
      translations = fallbackTranslations;
      locale = DEFAULT_LOCALE;
    }

    currentLocale = locale;
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
    notifyListeners();
  } catch (error: unknown) {
    console.warn(`Failed to load locale "${locale}", falling back to English.`, error);
    translations = fallbackTranslations;
    currentLocale = DEFAULT_LOCALE;
  }
}

/**
 * Translate a key with optional interpolation parameters.
 *
 * Usage:
 *   t("greeting", { name: "John" }) => "Hello, John!"
 *   t("items_count", { count: 5 }) => "5 items"
 */
export function t(key: string, params?: Record<string, string | number>): string {
  let value = translations[key] ?? fallbackTranslations[key] ?? key;

  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      value = value.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
    });
  }

  return value;
}

/**
 * Get the current locale.
 */
export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Set the locale and load its translations.
 */
export async function setLocale(locale: Locale): Promise<void> {
  await loadLocale(locale);
}

/**
 * Initialize i18n by loading the persisted locale from AsyncStorage.
 */
export async function initI18n(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    const locale = stored ?? DEFAULT_LOCALE;
    await loadLocale(locale);
  } catch {
    await loadLocale(DEFAULT_LOCALE);
  }
}

/**
 * Subscribe to locale changes.
 * Returns an unsubscribe function.
 */
export function onLocaleChange(listener: (locale: Locale) => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function notifyListeners(): void {
  listeners.forEach((listener) => listener(currentLocale));
}

/**
 * Get list of available locales.
 */
export function getAvailableLocales(): Locale[] {
  return Object.keys(localeLoaders);
}
