/**
 * ExpenseFlow — Recurring Payment Template Hooks
 *
 * Provides full lifecycle management for recurring payment templates:
 * CRUD, activate/pause toggle, and on-demand generation of an actual
 * pending_payment record from a template with automatic next_due_date
 * advancement.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client';
import type { PendingPaymentRow } from '../queries/pending-payments';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecurrenceInterval =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export type PaymentDirection = 'give' | 'receive';

export interface RecurringPaymentTemplate {
  id: string;
  workspace_id: string;
  user_id: string;
  contact_id: string | null;
  contact_name: string;
  direction: PaymentDirection;
  amount: number;
  currency: string;
  description: string | null;
  recurrence_interval: RecurrenceInterval;
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  is_active: boolean;
  auto_generate: boolean;
  auto_generate_days_before: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  contacts?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
}

export interface CreateRecurringTemplateInput {
  workspace_id: string;
  contact_id?: string | null;
  contact_name: string;
  direction: PaymentDirection;
  amount: number;
  currency?: string;
  description?: string | null;
  recurrence_interval: RecurrenceInterval;
  start_date?: string;
  end_date?: string | null;
  next_due_date: string;
  auto_generate?: boolean;
  auto_generate_days_before?: number;
  notes?: string | null;
}

export interface UpdateRecurringTemplateInput {
  contact_id?: string | null;
  contact_name?: string;
  direction?: PaymentDirection;
  amount?: number;
  currency?: string;
  description?: string | null;
  recurrence_interval?: RecurrenceInterval;
  end_date?: string | null;
  next_due_date?: string;
  auto_generate?: boolean;
  auto_generate_days_before?: number;
  notes?: string | null;
}

export interface GeneratedPaymentResult {
  pending_payment: PendingPaymentRow;
  new_next_due_date: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const RECURRING_KEY = ['recurring-payment-templates'] as const;
const PENDING_KEY = ['pending-payments'] as const;

// ---------------------------------------------------------------------------
// Date advancement helper
// ---------------------------------------------------------------------------

function advanceDate(dateStr: string, interval: RecurrenceInterval): string {
  const d = new Date(dateStr);

  switch (interval) {
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'biweekly':
      d.setDate(d.getDate() + 14);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }

  return d.toISOString().split('T')[0]!;
}

// ---------------------------------------------------------------------------
// useRecurringTemplates — list all templates for a workspace
// ---------------------------------------------------------------------------

interface UseRecurringTemplatesOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
}

export function useRecurringTemplates({
  client,
  workspaceId,
}: UseRecurringTemplatesOptions) {
  return useQuery<RecurringPaymentTemplate[]>({
    queryKey: [...RECURRING_KEY, workspaceId],
    queryFn: async (): Promise<RecurringPaymentTemplate[]> => {
      const { data, error } = await client
        .from('recurring_payment_templates')
        .select('*, contacts(id, name, email, phone)')
        .eq('workspace_id', workspaceId!)
        .order('next_due_date', { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as RecurringPaymentTemplate[];
    },
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useCreateRecurringTemplate
// ---------------------------------------------------------------------------

export function useCreateRecurringTemplate({
  client,
}: {
  client: TypedSupabaseClient;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: CreateRecurringTemplateInput,
    ): Promise<RecurringPaymentTemplate> => {
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0]!;

      const { data, error } = await client
        .from('recurring_payment_templates')
        .insert({
          workspace_id: input.workspace_id,
          user_id: user.id,
          contact_id: input.contact_id ?? null,
          contact_name: input.contact_name,
          direction: input.direction,
          amount: input.amount,
          currency: input.currency ?? 'INR',
          description: input.description ?? null,
          recurrence_interval: input.recurrence_interval,
          start_date: input.start_date ?? today,
          end_date: input.end_date ?? null,
          next_due_date: input.next_due_date,
          is_active: true,
          auto_generate: input.auto_generate ?? false,
          auto_generate_days_before: input.auto_generate_days_before ?? 3,
          notes: input.notes ?? null,
        })
        .select('*, contacts(id, name, email, phone)')
        .single();

      if (error) throw error;
      return data as unknown as RecurringPaymentTemplate;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: [...RECURRING_KEY, input.workspace_id],
      });
    },
  });
}

// ---------------------------------------------------------------------------
// useUpdateRecurringTemplate
// ---------------------------------------------------------------------------

interface UpdateRecurringArgs {
  id: string;
  workspaceId: string;
  input: UpdateRecurringTemplateInput;
}

export function useUpdateRecurringTemplate({
  client,
}: {
  client: TypedSupabaseClient;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: UpdateRecurringArgs): Promise<RecurringPaymentTemplate> => {
      const { data, error } = await client
        .from('recurring_payment_templates')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, contacts(id, name, email, phone)')
        .single();

      if (error) throw error;
      return data as unknown as RecurringPaymentTemplate;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: [...RECURRING_KEY, workspaceId],
      });
    },
  });
}

// ---------------------------------------------------------------------------
// useDeleteRecurringTemplate
// ---------------------------------------------------------------------------

interface DeleteRecurringArgs {
  id: string;
  workspaceId: string;
}

export function useDeleteRecurringTemplate({
  client,
}: {
  client: TypedSupabaseClient;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: DeleteRecurringArgs): Promise<void> => {
      const { error } = await client
        .from('recurring_payment_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: [...RECURRING_KEY, workspaceId],
      });
    },
  });
}

// ---------------------------------------------------------------------------
// useToggleRecurring — activate or pause a template
// ---------------------------------------------------------------------------

interface ToggleRecurringArgs {
  id: string;
  workspaceId: string;
  /** Explicit state to set. When omitted, the current state is toggled. */
  isActive?: boolean;
}

