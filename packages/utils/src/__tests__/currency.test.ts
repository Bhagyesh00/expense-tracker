import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  convertCurrency,
  parseCurrencyInput,
  getCurrencySymbol,
  SUPPORTED_CURRENCIES,
} from '../currency';

describe('formatCurrency', () => {
  it('formats INR correctly with Indian locale grouping', () => {
    const result = formatCurrency(123456.78, 'INR');
    // Indian locale uses lakh/crore grouping: 1,23,456.78
    expect(result).toContain('123,456.78');
    expect(result).toContain('₹');
  });

  it('formats USD correctly', () => {
    const result = formatCurrency(1234.5, 'USD');
    expect(result).toContain('1,234.50');
    expect(result).toContain('$');
  });

  it('formats EUR correctly', () => {
    const result = formatCurrency(1234.5, 'EUR');
    // EUR uses de-DE locale
    expect(result).toContain('€');
  });

  it('formats JPY with zero decimal places', () => {
    const result = formatCurrency(1234, 'JPY');
    expect(result).toContain('¥');
    // JPY should have no decimal places
    expect(result).not.toContain('.');
  });

  it('allows locale override', () => {
    const result = formatCurrency(1234.5, 'USD', 'en-IN');
    expect(result).toContain('$');
  });

  it('handles zero amount', () => {
    const result = formatCurrency(0, 'USD');
    expect(result).toContain('$');
    expect(result).toContain('0.00');
  });

  it('handles negative amount', () => {
    const result = formatCurrency(-500, 'USD');
    expect(result).toContain('500.00');
  });

  it('formats all 12 supported currencies without error', () => {
    const codes = Object.keys(SUPPORTED_CURRENCIES);
    expect(codes).toHaveLength(12);

    for (const code of codes) {
      const result = formatCurrency(1000, code);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    }
  });
});

describe('getCurrencySymbol', () => {
  it('returns the symbol for known currencies', () => {
    expect(getCurrencySymbol('INR')).toBe('₹');
    expect(getCurrencySymbol('USD')).toBe('$');
    expect(getCurrencySymbol('GBP')).toBe('£');
  });

  it('returns the code itself for unknown currencies', () => {
    expect(getCurrencySymbol('XYZ')).toBe('XYZ');
  });
});

describe('convertCurrency', () => {
  const rates = { USD: 1, INR: 83.5, EUR: 0.92, GBP: 0.79 };

  it('converts USD to INR correctly', () => {
    const result = convertCurrency(100, 'USD', 'INR', rates);
    expect(result).toBe(8350);
  });

  it('converts INR to USD correctly', () => {
    const result = convertCurrency(8350, 'INR', 'USD', rates);
    expect(result).toBeCloseTo(100, 1);
  });

  it('returns same amount when from and to are the same', () => {
    expect(convertCurrency(100, 'USD', 'USD', rates)).toBe(100);
  });

  it('converts between two non-base currencies', () => {
    const result = convertCurrency(100, 'EUR', 'GBP', rates);
    // 100 EUR -> USD -> GBP = (100 / 0.92) * 0.79
    expect(result).toBeCloseTo((100 / 0.92) * 0.79, 2);
  });

  it('throws when from currency is missing from rates', () => {
    expect(() => convertCurrency(100, 'XYZ', 'USD', rates)).toThrow(
      'Exchange rate not found for currency: XYZ',
    );
  });

  it('throws when to currency is missing from rates', () => {
    expect(() => convertCurrency(100, 'USD', 'XYZ', rates)).toThrow(
      'Exchange rate not found for currency: XYZ',
    );
  });
});

describe('parseCurrencyInput', () => {
  it('parses standard US format with dollar sign', () => {
    expect(parseCurrencyInput('$1,234.56')).toBe(1234.56);
  });

  it('parses European format (period grouping, comma decimal)', () => {
    expect(parseCurrencyInput('1.234,56')).toBe(1234.56);
  });

  it('parses Indian rupee symbol with grouping', () => {
    expect(parseCurrencyInput('₹1,23,456')).toBe(123456);
  });

  it('parses plain number without symbols', () => {
    expect(parseCurrencyInput('1234.56')).toBe(1234.56);
  });

  it('returns NaN for empty string', () => {
    expect(parseCurrencyInput('')).toBeNaN();
  });

  it('returns NaN for null/undefined-like input', () => {
    expect(parseCurrencyInput(null as unknown as string)).toBeNaN();
    expect(parseCurrencyInput(undefined as unknown as string)).toBeNaN();
  });

  it('handles negative values', () => {
    expect(parseCurrencyInput('-500')).toBe(-500);
  });

  it('handles currency code prefix', () => {
    expect(parseCurrencyInput('INR 1234')).toBe(1234);
  });

  it('handles whitespace and non-breaking spaces', () => {
    expect(parseCurrencyInput('  1234  ')).toBe(1234);
    expect(parseCurrencyInput('1\u00A0234')).toBe(1234);
  });
});
