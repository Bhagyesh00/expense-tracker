export type AnomalySeverity = 'low' | 'medium' | 'high';

export type AnomalyType =
  | 'high_spend'
  | 'velocity_spike'
  | 'duplicate'
  | 'unusual_merchant';

export interface Anomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  categoryId?: string;
  amount?: number;
  average?: number;
  description: string;
  relatedExpenseIds?: string[];
}

export interface ExpenseRecord {
  id: string;
  amount: number;
  description: string;
  category_id: string | null;
  date: string;
  location?: string | null;
  created_at: string;
}

export interface HistoricalAverage {
  categoryId: string;
  categoryName: string;
  mean: number;
  stddev: number;
  count: number;
}

/**
 * Detect spending anomalies using multiple statistical methods.
 */
export function detectAnomalies(
  expenses: ExpenseRecord[],
  historicalAverages: HistoricalAverage[],
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  anomalies.push(...detectZScoreAnomalies(expenses, historicalAverages));
  anomalies.push(...detectVelocitySpikes(expenses, historicalAverages));
  anomalies.push(...detectDuplicates(expenses));
  anomalies.push(...detectUnusualMerchants(expenses, historicalAverages));

  // Sort by severity (high first)
  const severityOrder: Record<AnomalySeverity, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return anomalies;
}

/**
 * Z-score detection: flag if category spend exceeds mean + 2*stddev.
 */
function detectZScoreAnomalies(
  expenses: ExpenseRecord[],
  averages: HistoricalAverage[],
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Aggregate current spending by category
  const categorySpend = new Map<string, number>();
  for (const exp of expenses) {
    if (exp.category_id) {
      const current = categorySpend.get(exp.category_id) ?? 0;
      categorySpend.set(exp.category_id, current + exp.amount);
    }
  }

  for (const avg of averages) {
    if (avg.stddev === 0 || avg.count < 3) continue;

    const currentSpend = categorySpend.get(avg.categoryId);
    if (currentSpend === undefined) continue;

    const zScore = (currentSpend - avg.mean) / avg.stddev;

    if (zScore > 3) {
      anomalies.push({
        type: 'high_spend',
        severity: 'high',
        categoryId: avg.categoryId,
        amount: currentSpend,
        average: avg.mean,
        description: `Spending in ${avg.categoryName} is significantly above normal — ${formatAmount(currentSpend)} vs usual ${formatAmount(avg.mean)}`,
      });
    } else if (zScore > 2) {
      anomalies.push({
        type: 'high_spend',
        severity: 'medium',
        categoryId: avg.categoryId,
        amount: currentSpend,
        average: avg.mean,
        description: `Spending in ${avg.categoryName} is above normal — ${formatAmount(currentSpend)} vs usual ${formatAmount(avg.mean)}`,
      });
    }
  }

  return anomalies;
}

/**
 * Velocity detection: flag if daily spend rate exceeds 1.5x the monthly average rate.
 */
function detectVelocitySpikes(
  expenses: ExpenseRecord[],
  averages: HistoricalAverage[],
): Anomaly[] {
  if (expenses.length === 0) return [];

  const anomalies: Anomaly[] = [];

  // Calculate monthly average total from historical data
  const monthlyAverageTotal = averages.reduce((sum, a) => sum + a.mean, 0);
  const dailyAverageRate = monthlyAverageTotal / 30;

  if (dailyAverageRate === 0) return [];

  // Get the last 3 days of expenses
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const recentExpenses = expenses.filter(
    (e) => new Date(e.date) >= threeDaysAgo,
  );

  if (recentExpenses.length === 0) return [];

  const recentTotal = recentExpenses.reduce((sum, e) => sum + e.amount, 0);
  const recentDailyRate = recentTotal / 3;

  const velocityRatio = recentDailyRate / dailyAverageRate;

  if (velocityRatio > 2.5) {
    anomalies.push({
      type: 'velocity_spike',
      severity: 'high',
      amount: recentDailyRate,
      average: dailyAverageRate,
      description: `Your daily spending rate (${formatAmount(recentDailyRate)}/day) is ${velocityRatio.toFixed(1)}x your normal rate`,
    });
  } else if (velocityRatio > 1.5) {
    anomalies.push({
      type: 'velocity_spike',
      severity: 'medium',
      amount: recentDailyRate,
      average: dailyAverageRate,
      description: `Your daily spending rate (${formatAmount(recentDailyRate)}/day) is above your normal ${formatAmount(dailyAverageRate)}/day`,
    });
  }

  return anomalies;
}

/**
 * Duplicate detection: same amount + similar merchant/description within 24 hours.
 */
function detectDuplicates(expenses: ExpenseRecord[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const seen = new Set<string>();

  // Sort by date descending
  const sorted = [...expenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]!;

    for (let j = i + 1; j < sorted.length; j++) {
      const other = sorted[j]!;

      const timeDiff = Math.abs(
        new Date(current.date).getTime() - new Date(other.date).getTime(),
      );

      // Only check within 24 hours
      if (timeDiff > 24 * 60 * 60 * 1000) break;

      // Same amount and similar description
      if (
        current.amount === other.amount &&
        areSimilarDescriptions(current.description, other.description)
      ) {
        const pairKey = [current.id, other.id].sort().join(':');
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);

        anomalies.push({
          type: 'duplicate',
          severity: 'medium',
          amount: current.amount,
          description: `Possible duplicate: "${current.description}" for ${formatAmount(current.amount)} appears twice within 24 hours`,
          relatedExpenseIds: [current.id, other.id],
        });
      }
    }
  }

  return anomalies;
}

/**
 * Unusual merchant detection: first-time descriptions with high amounts.
 */
function detectUnusualMerchants(
  expenses: ExpenseRecord[],
  averages: HistoricalAverage[],
): Anomaly[] {
  if (expenses.length < 5) return [];

  const anomalies: Anomaly[] = [];

  // Count description frequency
  const descFrequency = new Map<string, number>();
  for (const exp of expenses) {
    const key = exp.description.toLowerCase().trim();
    descFrequency.set(key, (descFrequency.get(key) ?? 0) + 1);
  }

  // Calculate overall average transaction amount
  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
  const avgTransaction = totalAmount / expenses.length;

  // Flag first-time descriptions with high amounts
  for (const exp of expenses) {
    const key = exp.description.toLowerCase().trim();
    const frequency = descFrequency.get(key) ?? 0;

    if (frequency === 1 && exp.amount > avgTransaction * 3) {
      anomalies.push({
        type: 'unusual_merchant',
        severity: exp.amount > avgTransaction * 5 ? 'high' : 'low',
        amount: exp.amount,
        average: avgTransaction,
        description: `Unusual transaction: "${exp.description}" for ${formatAmount(exp.amount)} — first time seeing this and amount is higher than usual`,
        relatedExpenseIds: [exp.id],
      });
    }
  }

  return anomalies;
}

function areSimilarDescriptions(a: string, b: string): boolean {
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();

  if (na === nb) return true;

  // Simple containment check
  if (na.includes(nb) || nb.includes(na)) return true;

  // Basic Levenshtein-like similarity for short strings
  if (na.length < 50 && nb.length < 50) {
    const distance = levenshteinDistance(na, nb);
    const maxLen = Math.max(na.length, nb.length);
    return maxLen > 0 && distance / maxLen < 0.3;
  }

  return false;
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0),
  );

  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
    }
  }

  return dp[m]![n]!;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
