import { useQuery, useMutation } from '@tanstack/react-query';
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
import {
  getMonthlySummary,
  getCategoryBreakdown,
  getSpendTrend,
  getBudgetVsActual,
  getIncomeVsExpense,
  getDailyHeatmap,
  getTopCategories,
  getYearOverYearComparison,
  getContactOutstandingReport,
  getReportExportData,
  type MonthlySummary,
  type CategoryBreakdownItem,
} from '../queries/reports';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const REPORTS_KEY = ['reports'] as const;

// ---------------------------------------------------------------------------
// Option interfaces
// ---------------------------------------------------------------------------

interface UseReportsBaseOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
}

interface UseMonthlySummaryOptions extends UseReportsBaseOptions {
  month: number;
  year: number;
}

interface UseCategoryBreakdownOptions extends UseReportsBaseOptions {
  dateRange: { startDate: string; endDate: string };
}

interface UseSpendTrendOptions extends UseReportsBaseOptions {
  dateRange: { startDate: string; endDate: string };
  granularity?: 'daily' | 'weekly' | 'monthly';
}

interface UseBudgetVsActualOptions extends UseReportsBaseOptions {
  period?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

interface UseIncomeVsExpenseOptions extends UseReportsBaseOptions {
  months?: number;
}

interface UseDailyHeatmapOptions extends UseReportsBaseOptions {
  year: number;
  month: number;
}

interface UseTopCategoriesOptions extends UseReportsBaseOptions {
  dateRange: { startDate: string; endDate: string };
  limit?: number;
}

interface UseYearOverYearOptions extends UseReportsBaseOptions {
  year1: number;
  year2: number;
}

interface UseExportReportOptions extends UseReportsBaseOptions {
  dateRange: { startDate: string; endDate: string };
  format: 'csv' | 'pdf';
}

// ---------------------------------------------------------------------------
// useMonthlySummary
// ---------------------------------------------------------------------------

export function useMonthlySummary({
  client,
  workspaceId,
  month,
  year,
}: UseMonthlySummaryOptions) {
  return useQuery<MonthlySummary>({
    queryKey: [...REPORTS_KEY, 'monthly-summary', workspaceId, month, year],
    queryFn: () => getMonthlySummary(client, workspaceId!, month, year),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useCategoryBreakdown
// ---------------------------------------------------------------------------

export function useCategoryBreakdown({
  client,
  workspaceId,
  dateRange,
}: UseCategoryBreakdownOptions) {
  return useQuery<CategoryBreakdownItem[]>({
    queryKey: [
      ...REPORTS_KEY,
      'category-breakdown',
      workspaceId,
      dateRange.startDate,
      dateRange.endDate,
    ],
    queryFn: () =>
      getCategoryBreakdown(
        client,
        workspaceId!,
        dateRange.startDate,
        dateRange.endDate,
      ),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useSpendTrend
// ---------------------------------------------------------------------------

export function useSpendTrend({
  client,
  workspaceId,
  dateRange,
  granularity = 'monthly',
}: UseSpendTrendOptions) {
  return useQuery<SpendTrendPoint[]>({
    queryKey: [
      ...REPORTS_KEY,
      'spend-trend',
      workspaceId,
      dateRange.startDate,
      dateRange.endDate,
      granularity,
    ],
    queryFn: () =>
      getSpendTrend(
        client,
        workspaceId!,
        dateRange.startDate,
        dateRange.endDate,
        granularity,
      ),
    enabled: !!workspaceId,
    staleTime: 10 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useBudgetVsActual
// ---------------------------------------------------------------------------

export function useBudgetVsActual({
  client,
  workspaceId,
  period = 'monthly',
}: UseBudgetVsActualOptions) {
  return useQuery<BudgetVsActualItem[]>({
    queryKey: [...REPORTS_KEY, 'budget-vs-actual', workspaceId, period],
    queryFn: () => getBudgetVsActual(client, workspaceId!, period),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useIncomeVsExpense
// ---------------------------------------------------------------------------

export function useIncomeVsExpense({
  client,
  workspaceId,
  months = 6,
}: UseIncomeVsExpenseOptions) {
  return useQuery<IncomeVsExpenseMonth[]>({
    queryKey: [...REPORTS_KEY, 'income-vs-expense', workspaceId, months],
    queryFn: () => getIncomeVsExpense(client, workspaceId!, months),
    enabled: !!workspaceId,
    staleTime: 10 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useDailyHeatmap
// ---------------------------------------------------------------------------

export function useDailyHeatmap({
  client,
  workspaceId,
  year,
  month,
}: UseDailyHeatmapOptions) {
  return useQuery<HeatmapDay[]>({
    queryKey: [...REPORTS_KEY, 'daily-heatmap', workspaceId, year, month],
    queryFn: () => getDailyHeatmap(client, workspaceId!, year, month),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useTopCategories
// ---------------------------------------------------------------------------

export function useTopCategories({
  client,
  workspaceId,
  dateRange,
  limit = 5,
}: UseTopCategoriesOptions) {
  return useQuery<TopCategoryItem[]>({
    queryKey: [
      ...REPORTS_KEY,
      'top-categories',
      workspaceId,
      dateRange.startDate,
      dateRange.endDate,
      limit,
    ],
    queryFn: () =>
      getTopCategories(
        client,
        workspaceId!,
        dateRange.startDate,
        dateRange.endDate,
        limit,
      ),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useYearOverYear
// ---------------------------------------------------------------------------

export function useYearOverYear({
  client,
  workspaceId,
  year1,
  year2,
}: UseYearOverYearOptions) {
  return useQuery<YearComparison[]>({
    queryKey: [...REPORTS_KEY, 'year-over-year', workspaceId, year1, year2],
    queryFn: () => getYearOverYearComparison(client, workspaceId!, year1, year2),
    enabled: !!workspaceId,
    staleTime: 15 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useContactOutstandingReport
// ---------------------------------------------------------------------------

export function useContactOutstandingReport({
  client,
  workspaceId,
}: UseReportsBaseOptions) {
  return useQuery<ContactOutstanding[]>({
    queryKey: [...REPORTS_KEY, 'contact-outstanding', workspaceId],
    queryFn: () => getContactOutstandingReport(client, workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useExportReport — generates export data as CSV or PDF blob
// ---------------------------------------------------------------------------

export function useExportReport({
  client,
  workspaceId,
  dateRange,
  format,
}: UseExportReportOptions) {
  return useMutation<Blob, Error, void>({
    mutationFn: async () => {
      if (!workspaceId) throw new Error('Workspace ID required');

      const reportData = await getReportExportData(
        client,
        workspaceId,
        dateRange.startDate,
        dateRange.endDate,
      );

      if (format === 'csv') {
        return generateReportCsv(reportData);
      }

      // For PDF, return a JSON blob that can be processed client-side
      // with a PDF library (e.g., jsPDF, react-pdf)
      return generateReportPdfData(reportData);
    },
  });
}

// ---------------------------------------------------------------------------
// CSV generation helpers
// ---------------------------------------------------------------------------

function generateReportCsv(data: ReportExportData): Blob {
  const lines: string[] = [];

  // Summary section
  lines.push('=== Monthly Summary ===');
  lines.push('Metric,Value');
  lines.push(`Total Income,${data.summary.total_income}`);
  lines.push(`Total Expenses,${data.summary.total_expenses}`);
  lines.push(`Net Savings,${data.summary.net}`);
  lines.push(`Savings Rate,${data.summary.savings_rate}%`);
  lines.push(`Avg Daily Spend,${data.summary.avg_daily_spend}`);
  lines.push(`Transaction Count,${data.summary.transaction_count}`);
  lines.push('');

  // Category breakdown
  lines.push('=== Category Breakdown ===');
  lines.push('Category,Amount,Percentage,Transactions');
  for (const cat of data.categories) {
    lines.push(
      `${escapeCsvField(cat.category_name)},${cat.total_amount},${cat.percentage}%,${cat.transaction_count}`,
    );
  }
  lines.push('');

  // Spend trend
  lines.push('=== Spend Trend ===');
  lines.push('Date,Expenses,Income');
  for (const point of data.trend) {
    lines.push(`${point.date},${point.expenses},${point.income}`);
  }
  lines.push('');

  // Budget vs Actual
  lines.push('=== Budget vs Actual ===');
  lines.push('Category,Budget,Actual,Percentage,Over Budget');
  for (const b of data.budgets) {
    lines.push(
      `${escapeCsvField(b.categoryName)},${b.budgetAmount},${b.actualAmount},${b.percentage}%,${b.isOverBudget ? 'Yes' : 'No'}`,
    );
  }

  const csvContent = lines.join('\n');
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

function generateReportPdfData(data: ReportExportData): Blob {
  // Serialize as JSON for client-side PDF generation
  const jsonContent = JSON.stringify(data, null, 2);
  return new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