export function useToggleRecurring({
  client,
}: {
  client: TypedSupabaseClient;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      isActive,
    }: ToggleRecurringArgs): Promise<RecurringPaymentTemplate> => {
      // If isActive is not given, fetch current state and flip it
      let targetState = isActive;

      if (targetState === undefined) {
        const { data: current, error: fetchError } = await client
          .from('recurring_payment_templates')
          .select('is_active')
          .eq('id', id)
          .single();

        if (fetchError || !current) throw fetchError ?? new Error('Template not found');
        targetState = !(current as { is_active: boolean }).is_active;
      }

      const { data, error } = await client
        .from('recurring_payment_templates')
        .update({
          is_active: targetState,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, contacts(id, name, email, phone)')
        .single();

      if (error) throw error;
      return data as unknown as RecurringPaymentTemplate;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: [...RECURRING_KEY, workspaceId],
      });
    },
  });
}

// ---------------------------------------------------------------------------
// useGenerateFromTemplate — create a pending_payment and advance next_due_date
// ---------------------------------------------------------------------------

interface GenerateFromTemplateArgs {
  templateId: string;
  workspaceId: string;
  /** Override due date for the generated payment (defaults to template next_due_date) */
  dueDate?: string;
}

export function useGenerateFromTemplate({
  client,
}: {
  client: TypedSupabaseClient;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      dueDate,
    }: GenerateFromTemplateArgs): Promise<GeneratedPaymentResult> => {
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch the template
      const { data: templateData, error: fetchError } = await client
        .from('recurring_payment_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (fetchError || !templateData) {
        throw fetchError ?? new Error('Recurring template not found');
      }

      const template = templateData as unknown as RecurringPaymentTemplate;

      if (!template.is_active) {
        throw new Error('Cannot generate from an inactive recurring template');
      }

      const paymentDueDate = dueDate ?? template.next_due_date;

      // Create the pending_payment
      const { data: paymentData, error: paymentError } = await client
        .from('pending_payments')
        .insert({
          workspace_id: template.workspace_id,
          user_id: user.id,
          contact_id: template.contact_id!,
          direction: template.direction,
          total_amount: template.amount,
          paid_amount: 0,
          currency: template.currency,
          description: template.description ?? `Recurring: ${template.contact_name}`,
          status: 'pending',
          due_date: paymentDueDate,
        } as any)
        .select('*, contacts(id, name, email, phone)')
        .single();

      if (paymentError) throw paymentError;

      // Advance next_due_date
      const newNextDueDate = advanceDate(
        template.next_due_date,
        template.recurrence_interval,
      );

      // Check whether the template has expired
      const isExpired =
        template.end_date !== null &&
        new Date(newNextDueDate) > new Date(template.end_date);

      await client
        .from('recurring_payment_templates')
        .update({
          next_due_date: newNextDueDate,
          is_active: !isExpired,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId);

      return {
        pending_payment: paymentData as unknown as PendingPaymentRow,
        new_next_due_date: newNextDueDate,
      };
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...RECURRING_KEY, workspaceId] });
      queryClient.invalidateQueries({ queryKey: PENDING_KEY });
    },
  });
}
