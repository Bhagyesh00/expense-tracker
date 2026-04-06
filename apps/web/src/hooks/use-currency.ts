"use client";

import { useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useCurrencyRates as useCurrencyRatesApi } from "@expenseflow/api";
import { formatCurrency, getCurrencySymbol } from "@expenseflow/utils";

function getClient() {
  return createBrowserClient();
}

export function useCurrencyRates() {
  const client = getClient();
  return useCurrencyRatesApi({ client });
}

export function useFormatCurrency() {
  const format = useCallback(
    (amount: number, code: string) => {
      return formatCurrency(amount, code);
    },
    [],
  );

  const getSymbol = useCallback((code: string) => {
    return getCurrencySymbol(code);
  }, []);

  return { formatCurrency: format, getCurrencySymbol: getSymbol };
}
