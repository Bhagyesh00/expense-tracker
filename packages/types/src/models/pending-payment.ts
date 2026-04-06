import type { PaymentDirection, PaymentStatus } from '../enums';

export interface PendingPayment {
  id: string;
  workspace_id: string;
  user_id: string;
  contact_id: string | null;
  counterpart_user_id: string | null;
  direction: PaymentDirection;
  amount: number;
  settled_amount: number;
  currency: string;
  status: PaymentStatus;
  description: string;
  notes: string | null;
  due_date: string | null;
  expense_id: string | null;
  reminder_enabled: boolean;
  reminder_interval_days: number | null;
  last_reminder_sent_at: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentHistoryEntry {
  id: string;
  pending_payment_id: string;
  amount: number;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  paid_at: string;
  recorded_by: string;
  created_at: string;
}

export interface CreatePendingPaymentInput {
  workspace_id: string;
  contact_id?: string | null;
  counterpart_user_id?: string | null;
  direction: PaymentDirection;
  amount: number;
  currency: string;
  description: string;
  notes?: string | null;
  due_date?: string | null;
  expense_id?: string | null;
  reminder_enabled?: boolean;
  reminder_interval_days?: number | null;
}

export interface SettlePaymentInput {
  amount: number;
  payment_method?: string | null;
  reference?: string | null;
  notes?: string | null;
  paid_at?: string;
}
