import { useQuery } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import type { TypedSupabaseClient } from '../client';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const CURRENCY_KEY = ['currency'] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CurrencyRate {
  base_currency: string;
  target_currency: string;
  rate: number;
  fetched_at: string;
}

interface UseCurrencyRatesOptions {
  client: TypedSupabaseClient;
}

interface UseConvertOptions {
  client: TypedSupabaseClient;
  amount: number;
  from: string;
  to: string;
  enabled?: boolean;
}

interface SupportedCurrency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

// ---------------------------------------------------------------------------
// Supported currencies master list
// ---------------------------------------------------------------------------

const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '\u20B9', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'EUR', name: 'Euro', symbol: '\u20AC', flag: '\u{1F1EA}\u{1F1FA}' },
  { code: 'GBP', name: 'British Pound', symbol: '\u00A3', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '\u00A5', flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '\u{1F1E6}\u{1F1FA}' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '\u{1F1E8}\u{1F1E6}' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '\u{1F1F8}\u{1F1EC}' },
  { code: 'AED', name: 'UAE Dirham', symbol: '\u062F.\u0625', flag: '\u{1F1E6}\u{1F1EA}' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '\uFDFC', flag: '\u{1F1F8}\u{1F1E6}' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '\u{1F1E8}\u{1F1ED}' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '\u00A5', flag: '\u{1F1E8}\u{1F1F3}' },
];

// ---------------------------------------------------------------------------
// useCurrencyRates — fetches all rates, cached for 6 hours
// ---------------------------------------------------------------------------

export function useCurrencyRates({ client }: UseCurrencyRatesOptions) {
  return useQuery({
    queryKey: [...CURRENCY_KEY, 'rates'],
    queryFn: async (): Promise<CurrencyRate[]> => {
      const { data, error } = await client
        .from('currency_rates')
        .select('*')
        .order('fetched_at', { ascending: false });

      if (error) throw error;
      return data as CurrencyRate[];
    },
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
    gcTime: 24 * 60 * 60 * 1000,   // Keep in cache for 24 hours
  });
}

// ---------------------------------------------------------------------------
// useConvert — real-time currency conversion using cached rates
// ---------------------------------------------------------------------------

export function useConvert({ client, amount, from, to, enabled = true }: UseConvertOptions) {
  const { data: rates } = useCurrencyRates({ client });

  const convertedAmount = useMemo(() => {
    if (!rates || from === to) return amount;

    // Try direct rate
    const directRate = rates.find(
      (r) => r.base_currency === from && r.target_currency === to,
    );
    if (directRate) {
      return Math.round(amount * directRate.rate * 100) / 100;
    }

    // Try inverse rate
    const inverseRate = rates.find(
      (r) => r.base_currency === to && r.target_currency === from,
    );
    if (inverseRate && inverseRate.rate > 0) {
      return Math.round((amount / inverseRate.rate) * 100) / 100;
    }

    // Try cross-rate via USD
    const fromUsd = rates.find(
      (r) => r.base_currency === from && r.target_currency === 'USD',
    );
    const usdToTarget = rates.find(
      (r) => r.base_currency === 'USD' && r.target_currency === to,
    );
    if (fromUsd && usdToTarget) {
      return Math.round(amount * fromUsd.rate * usdToTarget.rate * 100) / 100;
    }

    return null; // No rate found
  }, [rates, amount, from, to]);

  const rate = useMemo(() => {
    if (!rates || from === to) return 1;
    const direct = rates.find(
      (r) => r.base_currency === from && r.target_currency === to,
    );
    return direct?.rate ?? null;
  }, [rates, from, to]);

  return {
    convertedAmount: enabled ? convertedAmount : null,
    rate,
    isLoading: !rates,
  };
}

// ---------------------------------------------------------------------------
// useConvertCurrency — legacy API compatibility (query-based)
// ---------------------------------------------------------------------------

export function useConvertCurrency({
  client,
  amount,
  from,
  to,
  enabled = true,
}: UseConvertOptions) {
  return useQuery({
    queryKey: [...CURRENCY_KEY, 'convert', amount, from, to],
    queryFn: async () => {
      if (from === to) return amount;

      // Try direct rate first
      const { data: directRate } = await client
        .from('currency_rates')
        .select('rate')
        .eq('base_currency', from)
        .eq('target_currency', to)
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single();

      if (directRate) {
        return Math.round(amount * (directRate.rate as number) * 100) / 100;
      }

      // Try inverse rate
      const { data: inverseRate } = await client
        .from('currency_rates')
        .select('rate')
        .eq('base_currency', to)
        .eq('target_currency', from)
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single();

      if (inverseRate) {
        return Math.round((amount / (inverseRate.rate as number)) * 100) / 100;
      }

      // Try cross-rate via USD
      const { data: fromUsd } = await client
        .from('currency_rates')
        .select('rate')
        .eq('base_currency', from)
        .eq('target_currency', 'USD')
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single();

      const { data: usdToTarget } = await client
        .from('currency_rates')
        .select('rate')
        .eq('base_currency', 'USD')
        .eq('target_currency', to)
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single();

      if (fromUsd && usdToTarget) {
        return Math.round(
          amount * (fromUsd.rate as number) * (usdToTarget.rate as number) * 100,
        ) / 100;
      }

      throw new Error(`No exchange rate found for ${from} to ${to}`);
    },
    enabled: enabled && !!from && !!to && amount > 0,
    staleTime: 6 * 60 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useSupportedCurrencies — returns the full list with symbols and flags
// ---------------------------------------------------------------------------

export function useSupportedCurrencies() {
  return useMemo(() => SUPPORTED_CURRENCIES, []);
}
