import type { TypedSupabaseClient } from '../client';
import type {
  SpendTrendPoint,
  BudgetVsActualItem,
  IncomeVsExpenseMonth,
  HeatmapDay,
  TopCategoryItem,
  YearComparison,
  ContactOutstanding,
  ReportExportData,
} from '@expenseflow/types';

// ---------------------------------------------------------------------------
// Local query-layer types (kept for backward compat)
// ---------------------------------------------------------------------------

export interface MonthlySummary {
  totalExpenses: number;
  totalIncome: number;
  netSavings: number;
  savingsRate: number;
  avgDailySpend: number;
  transactionCount: number;
  avgExpense: number;
  topCategory: { name: string; amount: number; color: string | null } | null;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
  subcategories: SubcategoryBreakdownItem[];
}

export interface SubcategoryBreakdownItem {
  subcategoryId: string;
  subcategoryName: string;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
}

// Re-export types from the models package for convenience
export type {
  SpendTrendPoint,
  BudgetVsActualItem,
  IncomeVsExpenseMonth,
  HeatmapDay,
  TopCategoryItem,
  YearComparison,
  ContactOutstanding,
  ReportExportData,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

function monthStartEnd(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

// ---------------------------------------------------------------------------
// getMonthlySummary
// ---------------------------------------------------------------------------

export async function getMonthlySummary(
  client: TypedSupabaseClient,
  workspaceId: string,
  month: number,
  year: number,
): Promise<MonthlySummary> {
  const { start: startDate, end: endDate } = monthStartEnd(year, month);

  const { data, error } = await client
    .from('expenses')
    .select('type, amount, category_id, categories(name, color)')
    .eq('workspace_id', workspaceId)
    .gte('date', startDate)
    .lte('date', endDate)
    .is('deleted_at', null);

  if (error) throw error;

  const expenses = (data ?? []) as {
    type: string;
    amount: number;
    category_id: string;
    categories: { name: string; color: string | null } | null;
  }[];

  const totalExpenses = expenses
    .filter((e) => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalIncome = expenses
    .filter((e) => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0);

  const expenseItems = expenses.filter((e) => e.type === 'expense');
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
  const numDays = daysInMonth(year, month);
  const avgDailySpend = numDays > 0 ? totalExpenses / numDays : 0;

  // Find top category
  const categoryTotals = new Map<string, { name: string; amount: number; color: string | null }>();
  for (const expense of expenseItems) {
    const catName = expense.categories?.name ?? 'Uncategorized';
    const existing = categoryTotals.get(catName);
    if (existing) {
      existing.amount += expense.amount;
    } else {
      categoryTotals.set(catName, {
        name: catName,
        amount: expense.amount,
        color: expense.categories?.color ?? null,
      });
    }
  }

  let topCategory: MonthlySummary['topCategory'] = null;
  let maxAmount = 0;
  for (const cat of categoryTotals.values()) {
    if (cat.amount > maxAmount) {
      maxAmount = cat.amount;
      topCategory = cat;
    }
  }

  return {
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    totalIncome: Math.round(totalIncome * 100) / 100,
    netSavings: Math.round(netSavings * 100) / 100,
    savingsRate: Math.round(savingsRate * 100) / 100,
    avgDailySpend: Math.round(avgDailySpend * 100) / 100,
    transactionCount: expenses.length,
    avgExpense: expenseItems.length > 0
      ? Math.round((totalExpenses / expenseItems.length) * 100) / 100
      : 0,
    topCategory,
  };
}

// ---------------------------------------------------------------------------
// getCategoryBreakdown
// ---------------------------------------------------------------------------

export async function getCategoryBreakdown(
  client: TypedSupabaseClient,
  workspaceId: string,
  startDate: string,
  endDate: string,
): Promise<CategoryBreakdownItem[]> {
  const { data, error } = await client
    .from('expenses')
    .select('amount, category_id, subcategory_id, categories(id, name, icon, color)')
    .eq('workspace_id', workspaceId)
    .eq('type', 'expense')
    .gte('date', startDate)
    .lte('date', endDate)
    .is('deleted_at', null);

  if (error) throw error;

  const expenses = (data ?? []) as {
    amount: number;
    category_id: string;
    subcategory_id: string | null;
    categories: { id: string; name: string; icon: string | null; color: string | null } | null;
  }[];

  // Aggregate by category
  const totals = new Map<
    string,
    {
      categoryId: string;
      categoryName: string;
      categoryIcon: string | null;
      categoryColor: string | null;
      totalAmount: number;
      transactionCount: number;
      subcategories: Map<string, { id: string; name: string; amount: number; count: number }>;
    }
  >();

  for (const expense of expenses) {
    const catId = expense.category_id ?? 'uncategorized';
    const existing = totals.get(catId);
    if (existing) {
      existing.totalAmount += expense.amount;
      existing.transactionCount += 1;
    } else {
      totals.set(catId, {
        categoryId: catId,
        categoryName: expense.categories?.name ?? 'Uncategorized',
        categoryIcon: expense.categories?.icon ?? null,
        categoryColor: expense.categories?.color ?? null,
        totalAmount: expense.amount,
        transactionCount: 1,
        subcategories: new Map(),
      });
    }

    // Track subcategory if present
    if (expense.subcategory_id) {
      const catEntry = totals.get(catId)!;
      const subExisting = catEntry.subcategories.get(expense.subcategory_id);
      if (subExisting) {
        subExisting.amount += expense.amount;
        subExisting.count += 1;
      } else {
        catEntry.subcategories.set(expense.subcategory_id, {
          id: expense.subcategory_id,
          name: expense.subcategory_id, // Will be resolved if subcategory names are available
          amount: expense.amount,
          count: 1,
        });
      }
    }
  }

  const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  return Array.from(totals.values())
    .map((item) => {
      const subcategories: SubcategoryBreakdownItem[] = Array.from(item.subcategories.values())
        .map((sub) => ({
          subcategoryId: sub.id,
          subcategoryName: sub.name,
          totalAmount: Math.round(sub.amount * 100) / 100,
          percentage: item.totalAmount > 0 ? Math.round((sub.amount / item.totalAmount) * 10000) / 100 : 0,
          transactionCount: sub.count,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);

      return {
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        categoryIcon: item.categoryIcon,
        categoryColor: item.categoryColor,
        totalAmount: Math.round(item.totalAmount * 100) / 100,
        transactionCount: item.transactionCount,
        percentage: grandTotal > 0 ? Math.round((item.totalAmount / grandTotal) * 10000) / 100 : 0,
        subcategories,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

// ---------------------------------------------------------------------------
// getSpendTrend
// ---------------------------------------------------------------------------

export async function getSpendTrend(
  client: TypedSupabaseClient,
  workspaceId: string,
  startDate: string,
  endDate: string,
  granularity: 'daily' | 'weekly' | 'monthly' = 'monthly',
): Promise<SpendTrendPoint[]> {
  const { data, error } = await client
    .from('expenses')
    .select('type, amount, date')
    .eq('workspace_id', workspaceId)
    .gte('date', startDate)
    .lte('date', endDate)
    .is('deleted_at', null)
    .order('date', { ascending: true });

  if (error) throw error;

  const expenses = (data ?? []) as { type: string; amount: number; date: string }[];

  const buckets = new Map<string, SpendTrendPoint>();

  // Initialize buckets based on granularity
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (granularity === 'daily') {
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = toDateStr(cursor);
      buckets.set(key, { date: key, expenses: 0, income: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (granularity === 'weekly') {
    const cursor = new Date(start);
    // Align to Monday
    const day = cursor.getDay();
    const diff = day === 0 ? 6 : day - 1;
    cursor.setDate(cursor.getDate() - diff);
    while (cursor <= end) {
      const key = toDateStr(cursor);
      buckets.set(key, { date: key, expenses: 0, income: 0 });
      cursor.setDate(cursor.getDate() + 7);
    }
  } else {
    // monthly
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, { date: key, expenses: 0, income: 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  // Fill buckets
  for (const expense of expenses) {
    const d = new Date(expense.date);
    let key: string;

    if (granularity === 'daily') {
      key = toDateStr(d);
    } else if (granularity === 'weekly') {
      const dayOfWeek = d.getDay();
      const mondayDiff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(d);
      monday.setDate(d.getDate() - mondayDiff);
      key = toDateStr(monday);
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    const bucket = buckets.get(key);
    if (bucket) {
      if (expense.type === 'expense') {
        bucket.expenses += expense.amount;
      } else {
        bucket.income += expense.amount;
      }
    }
  }

  return Array.from(buckets.values()).map((b) => ({
    date: b.date,
    expenses: Math.round(b.expenses * 100) / 100,
    income: Math.round(b.income * 100) / 100,
  }));
}

// ---------------------------------------------------------------------------
// getBudgetVsActual
// ---------------------------------------------------------------------------

export async function getBudgetVsActual(
  client: TypedSupabaseClient,
  workspaceId: string,
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly',
): Promise<BudgetVsActualItem[]> {
  const now = new Date();
  const periodDates = getPeriodRange(period, now);

  // Fetch active budgets with category info
  const { data: budgets, error: budgetsError } = await client
    .from('budgets')
    .select('*, categories(id, name, icon, color)')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true);

  if (budgetsError) throw budgetsError;

  // Fetch actual spending per category for the period
  const { data: spending, error: spendingError } = await client
    .from('expenses')
    .select('category_id, amount')
    .eq('workspace_id', workspaceId)
    .eq('type', 'expense')
    .gte('date', periodDates.start)
    .lte('date', periodDates.end)
    .is('deleted_at', null);

  if (spendingError) throw spendingError;

  // Aggregate spending by category
  const spendingByCategory = (spending ?? []).reduce<Record<string, number>>(
    (acc, expense) => {
      const catId = expense.category_id as string;
      acc[catId] = (acc[catId] ?? 0) + (expense.amount as number);
      return acc;
    },
    {},
  );

  return (budgets ?? []).map((budget) => {
    const cat = budget.categories as { id: string; name: string; icon: string | null; color: string | null } | null;
    const actualAmount = spendingByCategory[budget.category_id as string] ?? 0;
    const budgetAmount = budget.amount as number;
    const percentage = budgetAmount > 0
      ? Math.round((actualAmount / budgetAmount) * 10000) / 100
      : 0;

    return {
      categoryId: (budget.category_id as string) ?? '',
      categoryName: cat?.name ?? 'Unknown',
      categoryColor: cat?.color ?? null,
      categoryIcon: cat?.icon ?? null,
      budgetAmount,
      actualAmount: Math.round(actualAmount * 100) / 100,
      percentage,
      isOverBudget: actualAmount > budgetAmount,
    };
  }).sort((a, b) => b.percentage - a.percentage);
}

// ---------------------------------------------------------------------------
// getIncomeVsExpense
// ---------------------------------------------------------------------------

export async function getIncomeVsExpense(
  client: TypedSupabaseClient,
  workspaceId: string,
  months: number = 6,
): Promise<IncomeVsExpenseMonth[]> {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const { data, error } = await client
    .from('expenses')
    .select('type, amount, date')
    .eq('workspace_id', workspaceId)
    .gte('date', startDate.toISOString())
    .is('deleted_at', null)
    .order('date', { ascending: true });

  if (error) throw error;

  const expenses = (data ?? []) as { type: string; amount: number; date: string }[];

  // Initialize all months
  const monthlyData = new Map<string, IncomeVsExpenseMonth>();
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    monthlyData.set(key, { month: label, income: 0, expense: 0, net: 0 });
  }

  for (const exp of expenses) {
    const d = new Date(exp.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const point = monthlyData.get(key);
    if (point) {
      if (exp.type === 'income') {
        point.income += exp.amount;
      } else {
        point.expense += exp.amount;
      }
    }
  }

  return Array.from(monthlyData.values()).map((m) => ({
    month: m.month,
    income: Math.round(m.income * 100) / 100,
    expense: Math.round(m.expense * 100) / 100,
    net: Math.round((m.income - m.expense) * 100) / 100,
  }));
}

// ---------------------------------------------------------------------------
// getDailyHeatmap
// ---------------------------------------------------------------------------

export async function getDailyHeatmap(
  client: TypedSupabaseClient,
  workspaceId: string,
  year: number,
  month: number,
): Promise<HeatmapDay[]> {
  const { start: startDate, end: endDate } = monthStartEnd(year, month);

  const { data, error } = await client
    .from('expenses')
    .select('amount, date')
    .eq('workspace_id', workspaceId)
    .eq('type', 'expense')
    .gte('date', startDate)
    .lte('date', endDate)
    .is('deleted_at', null);

  if (error) throw error;

  const expenses = (data ?? []) as { amount: number; date: string }[];

  // Aggregate by date
  const dailyMap = new Map<string, { amount: number; count: number }>();
  const numDays = daysInMonth(year, month);

  // Initialize all days
  for (let d = 1; d <= numDays; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    dailyMap.set(dateStr, { amount: 0, count: 0 });
  }

  for (const exp of expenses) {
    const dateKey = exp.date.split('T')[0]!;
    const existing = dailyMap.get(dateKey);
    if (existing) {
      existing.amount += exp.amount;
      existing.count += 1;
    }
  }

  // Calculate intensity thresholds (quartiles of non-zero amounts)
  const nonZeroAmounts = Array.from(dailyMap.values())
    .map((d) => d.amount)
    .filter((a) => a > 0)
    .sort((a, b) => a - b);

  const p33 = nonZeroAmounts.length > 0
    ? nonZeroAmounts[Math.floor(nonZeroAmounts.length * 0.33)] ?? 0
    : 0;
  const p66 = nonZeroAmounts.length > 0
    ? nonZeroAmounts[Math.floor(nonZeroAmounts.length * 0.66)] ?? 0
    : 0;

  function getIntensity(amount: number): HeatmapDay['intensity'] {
    if (amount === 0) return 'none';
    if (amount <= p33) return 'low';
    if (amount <= p66) return 'medium';
    return 'high';
  }

  return Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    amount: Math.round(data.amount * 100) / 100,
    count: data.count,
    intensity: getIntensity(data.amount),
  }));
}

// ---------------------------------------------------------------------------
// getTopCategories
// ---------------------------------------------------------------------------

export async function getTopCategories(
  client: TypedSupabaseClient,
  workspaceId: string,
  startDate: string,
  endDate: string,
  limit: number = 5,
): Promise<TopCategoryItem[]> {
  const { data, error } = await client
    .from('expenses')
    .select('amount, category_id, categories(id, name, icon, color)')
    .eq('workspace_id', workspaceId)
    .eq('type', 'expense')
    .gte('date', startDate)
    .lte('date', endDate)
    .is('deleted_at', null);

  if (error) throw error;

  const expenses = (data ?? []) as {
    amount: number;
    category_id: string;
    categories: { id: string; name: string; icon: string | null; color: string | null } | null;
  }[];

  const categoryMap = new Map<string, {
    categoryId: string;
    name: string;
    icon: string | null;
    color: string | null;
    amount: number;
  }>();

  for (const exp of expenses) {
    const catId = exp.category_id ?? 'uncategorized';
    const existing = categoryMap.get(catId);
    if (existing) {
      existing.amount += exp.amount;
    } else {
      categoryMap.set(catId, {
        categoryId: catId,
        name: exp.categories?.name ?? 'Uncategorized',
        icon: exp.categories?.icon ?? null,
        color: exp.categories?.color ?? null,
        amount: exp.amount,
      });
    }
  }

  const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  return Array.from(categoryMap.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
    .map((cat, index) => ({
      categoryId: cat.categoryId,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      amount: Math.round(cat.amount * 100) / 100,
      percentage: grandTotal > 0 ? Math.round((cat.amount / grandTotal) * 10000) / 100 : 0,
      rank: index + 1,
    }));
}

// ---------------------------------------------------------------------------
// getYearOverYearComparison
// ---------------------------------------------------------------------------

export async function getYearOverYearComparison(
  client: TypedSupabaseClient,
  workspaceId: string,
  year1: number,
  year2: number,
): Promise<YearComparison[]> {
  const start1 = new Date(year1, 0, 1).toISOString();
  const end1 = new Date(year1, 11, 31, 23, 59, 59, 999).toISOString();
  const start2 = new Date(year2, 0, 1).toISOString();
  const end2 = new Date(year2, 11, 31, 23, 59, 59, 999).toISOString();

  // Fetch both years in parallel
  const [result1, result2] = await Promise.all([
    client
      .from('expenses')
      .select('amount, date')
      .eq('workspace_id', workspaceId)
      .eq('type', 'expense')
      .gte('date', start1)
      .lte('date', end1)
      .is('deleted_at', null),
    client
      .from('expenses')
      .select('amount, date')
      .eq('workspace_id', workspaceId)
      .eq('type', 'expense')
      .gte('date', start2)
      .lte('date', end2)
      .is('deleted_at', null),
  ]);

  if (result1.error) throw result1.error;
  if (result2.error) throw result2.error;

  // Aggregate by month
  const year1Monthly = new Array<number>(12).fill(0);
  const year2Monthly = new Array<number>(12).fill(0);

  for (const exp of (result1.data ?? []) as { amount: number; date: string }[]) {
    const monthIdx = new Date(exp.date).getMonth();
    year1Monthly[monthIdx] += exp.amount;
  }

  for (const exp of (result2.data ?? []) as { amount: number; date: string }[]) {
    const monthIdx = new Date(exp.date).getMonth();
    year2Monthly[monthIdx] += exp.amount;
  }

  return MONTH_NAMES.map((name, idx) => ({
    month: name,
    year1Amount: Math.round(year1Monthly[idx]! * 100) / 100,
    year2Amount: Math.round(year2Monthly[idx]! * 100) / 100,
    difference: Math.round((year2Monthly[idx]! - year1Monthly[idx]!) * 100) / 100,
  }));
}

// ---------------------------------------------------------------------------
// getContactOutstandingReport
// ---------------------------------------------------------------------------

export async function getContactOutstandingReport(
  client: TypedSupabaseClient,
  workspaceId: string,
): Promise<ContactOutstanding[]> {
  // Fetch all non-settled pending payments with contact info
  const { data, error } = await client
    .from('pending_payments')
    .select('contact_id, direction, amount, contacts(id, name, phone)')
    .eq('workspace_id', workspaceId)
    .in('status', ['pending', 'partially_paid', 'overdue']);

  if (error) throw error;

  const payments = (data ?? []) as {
    contact_id: string;
    direction: string;
    amount: number;
    contacts: { id: string; name: string; phone: string | null } | null;
  }[];

  const contactMap = new Map<string, ContactOutstanding>();

  for (const payment of payments) {
    const contactId = payment.contact_id;
    if (!contactId) continue;

    const existing = contactMap.get(contactId);
    const amount = payment.amount;

    if (existing) {
      if (payment.direction === 'give') {
        existing.totalGive += amount;
      } else {
        existing.totalReceive += amount;
      }
      existing.netBalance = existing.totalReceive - existing.totalGive;
    } else {
      const isGive = payment.direction === 'give';
      contactMap.set(contactId, {
        contactId,
        name: payment.contacts?.name ?? 'Unknown',
        phone: payment.contacts?.phone ?? null,
        totalGive: isGive ? amount : 0,
        totalReceive: isGive ? 0 : amount,
        netBalance: isGive ? -amount : amount,
      });
    }
  }

  return Array.from(contactMap.values())
    .map((c) => ({
      ...c,
      totalGive: Math.round(c.totalGive * 100) / 100,
      totalReceive: Math.round(c.totalReceive * 100) / 100,
      netBalance: Math.round(c.netBalance * 100) / 100,
    }))
    .sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance));
}

// ---------------------------------------------------------------------------
// getReportExportData — aggregate all report data for export
// ---------------------------------------------------------------------------

export async function getReportExportData(
  client: TypedSupabaseClient,
  workspaceId: string,
  startDate: string,
  endDate: string,
): Promise<ReportExportData> {
  // Determine month/year from startDate for summary
  const startD = new Date(startDate);
  const month = startD.getMonth() + 1;
  const year = startD.getFullYear();

  const [summary, categories, trend, budgets] = await Promise.all([
    getMonthlySummary(client, workspaceId, month, year),
    getCategoryBreakdown(client, workspaceId, startDate, endDate),
    getSpendTrend(client, workspaceId, startDate, endDate, 'daily'),
    getBudgetVsActual(client, workspaceId, 'monthly'),
  ]);

  // Map the query-layer MonthlySummary to the model-layer MonthlySummary for export
  return {
    summary: {
      month: MONTH_NAMES[month - 1]!,
      year,
      total_income: summary.totalIncome,
      total_expenses: summary.totalExpenses,
      net: summary.netSavings,
      savings_rate: summary.savingsRate,
      avg_daily_spend: summary.avgDailySpend,
      currency: 'INR',
      transaction_count: summary.transactionCount,
      top_category: summary.topCategory?.name ?? null,
      top_category_amount: summary.topCategory?.amount ?? null,
      comparison_previous_month: null,
    },
    categories: categories.map((c) => ({
      category_id: c.categoryId,
      category_name: c.categoryName,
      category_icon: c.categoryIcon,
      category_color: c.categoryColor,
      total_amount: c.totalAmount,
      percentage: c.percentage,
      transaction_count: c.transactionCount,
      subcategories: c.subcategories.map((s) => ({
        subcategory_id: s.subcategoryId,
        subcategory_name: s.subcategoryName,
        total_amount: s.totalAmount,
        percentage: s.percentage,
        transaction_count: s.transactionCount,
      })),
    })),
    trend,
    budgets,
  };
}

// ---------------------------------------------------------------------------
// Period range helper
// ---------------------------------------------------------------------------

function getPeriodRange(
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  now: Date,
): { start: string; end: string } {
  switch (period) {
    case 'weekly': {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const start = new Date(now);
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    case 'monthly': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    case 'quarterly': {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), quarterMonth, 1);
      const end = new Date(now.getFullYear(), quarterMonth + 3, 0, 23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    case 'yearly': {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    }
  }
}
