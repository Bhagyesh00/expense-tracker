// Client
export { createSupabaseClient, type TypedSupabaseClient, type Database } from './client';

// Auth
export { useAuth, AUTH_QUERY_KEY, PROFILE_QUERY_KEY, type AuthState, type AuthErrorResult } from './hooks/use-auth';

// Profile
export {
  useProfile,
  useUpdateProfile,
  useUploadAvatar,
  useUserSettings,
  useUpdateUserSettings,
} from './hooks/use-profile';

// Session
export {
  useDeviceInfo,
  useActiveSessions,
  useRevokeSession,
  useSignOutEverywhere,
} from './hooks/use-session';

// Workspace
export {
  useWorkspaces,
  useCurrentWorkspace,
  useActiveWorkspace,
  useCreateWorkspace,
  useInviteMember,
  useWorkspaceMembers,
  useRemoveMember,
  useUpdateMemberRole,
  useWorkspaceInvitations,
  useCancelInvitation,
} from './hooks/use-workspace';

// Expenses
export {
  useExpenses,
  useExpense,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useExpenseStats,
  useExpensesByDate,
  useSearchExpenses,
  useDuplicateExpense,
  useBulkDeleteExpenses,
  useDuplicateCheck,
  useExpenseExport,
  useVoidExpense,
  useUnvoidExpense,
} from './hooks/use-expenses';

// Categories
export {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useReorderCategories,
} from './hooks/use-categories';

// Pending Payments
export {
  usePendingPayments,
  usePendingPayment,
  useCreatePendingPayment,
  useRecordPayment,
  useSettlePendingPayment,
  useContactLedger,
  usePendingSummary,
  useOverduePayments,
  useUpcomingDueDates,
  useBulkSettle,
  useUpdatePendingPayment,
  useSendReminder,
  useSmartSettlement,
} from './hooks/use-pending-payments';

// Contacts
export {
  useContacts,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  useContactDetail,
  useContactNetBalance,
  useContactPaymentHistory,
  useSearchContacts,
  useContactPaymentSummary,
} from './hooks/use-contacts';

// Budgets & Savings
export {
  useBudgets,
  useBudgetDetail,
  useBudgetAlerts,
  useBudgetHistory,
  useUnbudgetedSpending,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
  useSavingsGoals,
  useSavingsGoalDetail,
  useCompletedGoals,
  useCreateSavingsGoal,
  useUpdateSavingsGoal,
  useAddFundsToGoal,
  useMarkGoalCompleted,
  // Phase 10 — rollover
  useUpdateBudgetRollover,
  useBudgetEffectiveAmount,
  useProcessRollover,
  type BudgetRolloverSettings,
} from './hooks/use-budgets';

// Reports
export {
  useMonthlySummary,
  useCategoryBreakdown,
  useSpendTrend,
  useBudgetVsActual,
  useIncomeVsExpense,
  useDailyHeatmap,
  useTopCategories,
  useYearOverYear,
  useContactOutstandingReport,
  useExportReport,
} from './hooks/use-reports';

// Currency
export {
  useCurrencyRates,
  useConvertCurrency,
  useConvert,
  useSupportedCurrencies,
} from './hooks/use-currency';

// Notifications
export {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  useUnreadCount,
  useDismissNotification,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  type Notification,
  type NotificationType,
  type NotificationPreferences,
} from './hooks/use-notifications';

// Receipt
export {
  useUploadReceipt,
  useOcrScan,
  useReceiptPreview,
} from './hooks/use-receipt';

// AI Suggestions & Insights
export {
  useAiCategorize,
  useSmartDefaults,
  useDuplicateCheck as useAiDuplicateCheck,
  useAIQuery,
  useAIInsights,
  useDismissInsight,
  useAIForecast,
  useAnomalyAlerts,
  useRefreshInsights,
  type AIInsight,
  type AIQueryResponse,
  type AIForecastResponse,
  type ForecastBreakdownItem,
  type CategorizeResult,
} from './hooks/use-ai-suggestions';

// Queries (raw)
export {
  getExpenses,
  getExpenseById,
  getExpensesByCategory,
  getExpenseStats,
  getExpensesByDateGrouped,
  searchExpenses,
  type ExpenseFilters,
  type PaginationParams,
  type ExpenseRow,
  type ExpenseStats,
  type DateGroupedExpenses,
} from './queries/expenses';

