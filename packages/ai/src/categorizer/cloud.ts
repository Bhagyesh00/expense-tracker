import type { AIProvider } from '../providers';

export interface CategorizationResult {
  categoryId: string;
  confidence: number;
  reasoning: string;
}

/**
 * Categorize an expense using cloud AI.
 * Returns null if confidence is below threshold (0.7).
 */
export async function categorizeExpense(
  provider: AIProvider,
  description: string,
  merchant: string | null | undefined,
  categories: Array<{ id: string; name: string }>,
): Promise<CategorizationResult | null> {
  if (categories.length === 0) {
    return null;
  }

  const fullDescription = merchant
    ? `${description} (merchant: ${merchant})`
    : description;

  const rawResponse = await provider.categorizeExpense(
    fullDescription,
    categories,
  );

  const parsed = parseJsonResponse(rawResponse);
  if (!parsed) {
    return null;
  }

  const { categoryId, confidence, reasoning } = parsed;

  // Validate categoryId exists in the provided list
  const validCategory = categories.find((c) => c.id === categoryId);
  if (!validCategory) {
    return null;
  }

  // Validate confidence is a number in [0, 1]
  const normalizedConfidence =
    typeof confidence === 'number' ? Math.max(0, Math.min(1, confidence)) : 0;

  // Only return if confidence exceeds threshold
  if (normalizedConfidence < 0.7) {
    return null;
  }

  return {
    categoryId,
    confidence: normalizedConfidence,
    reasoning: typeof reasoning === 'string' ? reasoning : '',
  };
}

function parseJsonResponse(
  raw: string,
): { categoryId: string; confidence: number; reasoning: string } | null {
  try {
    // Try to extract JSON from the response (may be wrapped in markdown code blocks)
    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    if (typeof parsed.categoryId !== 'string') {
      return null;
    }

    return {
      categoryId: parsed.categoryId,
      confidence: Number(parsed.confidence) || 0,
      reasoning: String(parsed.reasoning ?? ''),
    };
  } catch {
    return null;
  }
}
