export type MatchType = 'contains' | 'startsWith' | 'exact' | 'regex';

export interface CategorizationRule {
  pattern: string;
  matchType: MatchType;
  categoryId: string;
}

/**
 * Apply user-defined categorization rules to an expense description.
 * Rules are checked in order; first match wins.
 * Returns the matching categoryId, or null if no rule matches.
 */
export function applyRules(
  description: string,
  rules: CategorizationRule[],
): string | null {
  const normalized = description.toLowerCase().trim();

  for (const rule of rules) {
    if (matchesRule(normalized, rule)) {
      return rule.categoryId;
    }
  }

  return null;
}

function matchesRule(
  normalizedDescription: string,
  rule: CategorizationRule,
): boolean {
  const pattern = rule.pattern.toLowerCase().trim();

  switch (rule.matchType) {
    case 'exact':
      return normalizedDescription === pattern;

    case 'startsWith':
      return normalizedDescription.startsWith(pattern);

    case 'contains':
      return normalizedDescription.includes(pattern);

    case 'regex':
      try {
        const regex = new RegExp(rule.pattern, 'i');
        return regex.test(normalizedDescription);
      } catch {
        // Invalid regex pattern -- skip silently
        return false;
      }

    default:
      return false;
  }
}
