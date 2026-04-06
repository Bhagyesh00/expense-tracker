import type { TypedSupabaseClient } from '../client';

export interface PendingPaymentFilters {
  direction?: 'give' | 'receive';
  status?: 'pending' | 'partial' | 'settled' | 'overdue' | 'cancelled';
  contactId?: string;
  dateRange?: { from: string; to: string };
  overdue?: boolean;
}

export interface PendingPaymentRow {
  id: string;
  workspace_id: string;
  user_id: string;
  contact_id: string;
  direction: string;
  amount: number;
  paid_amount: number;
  currency: string;
  description: string | null;
  status: string;
  due_date: string | null;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
  contacts?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  payment_records?: PaymentRecordRow[];
}

export interface PaymentRecordRow {
  id: string;
  pending_payment_id: string;
  amount: number;
  method: string | null;
  notes: string | null;
  paid_at: string;
  created_at: string;
}

export interface ContactLedgerResult {
  contact: {
    id: string;
    name: string;
    email: string | null;
  };
  totalGive: number;
  totalReceive: number;
  netBalance: number;
  payments: PendingPaymentRow[];
}

export interface PendingSummary {
  totalGive: number;
  totalReceive: number;
  netBalance: number;
  overdueCount: number;
  overdueAmount: number;
}

export async function getPendingPayments(
  client: TypedSupabaseClient,
  workspaceId: string,
  filters?: PendingPaymentFilters,
): Promise<PendingPaymentRow[]> {
  let query = client
    .from('pending_payments')
    .select('*, contacts(id, name, email, phone)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (filters?.direction) {
    query = query.eq('direction', filters.direction);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.contactId) {
    query = query.eq('contact_id', filters.contactId);
  }

  if (filters?.dateRange) {
    query = query
      .gte('created_at', filters.dateRange.from)
      .lte('created_at', filters.dateRange.to);
  }

  if (filters?.overdue) {
    query = query.eq('status', 'overdue');
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as PendingPaymentRow[];
}

export async function getPendingPaymentById(
  client: TypedSupabaseClient,
  id: string,
): Promise<PendingPaymentRow> {
  const { data, error } = await client
    .from('pending_payments')
    .select(
      '*, contacts(id, name, email, phone), payment_records(*)',
    )
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as unknown as PendingPaymentRow;
}

export async function getContactLedger(
  client: TypedSupabaseClient,
  workspaceId: string,
  contactId: string,
): Promise<ContactLedgerResult> {
  // Fetch contact info
  const { data: contact, error: contactError } = await client
    .from('contacts')
    .select('id, name, email')
    .eq('id', contactId)
    .single();

  if (contactError) throw contactError;

  // Fetch all payments with this contact
  const { data: payments, error: paymentsError } = await client
    .from('pending_payments')
    .select('*, contacts(id, name, email, phone)')
    .eq('workspace_id', workspaceId)
    .eq('contact_id', contactId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });

  if (paymentsError) throw paymentsError;

  const typedPayments = (payments ?? []) as unknown as PendingPaymentRow[];

  const totalGive = typedPayments
    .filter((p) => p.direction === 'give')
    .reduce((sum, p) => sum + p.amount - p.paid_amount, 0);

  const totalReceive = typedPayments
    .filter((p) => p.direction === 'receive')
    .reduce((sum, p) => sum + p.amount - p.paid_amount, 0);

  return {
    contact: contact as { id: string; name: string; email: string | null },
    totalGive,
    totalReceive,
    netBalance: totalReceive - totalGive, // positive = they owe you
    payments: typedPayments,
  };
}

/**
 * Aggregate summary of all pending payments for a workspace.
 */
export async function getPendingSummary(
  client: TypedSupabaseClient,
  workspaceId: string,
): Promise<PendingSummary> {
  const { data: payments, error } = await client
    .from('pending_payments')
    .select('direction, total_amount, paid_amount, status')
    .eq('workspace_id', workspaceId)
    .neq('status', 'cancelled')
    .neq('status', 'settled');

  if (error) throw error;

  const rows = (payments ?? []) as Array<{
    direction: string;
    total_amount: number;
    paid_amount: number;
    status: string;
  }>;

  let totalGive = 0;
  let totalReceive = 0;
  let overdueCount = 0;
  let overdueAmount = 0;

  for (const row of rows) {
    const remaining = row.total_amount - (row.paid_amount ?? 0);
    if (row.direction === 'give') {
      totalGive += remaining;
    } else {
      totalReceive += remaining;
    }
    if (row.status === 'overdue') {
      overdueCount++;
      overdueAmount += remaining;
    }
  }

  return {
    totalGive: Math.round(totalGive * 100) / 100,
    totalReceive: Math.round(totalReceive * 100) / 100,
    netBalance: Math.round((totalReceive - totalGive) * 100) / 100,
    overdueCount,
    overdueAmount: Math.round(overdueAmount * 100) / 100,
  };
}

/**
 * Get all overdue payments for a workspace.
 */
export async function getOverduePayments(
  client: TypedSupabaseClient,
  workspaceId: string,
): Promise<PendingPaymentRow[]> {
  const { data, error } = await client
    .from('pending_payments')
    .select('*, contacts(id, name, email, phone)')
    .eq('workspace_id', workspaceId)
    .eq('status', 'overdue')
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data as unknown as PendingPaymentRow[];
}

/**
 * Get all pending payments for a specific contact in a workspace.
 */
export async function getPaymentsByContact(
  client: TypedSupabaseClient,
  workspaceId: string,
  contactId: string,
): Promise<PendingPaymentRow[]> {
  const { data, error } = await client
    .from('pending_payments')
    .select('*, contacts(id, name, email, phone), payment_records(*)')
    .eq('workspace_id', workspaceId)
    .eq('contact_id', contactId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as unknown as PendingPaymentRow[];
}

/**
 * Get payments with due dates within the next N days.
 */
export async function getUpcomingDueDates(
  client: TypedSupabaseClient,
  workspaceId: string,
  days: number = 7,
): Promise<PendingPaymentRow[]> {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);

  const todayStr = today.toISOString().split('T')[0];
  const futureStr = futureDate.toISOString().split('T')[0];

  const { data, error } = await client
    .from('pending_payments')
    .select('*, contacts(id, name, email, phone)')
    .eq('workspace_id', workspaceId)
    .in('status', ['pending', 'partial'])
    .not('due_date', 'is', null)
    .gte('due_date', todayStr)
    .lte('due_date', futureStr)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data as unknown as PendingPaymentRow[];
}
