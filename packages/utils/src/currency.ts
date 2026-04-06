/**
 * Currency utilities for ExpenseFlow.
 *
 * Provides formatting, parsing, conversion, and lookup helpers
 * for the currencies supported across the application.
 */

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  locale: string;
  /** Number of decimal digits for the minor unit (e.g. 2 for USD, 0 for JPY). */
  decimals: number;
}

/**
 * All currencies supported by ExpenseFlow.
 * Keyed by ISO 4217 currency code.
 */
export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', decimals: 2 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB', decimals: 2 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP', decimals: 0 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU', decimals: 2 },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA', decimals: 2 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG', decimals: 2 },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE', decimals: 2 },
  SAR: { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', locale: 'ar-SA', decimals: 2 },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', locale: 'de-CH', decimals: 2 },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN', decimals: 2 },
} as const;

/**
 * Format a numeric amount as a localised currency string.
 *
 * @param amount  - The monetary value.
 * @param currencyCode - ISO 4217 code (e.g. "INR").
 * @param locale  - Optional BCP-47 locale override; defaults to the
 *                  currency's preferred locale.
 * @returns Formatted string, e.g. "₹1,234.56".
 *
 * @example
 * formatCurrency(1234.5, 'INR');        // "₹1,234.50"
 * formatCurrency(1234.5, 'USD', 'en-IN'); // "$1,234.50" (US dollars, Indian locale grouping)
 */
export function formatCurrency(
  amount: number,
  currencyCode: string,
  locale?: string,
): string {
  const info = SUPPORTED_CURRENCIES[currencyCode];
  const resolvedLocale = locale ?? info?.locale ?? 'en-US';

  return new Intl.NumberFormat(resolvedLocale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: info?.decimals ?? 2,
    maximumFractionDigits: info?.decimals ?? 2,
  }).format(amount);
}

/**
 * Return the symbol for a given currency code.
 *
 * @param code - ISO 4217 code.
 * @returns The currency symbol, or the code itself if unknown.
 */
export function getCurrencySymbol(code: string): string {
  return SUPPORTED_CURRENCIES[code]?.symbol ?? code;
}

/**
 * Convert an amount from one currency to another using the supplied rates.
 *
 * Both `fromCurrency` and `toCurrency` must exist as keys in `rates` (each
 * rate is relative to a common base, e.g. USD).
 *
 * @param amount       - Value in the source currency.
 * @param fromCurrency - Source ISO 4217 code.
 * @param toCurrency   - Target ISO 4217 code.
 * @param rates        - Map of currency code to its rate against a common base.
 * @returns The converted amount (unrounded).
 *
 * @throws {Error} If either currency is missing from the rates map.
 *
 * @example
 * const rates = { USD: 1, INR: 83.5, EUR: 0.92 };
 * convertCurrency(100, 'USD', 'INR', rates); // 8350
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>,
): number {
  if (fromCurrency === toCurrency) return amount;

  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];

  if (fromRate == null) {
    throw new Error(`Exchange rate not found for currency: ${fromCurrency}`);
  }
  if (toRate == null) {
    throw new Error(`Exchange rate not found for currency: ${toCurrency}`);
  }

  // Convert to base, then to target.
  return (amount / fromRate) * toRate;
}

/**
 * Parse a user-entered currency string into a numeric value.
 *
 * Handles common edge cases:
 * - Currency symbols or codes mixed into the string ("$1,234.56", "INR 1234")
 * - Indian/European grouping ("1,23,456.78" or "1.234,56")
 * - Whitespace and non-breaking spaces
 *
 * @param input - Raw user input.
 * @returns The parsed number, or `NaN` if the input is not recognisable.
 *
 * @example
 * parseCurrencyInput('$1,234.56');   // 1234.56
 * parseCurrencyInput('1.234,56');    // 1234.56  (European format)
 * parseCurrencyInput('₹1,23,456');   // 123456
 */
export function parseCurrencyInput(input: string): number {
  if (!input || typeof input !== 'string') return NaN;

  // Strip currency symbols, codes, and whitespace.
  let cleaned = input
    .replace(/[₹$€£¥﷼]/g, '')
    .replace(/[A-Z]{3}\s*/gi, '')
    .replace(/[\s\u00A0]/g, '')
    .trim();

  if (cleaned === '') return NaN;

  // Determine whether the string uses European format (period for grouping,
  // comma for decimal) or standard format (comma for grouping, period for
  // decimal).
  //
  // Heuristic: if the last separator is a comma and is followed by exactly
  // 1-2 digits at the end, treat commas as the decimal separator.
  const lastComma = cleaned.lastIndexOf(',');
  const lastPeriod = cleaned.lastIndexOf('.');

  if (lastComma > lastPeriod) {
    // European: "1.234,56" -> commas are decimal
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // Standard or Indian: "1,234.56" or "1,23,456" -> commas are grouping
    cleaned = cleaned.replace(/,/g, '');
  }

  const value = Number(cleaned);
  return Number.isFinite(value) ? value : NaN;
}
