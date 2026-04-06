/**
 * ExpenseFlow — Currency Rates Edge Function (Scheduled)
 *
 * Fetches latest exchange rates from Open Exchange Rates API (free tier, USD base),
 * calculates cross-rates for all supported currencies, and upserts into
 * the currency_rates table.
 *
 * Designed to run as a Supabase cron job (e.g., every 6 hours).
 * Can also be invoked manually via POST for testing.
 *
 * POST /currency-rates   (manual trigger, requires service-role or auth)
 * Returns: { data: { ratesCount: number, updatedAt: string } }
 */

import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";

// ---------------------------------------------------------------------------
// Supported currencies
// ---------------------------------------------------------------------------

const SUPPORTED_CURRENCIES = [
  "INR", "USD", "EUR", "GBP", "JPY", "AUD",
  "CAD", "SGD", "AED", "SAR", "CHF", "CNY",
] as const;

type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();

  try {
    const apiKey = Deno.env.get("OPEN_EXCHANGE_RATES_APP_ID");
    if (!apiKey) {
      return errorResponse("OPEN_EXCHANGE_RATES_APP_ID not configured", 500);
    }

    // Step 1: Fetch latest rates from Open Exchange Rates (USD base)
    const oxrUrl = `https://openexchangerates.org/api/latest.json?app_id=${apiKey}&base=USD`;
    const oxrResponse = await fetch(oxrUrl);

    if (!oxrResponse.ok) {
      console.error(
        `[currency-rates] OXR API error: ${oxrResponse.status} ${oxrResponse.statusText}`,
      );
      return errorResponse(
        "Failed to fetch exchange rates; stale data preserved",
        502,
      );
    }

    const oxrData = (await oxrResponse.json()) as {
      rates: Record<string, number>;
      timestamp: number;
    };

    if (!oxrData.rates || Object.keys(oxrData.rates).length === 0) {
      return errorResponse("Empty rates from API; stale data preserved", 502);
    }

    // Step 2: Extract rates for supported currencies (relative to USD)
    const usdRates: Partial<Record<SupportedCurrency, number>> = {};
    for (const currency of SUPPORTED_CURRENCIES) {
      const rate = oxrData.rates[currency];
      if (typeof rate === "number" && rate > 0) {
        usdRates[currency] = rate;
      }
    }

    // Ensure USD = 1
    usdRates.USD = 1;

    // Step 3: Calculate all cross-rates
    const now = new Date().toISOString();
    const rows: Array<{
      base_currency: string;
      target_currency: string;
      rate: number;
      fetched_at: string;
    }> = [];

    const availableCurrencies = Object.keys(usdRates) as SupportedCurrency[];

    for (const base of availableCurrencies) {
      for (const target of availableCurrencies) {
        if (base === target) continue;

        const baseRate = usdRates[base]!;
        const targetRate = usdRates[target]!;
        // Cross-rate: how many units of target per 1 unit of base
        const crossRate = targetRate / baseRate;

        rows.push({
          base_currency: base,
          target_currency: target,
          rate: Math.round(crossRate * 1_000_000) / 1_000_000, // 6 decimal places
          fetched_at: now,
        });
      }
    }

    // Step 4: Upsert into currency_rates table
    const admin = createServiceClient();
    const { error: upsertError } = await admin
      .from("currency_rates")
      .upsert(rows, {
        onConflict: "base_currency,target_currency",
      });

    if (upsertError) {
      console.error("[currency-rates] Upsert error:", upsertError);
      return errorResponse(
        `Failed to save rates: ${upsertError.message}`,
        500,
      );
    }

    console.log(
      `[currency-rates] Successfully upserted ${rows.length} cross-rates`,
    );

    return new Response(
      JSON.stringify({
        data: {
          ratesCount: rows.length,
          currenciesUpdated: availableCurrencies.length,
          updatedAt: now,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    console.error("[currency-rates] Error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return errorResponse(message, 500);
  }
});
