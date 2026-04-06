export enum WorkspaceRole {
  Owner = 'owner',
  Admin = 'admin',
  Member = 'member',
  Viewer = 'viewer',
}

export enum ExpenseType {
  Expense = 'expense',
  Income = 'income',
}

export enum PaymentDirection {
  Give = 'give',
  Receive = 'receive',
}

export enum PaymentStatus {
  Pending = 'pending',
  Partial = 'partial',
  Settled = 'settled',
  Overdue = 'overdue',
  Cancelled = 'cancelled',
}

export enum RecurrenceInterval {
  Daily = 'daily',
  Weekly = 'weekly',
  Biweekly = 'biweekly',
  Monthly = 'monthly',
  Quarterly = 'quarterly',
  Yearly = 'yearly',
}

export enum NotificationType {
  PaymentReminder = 'payment_reminder',
  BudgetAlert = 'budget_alert',
  OverduePayment = 'overdue_payment',
  WorkspaceInvite = 'workspace_invite',
  System = 'system',
}

export enum BudgetPeriod {
  Weekly = 'weekly',
  Monthly = 'monthly',
  Quarterly = 'quarterly',
  Yearly = 'yearly',
}

export enum SplitMethod {
  Equal = 'equal',
  Percentage = 'percentage',
  Exact = 'exact',
}

export enum Theme {
  Light = 'light',
  Dark = 'dark',
  System = 'system',
}
