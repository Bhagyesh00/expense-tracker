import type { BudgetPeriod } from '../enums';

export interface Budget {
  id: string;
  workspace_id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  amount: number;
  spent: number;
  currency: string;
  period: BudgetPeriod;
  start_date: string;
  end_date: string | null;
  rollover_enabled: boolean;
  rollover_amount: number;
  alert_threshold: number;
  alert_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  target_date: string | null;
  icon: string | null;
  color: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBudgetInput {
  workspace_id: string;
  category_id?: string | null;
  name: string;
  amount: number;
  currency: string;
  period: BudgetPeriod;
  start_date: string;
  end_date?: string | null;
  rollover_enabled?: boolean;
  alert_threshold?: number;
  alert_enabled?: boolean;
}
