export interface ExpenseInput {
  id?: string;
  amount: number;
  description: string;
  date: string;
  merchant?: string | null;
}

export interface DuplicateResult {
  isDuplicate: boolean;
  matchingExpenseId: string | null;
  confidence: number;
}

/**
 * Detect if a new expense is likely a duplicate of a recent expense.
 * Uses amount matching + description similarity within a 24-hour window.
 */
export function detectDuplicate(
  newExpense: ExpenseInput,
  recentExpenses: ExpenseInput[],
): DuplicateResult {
  if (recentExpenses.length === 0) {
    return { isDuplicate: false, matchingExpenseId: null, confidence: 0 };
  }

  const newDate = new Date(newExpense.date).getTime();
  let bestMatch: { id: string; confidence: number } | null = null;

  for (const existing of recentExpenses) {
    // Skip self-comparison
    if (existing.id && newExpense.id && existing.id === newExpense.id) {
      continue;
    }

    const existingDate = new Date(existing.date).getTime();
    const timeDiffHours =
      Math.abs(newDate - existingDate) / (1000 * 60 * 60);

    // Only consider expenses within 24 hours
    if (timeDiffHours > 24) continue;

    const confidence = calculateDuplicateConfidence(
      newExpense,
      existing,
      timeDiffHours,
    );

    if (confidence > (bestMatch?.confidence ?? 0)) {
      bestMatch = {
        id: existing.id ?? '',
        confidence,
      };
    }
  }

  if (bestMatch && bestMatch.confidence >= 0.7) {
    return {
      isDuplicate: true,
      matchingExpenseId: bestMatch.id || null,
      confidence: bestMatch.confidence,
    };
  }

  return { isDuplicate: false, matchingExpenseId: null, confidence: 0 };
}

function calculateDuplicateConfidence(
  a: ExpenseInput,
  b: ExpenseInput,
  timeDiffHours: number,
): number {
  let score = 0;

  // Amount match (exact match = 0.4, close match = 0.2)
  if (a.amount === b.amount) {
    score += 0.4;
  } else {
    const amountDiff =
      Math.abs(a.amount - b.amount) / Math.max(a.amount, b.amount);
    if (amountDiff < 0.01) {
      score += 0.3;
    } else if (amountDiff < 0.05) {
      score += 0.1;
    }
  }

  // Description similarity (0 to 0.4)
  const descSimilarity = calculateStringSimilarity(
    a.description.toLowerCase().trim(),
    b.description.toLowerCase().trim(),
  );
  score += descSimilarity * 0.4;

  // Merchant match (0.15 bonus)
  if (a.merchant && b.merchant) {
    const merchantSimilarity = calculateStringSimilarity(
      a.merchant.toLowerCase().trim(),
      b.merchant.toLowerCase().trim(),
    );
    score += merchantSimilarity * 0.15;
  }

  // Time proximity bonus (closer = higher, max 0.05)
  if (timeDiffHours < 1) {
    score += 0.05;
  } else if (timeDiffHours < 6) {
    score += 0.03;
  }

  return Math.min(1.0, Math.round(score * 100) / 100);
}

/**
 * Calculate string similarity using Levenshtein distance, normalized to [0, 1].
 */
function calculateStringSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (a.length === 0 || b.length === 0) return 0;

  // Short-circuit for containment
  if (a.includes(b) || b.includes(a)) {
    const shorter = Math.min(a.length, b.length);
    const longer = Math.max(a.length, b.length);
    return shorter / longer;
  }

  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen > 0 ? 1 - distance / maxLen : 0;
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Use single-row optimization for memory efficiency
  let prevRow = Array.from({ length: n + 1 }, (_, j) => j);
  let currRow = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j]! + 1,
        currRow[j - 1]! + 1,
        prevRow[j - 1]! + cost,
      );
    }
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[n]!;
}
