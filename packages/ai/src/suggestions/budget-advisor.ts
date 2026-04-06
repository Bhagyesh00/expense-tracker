import type { AIProvider } from '../providers';

export interface SpendingHistory {
  categoryId: string;
  categoryName: string;
  totalSpent: number;
  monthCount: number;
  averageMonthly: number;
}

export interface BudgetSuggestion {
  categoryId: string;
  suggestedAmount: number;
  reasoning: string;
}

/**
 * Generate budget recommendations based on the 50/30/20 rule
 * (needs/wants/savings) adjusted for actual spending history.
 *
 * Uses AI for personalized reasoning when available;
 * falls back to a purely statistical approach.
 */
export async function suggestBudgets(
  provider: AIProvider | null,
  monthlyIncome: number,
  spendingHistory: SpendingHistory[],
): Promise<BudgetSuggestion[]> {
  if (monthlyIncome <= 0 || spendingHistory.length === 0) {
    return [];
  }

  // Try AI-powered suggestions
  if (provider) {
    try {
      return await generateAISuggestions(
        provider,
        monthlyIncome,
        spendingHistory,
      );
    } catch {
      // Fall through to statistical approach
    }
  }

  return generateStatisticalSuggestions(monthlyIncome, spendingHistory);
}

async function generateAISuggestions(
  provider: AIProvider,
  monthlyIncome: number,
  spendingHistory: SpendingHistory[],
): Promise<BudgetSuggestion[]> {
  const historyText = spendingHistory
    .map(
      (h) =>
        `- ${h.categoryName}: avg ${formatAmount(h.averageMonthly)}/month (${h.monthCount} months of data)`,
    )
    .join('\n');

  const prompt = `You are a personal finance advisor. Given a user's monthly income and spending history, suggest a budget for each category using the 50/30/20 rule as a baseline (50% needs, 30% wants, 20% savings).

Monthly income: ${formatAmount(monthlyIncome)}

Spending history:
${historyText}

For each category, suggest a monthly budget amount that is realistic based on their history but also encourages responsible spending.

Respond with ONLY a JSON array:
[{"categoryId": "<id>", "suggestedAmount": <number>, "reasoning": "<brief explanation>"}]`;

  const raw = await provider.generateText(prompt, {
    temperature: 0.3,
    maxTokens: 1024,
  });

  return parseAISuggestions(raw, spendingHistory);
}

function parseAISuggestions(
  raw: string,
  history: SpendingHistory[],
): BudgetSuggestion[] {
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found');
    }

    const parsed = JSON.parse(jsonMatch[0]) as unknown[];

    return parsed
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null,
      )
      .map((item) => ({
        categoryId: String(item.categoryId ?? ''),
        suggestedAmount: Math.round(Number(item.suggestedAmount) || 0),
        reasoning: String(item.reasoning ?? ''),
      }))
      .filter((s) => {
        // Validate the categoryId exists in history
        return (
          s.suggestedAmount > 0 &&
          history.some((h) => h.categoryId === s.categoryId)
        );
      });
  } catch {
    return generateStatisticalSuggestions(
      0, // Income not needed for fallback within this path
      history,
    );
  }
}

/**
 * Statistical budget suggestion based on the 50/30/20 rule.
 * Classifies categories as needs/wants and allocates accordingly.
 */
function generateStatisticalSuggestions(
  monthlyIncome: number,
  spendingHistory: SpendingHistory[],
): BudgetSuggestion[] {
  const totalAverageSpend = spendingHistory.reduce(
    (sum, h) => sum + h.averageMonthly,
    0,
  );

  // If we have income, use 50/30/20 allocation; otherwise use history + 10% buffer
  const useBudgetRule = monthlyIncome > 0;
  const needsBudget = useBudgetRule ? monthlyIncome * 0.5 : 0;
  const wantsBudget = useBudgetRule ? monthlyIncome * 0.3 : 0;

  const needsCategories = new Set([
    'rent',
    'housing',
    'utilities',
    'groceries',
    'food',
    'food & drinks',
    'transport',
    'transportation',
    'health',
    'healthcare',
    'insurance',
    'education',
    'bills',
    'emi',
  ]);

  // Split into needs/wants
  const needs: SpendingHistory[] = [];
  const wants: SpendingHistory[] = [];

  for (const h of spendingHistory) {
    if (needsCategories.has(h.categoryName.toLowerCase())) {
      needs.push(h);
    } else {
      wants.push(h);
    }
  }

  const needsTotal = needs.reduce((s, h) => s + h.averageMonthly, 0);
  const wantsTotal = wants.reduce((s, h) => s + h.averageMonthly, 0);

  const suggestions: BudgetSuggestion[] = [];

  // Allocate needs
  for (const h of needs) {
    const proportion = needsTotal > 0 ? h.averageMonthly / needsTotal : 1 / needs.length;
    const suggested = useBudgetRule
      ? Math.round(needsBudget * proportion)
      : Math.round(h.averageMonthly * 1.1); // 10% buffer

    suggestions.push({
      categoryId: h.categoryId,
      suggestedAmount: suggested,
      reasoning: useBudgetRule
        ? `Essential expense: allocated ${Math.round(proportion * 100)}% of the 50% needs budget based on your spending pattern`
        : `Based on your average of ${formatAmount(h.averageMonthly)}/month with a 10% buffer`,
    });
  }

  // Allocate wants
  for (const h of wants) {
    const proportion = wantsTotal > 0 ? h.averageMonthly / wantsTotal : 1 / wants.length;
    const suggested = useBudgetRule
      ? Math.round(wantsBudget * proportion)
      : Math.round(h.averageMonthly * 0.9); // Encourage 10% reduction

    suggestions.push({
      categoryId: h.categoryId,
      suggestedAmount: suggested,
      reasoning: useBudgetRule
        ? `Discretionary expense: allocated ${Math.round(proportion * 100)}% of the 30% wants budget`
        : `Based on your average of ${formatAmount(h.averageMonthly)}/month with a suggested 10% reduction`,
    });
  }

  return suggestions;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