export {
  getPendingPayments,
  getPendingPaymentById,
  getContactLedger,
  getPendingSummary,
  getOverduePayments,
  getPaymentsByContact,
  getUpcomingDueDates,
  type PendingPaymentFilters,
  type PendingPaymentRow,
  type PaymentRecordRow,
  type ContactLedgerResult,
  type PendingSummary,
} from './queries/pending-payments';

export {
  getBudgets,
  getBudgetWithSpent,
  getBudgetDetail,
  getBudgetAlerts,
  getBudgetHistory,
  getUnbudgetedSpending,
  getSavingsGoals,
  getSavingsGoalDetail,
  getCompletedGoals,
  type BudgetRow,
  type BudgetDetailRow,
  type BudgetExpenseItem,
  type BudgetHistoryPoint,
  type UnbudgetedCategory,
  type SavingsGoalRow,
  type SavingsGoalDetailRow,
  type FundAddition,
} from './queries/budgets';

export { getCategories } from './queries/categories';

export {
  getContacts,
  getContactWithBalance,
  searchContacts,
  getContactPaymentSummary,
  type ContactRow,
  type ContactWithBalance,
  type ContactPaymentSummary,
  type ContactSearchOptions,
} from './queries/contacts';

export {
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
  type SubcategoryBreakdownItem,
  type SpendTrendPoint,
  type BudgetVsActualItem,
  type IncomeVsExpenseMonth,
  type HeatmapDay,
  type TopCategoryItem,
  type YearComparison,
  type ContactOutstanding,
  type ReportExportData,
} from './queries/reports';

// Expense Templates
export {
  useExpenseTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useApplyTemplate,
  type ExpenseTemplate,
  type CreateTemplateInput,
  type UpdateTemplateInput,
  type TemplateFormData,
} from './hooks/use-templates';

// Mileage
export {
  useMileageLogs,
  useMileageSummary,
  useCreateMileageLog,
  useDeleteMileageLog,
  useMileageRate,
  type MileageLog,
  type MileageSummary,
  type CreateMileageLogInput,
  type MileageRateSettings,
} from './hooks/use-mileage';

// Recurring Payments
export {
  useRecurringTemplates,
  useCreateRecurringTemplate,
  useUpdateRecurringTemplate,
  useDeleteRecurringTemplate,
  useToggleRecurring,
  useGenerateFromTemplate,
  type RecurringPaymentTemplate,
  type CreateRecurringTemplateInput,
  type UpdateRecurringTemplateInput,
  type GeneratedPaymentResult,
  type RecurrenceInterval as RecurringInterval,
} from './hooks/use-recurring-payments';

// Expense Comments
export {
  useExpenseComments,
  useAddComment,
  useDeleteComment,
  type ExpenseComment,
  type CommentAuthor,
} from './hooks/use-comments';

// Import
export {
  useImportExpenses,
  parseCsvToRows,
  type ImportRow,
  type ImportError,
  type ImportResult,
  type ImportProgressCallback,
} from './hooks/use-import';

// Mutations (raw)
export {
  createExpense,
  updateExpense,
  deleteExpense,
  restoreExpense,
  duplicateExpense,
  bulkDeleteExpenses,
  bulkExportExpenses,
  voidExpense,
  unvoidExpense,
  type CreateExpenseInput,
  type UpdateExpenseInput,
  type CreateSplitInput,
  type ExportedExpense,
  type VoidExpenseInput,
} from './mutations/expenses';

export {
  createPendingPayment,
  recordPayment,
  cancelPendingPayment,
  updatePendingPayment,
  bulkSettlePayments,
  sendReminder,
  type CreatePendingPaymentInput,
  type RecordPaymentInput,
  type UpdatePendingPaymentInput,
} from './mutations/pending-payments';

export {
  createBudget,
  updateBudget,
  deleteBudget,
  createSavingsGoal,
  updateSavingsGoal,
  addFundsToGoal,
  markGoalCompleted,
  type CreateBudgetInput,
  type UpdateBudgetInput,
  type CreateSavingsGoalInput,
  type UpdateSavingsGoalInput,
  type AddFundsResult,
} from './mutations/budgets';

