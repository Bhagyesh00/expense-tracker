export interface SuggestedQuery {
  label: string;
  query: string;
  icon: string;
}

/**
 * Pre-built insight suggestions for common personal finance questions.
 */
export const SUGGESTED_QUERIES: SuggestedQuery[] = [
  {
    label: 'Monthly spending',
    query: 'How much did I spend this month?',
    icon: 'calendar',
  },
  {
    label: 'Top category',
    query: "What's my biggest expense category?",
    icon: 'trending-up',
  },
  {
    label: 'Budget status',
    query: 'Am I on track with my budget?',
    icon: 'target',
  },
  {
    label: 'Month comparison',
    query: 'How does this month compare to last month?',
    icon: 'bar-chart',
  },
  {
    label: 'Cost cutting',
    query: 'Where can I cut costs?',
    icon: 'scissors',
  },
  {
    label: 'Daily average',
    query: "What's my average daily spend?",
    icon: 'activity',
  },
  {
    label: 'Pending payments',
    query: 'Show my pending payments summary',
    icon: 'clock',
  },
  {
    label: 'Savings rate',
    query: "What's my savings rate?",
    icon: 'piggy-bank',
  },
];

/**
 * Get a subset of suggestions, optionally filtered by context.
 */
export function getSuggestedQueries(options?: {
  limit?: number;
  hasBudgets?: boolean;
  hasPendingPayments?: boolean;
}): SuggestedQuery[] {
  let queries = [...SUGGESTED_QUERIES];

  // If the user has no budgets, remove the budget-related suggestion
  if (options?.hasBudgets === false) {
    queries = queries.filter((q) => q.icon !== 'target');
  }

  // If no pending payments, remove that suggestion
  if (options?.hasPendingPayments === false) {
    queries = queries.filter((q) => q.icon !== 'clock');
  }

  const limit = options?.limit ?? queries.length;
  return queries.slice(0, limit);
}
