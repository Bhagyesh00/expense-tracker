import type { AIProvider } from '../providers';

export interface FormattedInsight {
  text: string;
  highlights: string[];
  suggestions: string[];
}

/**
 * Format raw query results into a human-readable insight response.
 */
export async function formatInsightResponse(
  provider: AIProvider,
  question: string,
  queryResults: Record<string, unknown>[],
  context?: { currency?: string; budgets?: Array<{ name: string; amount: number; spent: number }> },
): Promise<FormattedInsight> {
  const currency = context?.currency ?? 'INR';
  const formattedResults = formatQueryResults(queryResults, currency);

  const budgetContext = context?.budgets?.length
    ? `\nActive budgets: ${context.budgets
        .map((b) => `${b.name}: ${formatCurrency(b.spent, currency)}/${formatCurrency(b.amount, currency)}`)
        .join(', ')}`
    : '';

  const prompt = `You are a personal finance assistant. The user asked a question and here are the query results. Provide a clear, helpful answer.

User question: "${question}"

Query results:
${formattedResults}
${budgetContext}

Respond with ONLY a JSON object:
{
  "text": "<clear answer in 2-4 sentences, use ${currency} currency formatting>",
  "highlights": ["<key number or fact 1>", "<key number or fact 2>"],
  "suggestions": ["<follow-up question 1>", "<follow-up question 2>"]
}`;

  const raw = await provider.generateText(prompt, {
    temperature: 0.3,
    maxTokens: 512,
  });

  return parseFormattedResponse(raw, question, queryResults, currency);
}

function formatQueryResults(
  results: Record<string, unknown>[],
  currency: string,
): string {
  if (results.length === 0) {
    return 'No results found.';
  }

  // For small result sets, show as readable list
  if (results.length <= 5) {
    return results
      .map((row, i) => {
        const entries = Object.entries(row)
          .map(([key, value]) => {
            const formatted =
              typeof value === 'number' && isAmountField(key)
                ? formatCurrency(value, currency)
                : String(value ?? 'N/A');
            return `${key}: ${formatted}`;
          })
          .join(', ');
        return `${i + 1}. ${entries}`;
      })
      .join('\n');
  }

  // For larger result sets, show summary
  return JSON.stringify(results.slice(0, 10), null, 2) +
    (results.length > 10 ? `\n... and ${results.length - 10} more rows` : '');
}

function isAmountField(key: string): boolean {
  const amountFields = ['amount', 'total', 'sum', 'avg', 'average', 'spent', 'budget', 'savings'];
  return amountFields.some((f) => key.toLowerCase().includes(f));
}

export function formatCurrency(amount: number, currency: string): string {
  try {
    const locale = currency === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function parseFormattedResponse(
  raw: string,
  question: string,
  results: Record<string, unknown>[],
  currency: string,
): FormattedInsight {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found');
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    return {
      text: typeof parsed.text === 'string' ? parsed.text : generateFallbackText(question, results, currency),
      highlights: Array.isArray(parsed.highlights)
        ? parsed.highlights.filter((h): h is string => typeof h === 'string')
        : [],
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.filter((s): s is string => typeof s === 'string')
        : [],
    };
  } catch {
    return {
      text: generateFallbackText(question, results, currency),
      highlights: [],
      suggestions: [
        'How does this compare to last month?',
        'What are my top expense categories?',
      ],
    };
  }
}

function generateFallbackText(
  question: string,
  results: Record<string, unknown>[],
  currency: string,
): string {
  if (results.length === 0) {
    return `I couldn't find any data matching your question: "${question}". Try adjusting the time period or category.`;
  }

  const firstRow = results[0]!;
  const values = Object.entries(firstRow)
    .map(([key, value]) => {
      if (typeof value === 'number' && isAmountField(key)) {
        return `${key}: ${formatCurrency(value, currency)}`;
      }
      return `${key}: ${value}`;
    })
    .join(', ');

  return `Based on your data: ${values}. Found ${results.length} result${results.length === 1 ? '' : 's'} total.`;
}