// Net Worth (Phase 10)
export {
  useNetWorthEntries,
  useNetWorthAssets,
  useNetWorthLiabilities,
  useNetWorthTotal,
  useNetWorthHistory,
  useCreateNetWorthEntry,
  useUpdateNetWorthEntry,
  useDeleteNetWorthEntry,
  useSnapshotNetWorth,
  type NetWorthEntry,
  type NetWorthSnapshot,
  type NetWorthTotal,
  type NetWorthEntryType,
  type NetWorthCategory,
  type CreateNetWorthEntryInput,
  type UpdateNetWorthEntryInput,
} from './hooks/use-net-worth';

// Subscription Detection (Phase 10)
export {
  useDetectedSubscriptions,
  useDismissSubscription,
  useDetectSubscriptions,
  useLinkSubscriptionToTemplate,
  useUndismissSubscription,
  type DetectedSubscription,
  type DetectedInterval,
  type DetectSubscriptionsResult,
} from './hooks/use-subscriptions';

export {
  createCategory,
  updateCategory,
  deleteCategory,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from './mutations/categories';

// Webhooks (Phase 11)
export {
  useWebhooks,
  useWebhookDeliveries,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useTestWebhook,
  type Webhook,
  type WebhookDelivery,
  type CreateWebhookInput,
  type UpdateWebhookInput,
} from './hooks/use-webhooks';

// Integrations (Phase 11)
export {
  useIntegrations,
  useIntegration,
  useConnectIntegration,
  useUpdateIntegration,
  useDisconnectIntegration,
  useGoogleSheetsSync,
  type Integration,
  type IntegrationSummary,
  type IntegrationProvider,
  type ConnectIntegrationInput,
  type UpdateIntegrationInput,
  type GoogleSheetsSyncResult,
} from './hooks/use-integrations';

// API Keys (Phase 11)
export {
  useApiKeys,
  useGenerateApiKey,
  useRevokeApiKey,
  useDeleteApiKey,
  useUpdateApiKey,
  type ApiKey,
  type GenerateApiKeyInput,
  type GeneratedApiKey,
} from './hooks/use-api-keys';

// Bank Connections (Phase 12)
export {
  useBankConnections,
  useConnectBank,
  useDisconnectBank,
  useBankTransactions,
  useMatchTransaction,
  useUnmatchTransaction,
  useBankStatements,
  useImportStatement,
  useParseBankSms,
  type BankConnection,
  type BankTransaction,
  type BankStatement,
  type BankProvider,
  type BankAccountType,
  type BankConnectionStatus,
  type BankTransactionStatus,
  type ConnectBankInput,
  type ImportStatementResult,
  type ParseSmsResult,
} from './hooks/use-bank-connections';

// Approval Workflow (Phase 13)
export {
  useApprovalPolicies,
  useCreateApprovalPolicy,
  useUpdateApprovalPolicy,
  useDeleteApprovalPolicy,
  usePendingApprovals,
  useMyApprovalRequests,
  useSubmitForApproval,
  useApproveExpense,
  useRejectExpense,
  useAutoCheckExpense,
  useTeamPolicies,
  useCreateTeamPolicy,
  useUpdateTeamPolicy,
  useDeleteTeamPolicy,
  usePolicyViolations,
  useResolveViolation,
  type ApprovalPolicy,
  type ApprovalRequest,
  type ApprovalRequestWithDetails,
  type ApprovalStatus,
  type TeamPolicy,
  type PolicyViolation,
  type CreateApprovalPolicyInput,
  type CreateTeamPolicyInput,
  type SubmitForApprovalResult,
  type AutoCheckResult,
} from './hooks/use-approval';

// Locale & Accessibility (Phase 14)
export {
  useLocale,
  useUpdateLocale,
  useAvailableLocales,
  useAccessibilitySettings,
  useUpdateAccessibility,
  useTranslationOverrides,
  useSetTranslationOverride,
  useDeleteTranslationOverride,
  formatNumber,
  formatDate,
  AVAILABLE_LOCALES,
  DATE_FORMATS,
  type UserLocale,
  type AccessibilitySettings,
  type TranslationOverride,
  type UpdateLocaleInput,
  type UpdateAccessibilityInput,
  type AvailableLocale,
} from './hooks/use-locale';
