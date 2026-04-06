// ── Providers ──────────────────────────────────────────────────
export {
  AIProvider,
  GeminiProvider,
  GroqProvider,
  getAIProvider,
  resetAIProvider,
} from './providers';
export type { AIProviderConfig, GenerateTextOptions } from './providers';

// ── Categorizer ────────────────────────────────────────────────
export { categorize } from './categorizer';
export { applyRules } from './categorizer/rules-engine';
export { categorizeExpense as cloudCategorizeExpense } from './categorizer/cloud';
export type {
  CategorizationOutput,
  CategorizationSource,
  CategorizationRule,
  MatchType,
  CategorizationResult,
} from './categorizer';

// ── Insights ───────────────────────────────────────────────────
export { generateSQLQuery } from './insights/query-generator';
export type { GeneratedQuery } from './insights/query-generator';
export { formatInsightResponse, formatCurrency } from './insights/response-formatter';
export type { FormattedInsight } from './insights/response-formatter';
export {
  SUGGESTED_QUERIES,
  getSuggestedQueries,
} from './insights/suggested-queries';
export type { SuggestedQuery } from './insights/suggested-queries';

// ── Anomaly Detection ──────────────────────────────────────────
export { detectAnomalies } from './anomaly/detector';
export type {
  Anomaly,
  AnomalyType,
  AnomalySeverity,
  ExpenseRecord,
  HistoricalAverage,
} from './anomaly/detector';
export { generateAlertMessage } from './anomaly/alert-generator';
export type { AlertMessage } from './anomaly/alert-generator';

// ── Forecast ───────────────────────────────────────────────────
export { forecastMonthEnd } from './forecast/time-series';
export type {
  DailyExpense,
  RecurringExpense,
  PendingPaymentEntry,
  CategoryForecast,
  ForecastResult,
} from './forecast/time-series';
export { generateForecastNarrative } from './forecast/narrative';
export type { BudgetInfo } from './forecast/narrative';

// ── Receipt Parsing ────────────────────────────────────────────
export { parseReceipt } from './receipt/parser';
export type { ParsedReceipt, ReceiptItem } from './receipt/parser';

// ── Suggestions ────────────────────────────────────────────────
export { getSmartDefaults } from './suggestions/smart-defaults';
export type { SmartDefaults } from './suggestions/smart-defaults';
export { detectDuplicate } from './suggestions/duplicate-detector';
export type { DuplicateResult, ExpenseInput } from './suggestions/duplicate-detector';
export { suggestBudgets } from './suggestions/budget-advisor';
export type {
  BudgetSuggestion,
  SpendingHistory,
} from './suggestions/budget-advisor';
