import { en, type TranslationKeys } from "./locales/en";
import { hi } from "./locales/hi";

export type Locale =
  | "en"
  | "hi"
  | "ta"
  | "te"
  | "kn"
  | "ml"
  | "bn"
  | "mr"
  | "gu"
  | "pa"
  | "es"
  | "fr"
  | "de"
  | "ja"
  | "zh";

export interface LocaleInfo {
  code: Locale;
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
}

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: "en", name: "English", nativeName: "English", direction: "ltr" },
  { code: "hi", name: "Hindi", nativeName: "\u0939\u093F\u0928\u094D\u0926\u0940", direction: "ltr" },
  { code: "ta", name: "Tamil", nativeName: "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD", direction: "ltr" },
  { code: "te", name: "Telugu", nativeName: "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41", direction: "ltr" },
  { code: "kn", name: "Kannada", nativeName: "\u0C95\u0CA8\u0CCD\u0CA8\u0CA1", direction: "ltr" },
  { code: "ml", name: "Malayalam", nativeName: "\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02", direction: "ltr" },
  { code: "bn", name: "Bengali", nativeName: "\u09AC\u09BE\u0982\u09B2\u09BE", direction: "ltr" },
  { code: "mr", name: "Marathi", nativeName: "\u092E\u0930\u093E\u0920\u0940", direction: "ltr" },
  { code: "gu", name: "Gujarati", nativeName: "\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0", direction: "ltr" },
  { code: "pa", name: "Punjabi", nativeName: "\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40", direction: "ltr" },
  { code: "es", name: "Spanish", nativeName: "Espa\u00F1ol", direction: "ltr" },
  { code: "fr", name: "French", nativeName: "Fran\u00E7ais", direction: "ltr" },
  { code: "de", name: "German", nativeName: "Deutsch", direction: "ltr" },
  { code: "ja", name: "Japanese", nativeName: "\u65E5\u672C\u8A9E", direction: "ltr" },
  { code: "zh", name: "Chinese", nativeName: "\u4E2D\u6587", direction: "ltr" },
];

const locales: Record<string, Record<string, unknown>> = {
  en,
  hi,
};

let currentLocale: Locale = "en";

/** Load a locale. Currently en and hi are bundled; others fall back to en. */
export async function loadLocale(locale: Locale): Promise<void> {
  currentLocale = locale;
}

/** Get a nested key from an object using dot notation. */
function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : undefined;
}

/**
 * Translate a key, with optional interpolation.
 * Example: t('dashboard.welcome', { name: 'Priya' }) => "Welcome back, Priya"
 */
export function t(key: string, params?: Record<string, string>): string {
  const translations = locales[currentLocale] || locales.en;
  let value = getNestedValue(translations as Record<string, unknown>, key);

  // Fallback to English
  if (value === undefined && currentLocale !== "en") {
    value = getNestedValue(locales.en as Record<string, unknown>, key);
  }

  // If still not found, return key
  if (value === undefined) return key;

  // Interpolation
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, "g"), paramValue);
    }
  }

  return value;
}

/** Format a number based on the current locale. */
export function formatNumber(
  num: number,
  options?: Intl.NumberFormatOptions
): string {
  const localeMap: Record<string, string> = {
    en: "en-US",
    hi: "hi-IN",
    ta: "ta-IN",
    te: "te-IN",
    kn: "kn-IN",
    ml: "ml-IN",
    bn: "bn-IN",
    mr: "mr-IN",
    gu: "gu-IN",
    pa: "pa-IN",
    es: "es-ES",
    fr: "fr-FR",
    de: "de-DE",
    ja: "ja-JP",
    zh: "zh-CN",
  };
  const intlLocale = localeMap[currentLocale] || "en-US";
  return new Intl.NumberFormat(intlLocale, options).format(num);
}

/** Format a date based on the current locale. */
export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const localeMap: Record<string, string> = {
    en: "en-US",
    hi: "hi-IN",
    ta: "ta-IN",
    te: "te-IN",
    kn: "kn-IN",
    ml: "ml-IN",
    bn: "bn-IN",
    mr: "mr-IN",
    gu: "gu-IN",
    pa: "pa-IN",
    es: "es-ES",
    fr: "fr-FR",
    de: "de-DE",
    ja: "ja-JP",
    zh: "zh-CN",
  };
  const intlLocale = localeMap[currentLocale] || "en-US";
  return new Intl.DateTimeFormat(
    intlLocale,
    options ?? { year: "numeric", month: "long", day: "numeric" }
  ).format(d);
}

export function getCurrentLocale(): Locale {
  return currentLocale;
}
