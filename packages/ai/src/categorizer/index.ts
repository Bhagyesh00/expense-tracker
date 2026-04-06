import type { AIProvider } from '../providers';
import { categorizeExpense as cloudCategorize } from './cloud';
import { applyRules, type CategorizationRule } from './rules-engine';

export type { CategorizationRule, MatchType } from './rules-engine';
export type { CategorizationResult } from './cloud';

export type CategorizationSource = 'rule' | 'ai' | 'none';

export interface CategorizationOutput {
  categoryId: string | null;
  confidence: number;
  source: CategorizationSource;
  reasoning?: string;
}

/**
 * Orchestrated expense categorization pipeline:
 *  1. Check user-defined rules (instant, deterministic)
 *  2. Fall back to cloud AI categorization
 *  3. Return best match or { source: 'none' }
 */
export async function categorize(
  provider: AIProvider,
  description: string,
  merchant: string | null | undefined,
  categories: Array<{ id: string; name: string }>,
  userRules?: CategorizationRule[],
): Promise<CategorizationOutput> {
  // Step 1: User-defined rules (checked first -- instant, free)
  if (userRules && userRules.length > 0) {
    const ruleMatch = applyRules(description, userRules);
    if (ruleMatch) {
      return {
        categoryId: ruleMatch,
        confidence: 1.0,
        source: 'rule',
        reasoning: 'Matched user-defined categorization rule',
      };
    }
  }

  // Step 2: Cloud AI categorization
  try {
    const aiResult = await cloudCategorize(
      provider,
      description,
      merchant,
      categories,
    );

    if (aiResult) {
      return {
        categoryId: aiResult.categoryId,
        confidence: aiResult.confidence,
        source: 'ai',
        reasoning: aiResult.reasoning,
      };
    }
  } catch (error: unknown) {
    console.warn(
      '[Categorizer] AI categorization failed:',
      error instanceof Error ? error.message : String(error),
    );
  }

  // Step 3: No match
  return {
    categoryId: null,
    confidence: 0,
    source: 'none',
  };
}
