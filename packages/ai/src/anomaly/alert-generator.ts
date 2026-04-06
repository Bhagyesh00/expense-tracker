import type { AIProvider } from '../providers';
import type { Anomaly, AnomalyType } from './detector';

export interface AlertMessage {
  title: string;
  body: string;
  emoji: string;
  actionSuggestion: string;
}

/**
 * Generate a human-friendly alert message for a spending anomaly.
 * Uses AI when available; falls back to template-based messages.
 */
export async function generateAlertMessage(
  provider: AIProvider | null,
  anomaly: Anomaly,
): Promise<AlertMessage> {
  // Try AI-generated message first
  if (provider) {
    try {
      const anomalyData = JSON.stringify({
        type: anomaly.type,
        severity: anomaly.severity,
        amount: anomaly.amount,
        average: anomaly.average,
        description: anomaly.description,
        categoryId: anomaly.categoryId,
      });

      const raw = await provider.generateAlert(anomalyData);
      const parsed = parseAlertResponse(raw);
      if (parsed) return parsed;
    } catch {
      // Fall through to template
    }
  }

  // Fallback: template-based messages
  return generateTemplateAlert(anomaly);
}

function parseAlertResponse(raw: string): AlertMessage | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    if (
      typeof parsed.title !== 'string' ||
      typeof parsed.body !== 'string'
    ) {
      return null;
    }

    return {
      title: parsed.title,
      body: parsed.body,
      emoji: typeof parsed.emoji === 'string' ? parsed.emoji : getDefaultEmoji(null),
      actionSuggestion:
        typeof parsed.actionSuggestion === 'string'
          ? parsed.actionSuggestion
          : '',
    };
  } catch {
    return null;
  }
}

function generateTemplateAlert(anomaly: Anomaly): AlertMessage {
  const templates: Record<AnomalyType, (a: Anomaly) => AlertMessage> = {
    high_spend: (a) => ({
      title: 'Spending Alert',
      body: a.categoryId
        ? `Your spending in this category has gone above the usual level. Current: ${formatAmount(a.amount ?? 0)}, usual: ${formatAmount(a.average ?? 0)}.`
        : `Your overall spending is higher than usual.`,
      emoji: getDefaultEmoji('high_spend'),
      actionSuggestion:
        'Review recent transactions in this category and check if all charges are expected.',
    }),

    velocity_spike: (a) => ({
      title: 'Spending Pace Alert',
      body: `You're spending faster than usual — ${formatAmount(a.amount ?? 0)}/day compared to your typical ${formatAmount(a.average ?? 0)}/day.`,
      emoji: getDefaultEmoji('velocity_spike'),
      actionSuggestion:
        'Consider slowing down discretionary purchases for the rest of the week.',
    }),

    duplicate: (a) => ({
      title: 'Possible Duplicate',
      body: `A transaction for ${formatAmount(a.amount ?? 0)} looks like it may have been recorded twice.`,
      emoji: getDefaultEmoji('duplicate'),
      actionSuggestion:
        'Check if both entries are intentional or if one should be removed.',
    }),

    unusual_merchant: (a) => ({
      title: 'Unusual Transaction',
      body: `A ${formatAmount(a.amount ?? 0)} transaction from an unfamiliar source was detected.`,
      emoji: getDefaultEmoji('unusual_merchant'),
      actionSuggestion:
        'Verify this transaction is legitimate and add the merchant to your known list.',
    }),
  };

  const generator = templates[anomaly.type];
  return generator(anomaly);
}

function getDefaultEmoji(type: AnomalyType | null): string {
  const emojiMap: Record<AnomalyType, string> = {
    high_spend: '\u26a0\ufe0f',
    velocity_spike: '\ud83d\udcc8',
    duplicate: '\ud83d\udd04',
    unusual_merchant: '\ud83d\udea8',
  };

  return type ? emojiMap[type] : '\ud83d\udcb0';
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
