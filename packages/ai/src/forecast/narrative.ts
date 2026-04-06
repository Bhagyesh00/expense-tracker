import type { AIProvider } from '../providers';
import type { ForecastResult } from './time-series';

export interface BudgetInfo {
  name: string;
  categoryId: string | null;
  amount: number;
  spent: number;
  currency: string;
}

/**
 * Generate an AI-powered narrative summary of the spending forecast.
 * Falls back to a template-based narrative if AI is unavailable.
 */
export async function generateForecastNarrative(
  provider: AIProvider | null,
  forecast: ForecastResult,
  budgets: BudgetInfo[],
): Promise<string> {
  const forecastSummary = buildForecastSummary(forecast, budgets);

  if (provider) {
    try {
      return await provider.generateForecastNarrative(
        JSON.stringify(forecastSummary),
      );
    } catch {
      // Fall through to template
    }
  }

  return generateTemplateNarrative(forecast, budgets);
}

function buildForecastSummary(
  forecast: ForecastResult,
  budgets: BudgetInfo[],
): Record<string, unknown> {
  // Find total budget if any
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);

  // Find the biggest projected category
  const topCategory = forecast.projectedByCategory[0];

  return {
    currentTotal: forecast.currentTotal,
    projectedTotal: forecast.projectedTotal,
    dailyAverage: forecast.dailyAverage,
    daysRemaining: forecast.daysRemaining,
    daysElapsed: forecast.daysElapsed,
    confidence: forecast.confidence,
    projectedSavings: forecast.projectedSavings,
    totalBudget: totalBudget > 0 ? totalBudget : null,
    overBudget:
      totalBudget > 0 ? forecast.projectedTotal > totalBudget : null,
    overBudgetPercent:
      totalBudget > 0
        ? Math.round(
            ((forecast.projectedTotal - totalBudget) / totalBudget) * 100,
          )
        : null,
    topCategoryId: topCategory?.categoryId ?? null,
    topCategoryProjected: topCategory?.projectedAmount ?? null,
    categoryBreakdown: forecast.projectedByCategory.slice(0, 5),
  };
}

function generateTemplateNarrative(
  forecast: ForecastResult,
  budgets: BudgetInfo[],
): string {
  const parts: string[] = [];
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  // Opening: projected total
  parts.push(
    `At your current pace, you'll spend around ${fmt(forecast.projectedTotal)} this month.`,
  );

  // Budget comparison
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  if (totalBudget > 0) {
    const diff = forecast.projectedTotal - totalBudget;
    const pct = Math.abs(Math.round((diff / totalBudget) * 100));

    if (diff > 0) {
      parts.push(
        `That's about ${pct}% over your ${fmt(totalBudget)} budget.`,
      );
    } else {
      parts.push(
        `That's about ${pct}% under your ${fmt(totalBudget)} budget — well done!`,
      );
    }
  }

  // Top category
  const topCat = forecast.projectedByCategory[0];
  if (topCat) {
    parts.push(
      `Your biggest spending area is projected at ${fmt(topCat.projectedAmount)}.`,
    );
  }

  // Daily average context
  parts.push(
    `Your daily average is ${fmt(forecast.dailyAverage)} with ${forecast.daysRemaining} days left in the month.`,
  );

  return parts.join(' ');
}
