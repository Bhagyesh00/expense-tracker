import type { TypedSupabaseClient } from '../client';
import type { PendingPaymentRow } from '../queries/pending-payments';

export interface CreatePendingPaymentInput {
  workspace_id: string;
  user_id: string;
  contact_id: string;
  direction: 'give' | 'receive';
  amount: number;
  currency: string;
  description?: string | null;
  due_date?: string | null;
}

export interface RecordPaymentInput {
  amount: number;
  method?: string | null;
  notes?: string | null;
  paid_at?: string;
  proof_url?: string | null;
}

export interface UpdatePendingPaymentInput {
  description?: string | null;
  notes?: string | null;
  due_date?: string | null;
  total_amount?: number;
  currency?: string;
  direction?: 'give' | 'receive';
}

export async function createPendingPayment(
  client: TypedSupabaseClient,
  input: CreatePendingPaymentInput,
): Promise<PendingPaymentRow> {
  const { data, error } = await client
    .from('pending_payments')
    .insert({
      workspace_id: input.workspace_id,
      user_id: input.user_id,
      contact_id: input.contact_id,
      direction: input.direction,
      total_amount: input.amount,
      paid_amount: 0,
      currency: input.currency,
      description: input.description ?? null,
      status: 'pending',
      due_date: input.due_date ?? null,
    } as any)
    .select('*, contacts(id, name, email, phone)')
    .single();

  if (error) throw error;
  return data as unknown as PendingPaymentRow;
}

export async function recordPayment(
  client: TypedSupabaseClient,
  pendingPaymentId: string,
  input: RecordPaymentInput,
): Promise<PendingPaymentRow> {
  // Insert the payment record (with optional proof_url)
  const { error: recordError } = await client
    .from('payment_records')
    .insert({
      pending_payment_id: pendingPaymentId,
      amount: input.amount,
      method: input.method ?? null,
      notes: input.notes ?? null,
      proof_url: input.proof_url ?? null,
      paid_at: input.paid_at ?? new Date().toISOString(),
    } as any);

  if (recordError) throw recordError;

  // Fetch current pending payment to calculate new paid amount
  const { data: current, error: fetchError } = await client
    .from('pending_payments')
    .select('total_amount, paid_amount, status')
    .eq('id', pendingPaymentId)
    .single();

  if (fetchError) throw fetchError;

  const currentData = current as any;
  const newPaidAmount = (currentData.paid_amount as number) + input.amount;
  const totalAmount = currentData.total_amount as number;
  const isFullyPaid = newPaidAmount >= totalAmount;

  // Determine new status: settled if fully paid, partial otherwise
  // If currently overdue and a partial payment is made, stay overdue
  const currentStatus = currentData.status as string;
  let newStatus: string;
  if (isFullyPaid) {
    newStatus = 'settled';
  } else if (currentStatus === 'overdue') {
    // Partial payment on an overdue item keeps it overdue
    newStatus = 'overdue';
  } else {
    newStatus = 'partial';
  }

  // Update the pending payment
  const { data, error: updateError } = await client
    .from('pending_payments')
    .update({
      paid_amount: newPaidAmount,
      status: newStatus,
      settled_at: isFullyPaid ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pendingPaymentId)
    .select('*, contacts(id, name, email, phone)')
    .single();

  if (updateError) throw updateError;
  return data as unknown as PendingPaymentRow;
}

export async function cancelPendingPayment(
  client: TypedSupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await client
    .from('pending_payments')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Update editable fields on a pending payment.
 */
export async function updatePendingPayment(
  client: TypedSupabaseClient,
  id: string,
  input: UpdatePendingPaymentInput,
): Promise<PendingPaymentRow> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.description !== undefined) updateData.description = input.description;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.due_date !== undefined) updateData.due_date = input.due_date;
  if (input.total_amount !== undefined) updateData.total_amount = input.total_amount;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.direction !== undefined) updateData.direction = input.direction;

  const { data, error } = await client
    .from('pending_payments')
    .update(updateData)
    .eq('id', id)
    .select('*, contacts(id, name, email, phone)')
    .single();

  if (error) throw error;
  return data as unknown as PendingPaymentRow;
}

/**
 * Bulk settle multiple payments at once. Marks each as 'settled' with current timestamp.
 */
export async function bulkSettlePayments(
  client: TypedSupabaseClient,
  paymentIds: string[],
): Promise<{ settled: number }> {
  if (paymentIds.length === 0) return { settled: 0 };

  const now = new Date().toISOString();

  const { data, error } = await client
    .from('pending_payments')
    .update({
      status: 'settled',
      settled_at: now,
      updated_at: now,
    })
    .in('id', paymentIds)
    .in('status', ['pending', 'partial', 'overdue'])
    .select('id');

  if (error) throw error;
  return { settled: (data ?? []).length };
}

/**
 * Create a reminder notification for a specific payment.
 * Calls the send-notification edge function.
 */
export async function sendReminder(
  client: TypedSupabaseClient,
  paymentId: string,
): Promise<{ success: boolean }> {
  // Fetch the payment with contact details
  const { data: payment, error: fetchError } = await client
    .from('pending_payments')
    .select('*, contacts(id, name)')
    .eq('id', paymentId)
    .single();

  if (fetchError) throw fetchError;

  const typedPayment = payment as any;
  const contactName = typedPayment.contacts?.name ?? 'a contact';
  const remaining = typedPayment.total_amount - (typedPayment.paid_amount ?? 0);
  const direction = typedPayment.direction === 'give' ? 'to' : 'from';

  // Insert a reminder notification directly into the notifications table
  const { error: notifyError } = await client
    .from('notifications')
    .insert({
      user_id: typedPayment.user_id,
      workspace_id: typedPayment.workspace_id,
      type: 'payment_reminder',
      title: 'Payment Reminder',
      body: `Reminder: ${typedPayment.currency} ${remaining} ${direction} ${contactName}${typedPayment.description ? ` for "${typedPayment.description}"` : ''}.`,
      data: {
        paymentId: typedPayment.id,
        contactId: typedPayment.contact_id,
        direction: typedPayment.direction,
        amount: remaining,
        currency: typedPayment.currency,
        manual: true,
      },
      is_read: false,
    });

  if (notifyError) throw notifyError;
  return { success: true };
}
