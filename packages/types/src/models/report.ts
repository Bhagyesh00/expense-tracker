// ---------------------------------------------------------------------------
// Monthly Summary
// ---------------------------------------------------------------------------

export interface MonthlySummary {
  month: string;
  year: number;
  total_income: number;
  total_expenses: number;
  net: number;
  savings_rate: number;
  avg_daily_spend: number;
  currency: string;
  transaction_count: number;
  top_category: string | null;
  top_category_amount: number | null;
  comparison_previous_month: number | null;
}

// ---------------------------------------------------------------------------
// Category Breakdown
// ---------------------------------------------------------------------------

export interface SubcategoryBreakdown {
  subcategory_id: string;
  subcategory_name: string;
  total_amount: number;
  percentage: number;
  transaction_count: number;
}

export interface CategoryBreakdown {
  category_id: string;
  category_name: string;
  category_icon: string | null;
  category_color: string | null;
  total_amount: number;
  percentage: number;
  transaction_count: number;
  subcategories: SubcategoryBreakdown[];
}

// ---------------------------------------------------------------------------
// Spend Trend
// ---------------------------------------------------------------------------

export interface SpendTrend {
  date: string;
  amount: number;
  cumulative_amount: number;
  category_id: string | null;
  category_name: string | null;
}

export interface SpendTrendPoint {
  date: string;
  expenses: number;
  income: number;
}

// ---------------------------------------------------------------------------
// Budget vs Actual
// ---------------------------------------------------------------------------

export interface BudgetVsActual {
  budget_id: string;
  budget_name: string;
  category_id: string | null;
  category_name: string | null;
  budgeted_amount: number;
  actual_amount: number;
  remaining: number;
  percentage_used: number;
  is_over_budget: boolean;
}

export interface BudgetVsActualItem {
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
  budgetAmount: number;
  actualAmount: number;
  percentage: number;
  isOverBudget: boolean;
}

// ---------------------------------------------------------------------------
// Income vs Expense (P&L)
// ---------------------------------------------------------------------------

export interface IncomeVsExpenseMonth {
  month: string;
  income: number;
  expense: number;
  net: number;
}

// ---------------------------------------------------------------------------
// Daily Heatmap
// ---------------------------------------------------------------------------

export interface HeatmapDay {
  date: string;
  amount: number;
  count: number;
  intensity: 'none' | 'low' | 'medium' | 'high';
}

// ---------------------------------------------------------------------------
// Top Categories
// ---------------------------------------------------------------------------

export interface TopCategoryItem {
  categoryId: string;
  name: string;
  icon: string | null;
  color: string | null;
  amount: number;
  percentage: number;
  rank: number;
}

// ---------------------------------------------------------------------------
// Year-over-Year Comparison
// ---------------------------------------------------------------------------

export interface YearComparison {
  month: string;
  year1Amount: number;
  year2Amount: number;
  difference: number;
}

// ---------------------------------------------------------------------------
// Contact Outstanding
// ---------------------------------------------------------------------------

export interface ContactOutstanding {
  contactId: string;
  name: string;
  phone: string | null;
  totalGive: number;
  totalReceive: number;
  netBalance: number;
}

// ---------------------------------------------------------------------------
// Forecast
// ---------------------------------------------------------------------------

export interface ForecastData {
  month: string;
  year: number;
  predicted_income: number;
  predicted_expenses: number;
  predicted_net: number;
  confidence: number;
  based_on_months: number;
}

// ---------------------------------------------------------------------------
// Report Export
// ---------------------------------------------------------------------------

export interface ReportExportData {
  summary: MonthlySummary;
  categories: CategoryBreakdown[];
  trend: SpendTrendPoint[];
  budgets: BudgetVsActualItem[];
}
