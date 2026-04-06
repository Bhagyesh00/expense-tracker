export interface DailyExpense {
  date: string;
  amount: number;
  categoryId?: string | null;
}

export interface RecurringExpense {
  amount: number;
  categoryId?: string | null;
  nextDueDate: string;
  interval: 'daily' | 'weekly' | 'biweekly' | 'monthly';
}

export interface PendingPaymentEntry {
  amount: number;
  dueDate: string | null;
  categoryId?: string | null;
}

export interface CategoryForecast {
  categoryId: string;
  projectedAmount: number;
  currentAmount: number;
}

export interface ForecastResult {
  projectedTotal: number;
  projectedByCategory: CategoryForecast[];
  confidence: number;
  daysRemaining: number;
  daysElapsed: number;
  dailyAverage: number;
  projectedSavings: number | null;
  currentTotal: number;
}

/**
 * Forecast end-of-month spending using weighted moving averages,
 * accounting for recurring expenses and pending payments.
 */
export function forecastMonthEnd(
  dailyExpenses: DailyExpense[],
  recurringExpenses: RecurringExpense[],
  pendingPayments: PendingPaymentEntry[],
  monthlyIncome?: number,
): ForecastResult {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = now.getDate();
  const daysRemaining = daysInMonth - currentDay;
  const daysElapsed = currentDay;

  // Aggregate current spending
  const monthStart = new Date(year, month, 1);
  const monthExpenses = dailyExpenses.filter((e) => {
    const d = new Date(e.date);
    return d >= monthStart && d.getMonth() === month && d.getFullYear() === year;
  });

  const currentTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Calculate weighted daily average (recent days weighted more heavily)
  const dailyAverage = calculateWeightedDailyAverage(monthExpenses, daysElapsed);

  // Estimate remaining regular spending
  const projectedRegularRemaining = dailyAverage * daysRemaining;

  // Calculate upcoming recurring expenses
  const recurringRemaining = calculateUpcomingRecurring(
    recurringExpenses,
    now,
    new Date(year, month + 1, 0),
  );

  // Calculate pending payments due this month
  const pendingDueThisMonth = pendingPayments
    .filter((p) => {
      if (!p.dueDate) return false;
      const due = new Date(p.dueDate);
      return due >= now && due.getMonth() === month && due.getFullYear() === year;
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const projectedTotal =
    currentTotal + projectedRegularRemaining + recurringRemaining + pendingDueThisMonth;

  // Per-category forecast
  const projectedByCategory = forecastByCategory(
    monthExpenses,
    daysElapsed,
    daysRemaining,
    recurringExpenses,
    now,
    new Date(year, month + 1, 0),
  );

  // Confidence based on data available
  const confidence = calculateConfidence(daysElapsed, monthExpenses.length);

  // Savings projection
  const projectedSavings =
    monthlyIncome !== undefined ? monthlyIncome - projectedTotal : null;

  return {
    projectedTotal: Math.round(projectedTotal * 100) / 100,
    projectedByCategory,
    confidence,
    daysRemaining,
    daysElapsed,
    dailyAverage: Math.round(dailyAverage * 100) / 100,
    projectedSavings:
      projectedSavings !== null
        ? Math.round(projectedSavings * 100) / 100
        : null,
    currentTotal: Math.round(currentTotal * 100) / 100,
  };
}

/**
 * Weighted daily average: recent days count more.
 * Uses a linearly increasing weight so the last few days influence the
 * forecast more than the first days of the month.
 */
function calculateWeightedDailyAverage(
  expenses: DailyExpense[],
  daysElapsed: number,
): number {
  if (daysElapsed === 0 || expenses.length === 0) return 0;

  // Group expenses by day number
  const dailyTotals = new Map<number, number>();
  for (const exp of expenses) {
    const day = new Date(exp.date).getDate();
    dailyTotals.set(day, (dailyTotals.get(day) ?? 0) + exp.amount);
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (let day = 1; day <= daysElapsed; day++) {
    const amount = dailyTotals.get(day) ?? 0;
    // Linear weight: day 1 gets weight 1, last day gets weight = daysElapsed
    const weight = day;
    weightedSum += amount * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

function calculateUpcomingRecurring(
  recurring: RecurringExpense[],
  from: Date,
  monthEnd: Date,
): number {
  let total = 0;

  for (const rec of recurring) {
    const nextDue = new Date(rec.nextDueDate);
    if (nextDue >= from && nextDue <= monthEnd) {
      total += rec.amount;
    }

    // For daily/weekly, project additional occurrences
    if (rec.interval === 'daily') {
      const daysLeft = Math.ceil(
        (monthEnd.getTime() - from.getTime()) / (24 * 60 * 60 * 1000),
      );
      total += rec.amount * daysLeft;
    } else if (rec.interval === 'weekly') {
      const weeksLeft = Math.floor(
        (monthEnd.getTime() - from.getTime()) / (7 * 24 * 60 * 60 * 1000),
      );
      total += rec.amount * weeksLeft;
    }
  }

  return total;
}

function forecastByCategory(
  expenses: DailyExpense[],
  daysElapsed: number,
  daysRemaining: number,
  recurring: RecurringExpense[],
  from: Date,
  monthEnd: Date,
): CategoryForecast[] {
  const categoryTotals = new Map<string, number>();

  for (const exp of expenses) {
    const catId = exp.categoryId ?? 'uncategorized';
    categoryTotals.set(catId, (categoryTotals.get(catId) ?? 0) + exp.amount);
  }

  const forecasts: CategoryForecast[] = [];

  for (const [categoryId, currentAmount] of categoryTotals) {
    const dailyRate = daysElapsed > 0 ? currentAmount / daysElapsed : 0;
    const projectedRemaining = dailyRate * daysRemaining;

    // Add recurring for this category
    const recurringAmount = recurring
      .filter((r) => r.categoryId === categoryId)
      .reduce((sum, r) => {
        const nextDue = new Date(r.nextDueDate);
        return nextDue >= from && nextDue <= monthEnd ? sum + r.amount : sum;
      }, 0);

    forecasts.push({
      categoryId,
      currentAmount: Math.round(currentAmount * 100) / 100,
      projectedAmount:
        Math.round((currentAmount + projectedRemaining + recurringAmount) * 100) / 100,
    });
  }

  // Sort by projected amount descending
  forecasts.sort((a, b) => b.projectedAmount - a.projectedAmount);

  return forecasts;
}

/**
 * Confidence decreases early in the month (less data), increases later.
 */
function calculateConfidence(
  daysElapsed: number,
  expenseCount: number,
): number {
  if (daysElapsed === 0 || expenseCount === 0) return 0;

  // Base confidence from time elapsed (0.3 to 0.95)
  const timeConfidence = Math.min(0.95, 0.3 + (daysElapsed / 30) * 0.65);

  // Bonus for having more data points
  const dataConfidence = Math.min(1.0, expenseCount / 20);

  const combined = timeConfidence * 0.7 + dataConfidence * 0.3;
  return Math.round(combined * 100) / 100;
}
