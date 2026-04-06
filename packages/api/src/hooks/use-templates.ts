/**
 * ExpenseFlow — Expense Template Hooks
 *
 * Provides CRUD operations for expense templates and a one-step "apply"
 * action that increments use_count and returns the template data ready
 * for pre-filling a new expense form.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExpenseTemplate {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  description: string | null;
  amount: number | null;
  is_variable_amount: boolean;
  currency: string;
  category_id: string | null;
  subcategory_id: string | null;
  type: 'expense' | 'income';
  tags: string[];
  notes: string | null;
  icon: string | null;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  categories?: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
}

export interface CreateTemplateInput {
  workspace_id: string;
  name: string;
  description?: string | null;
  amount?: number | null;
  is_variable_amount?: boolean;
  currency?: string;
  category_id?: string | null;
  subcategory_id?: string | null;
  type?: 'expense' | 'income';
  tags?: string[];
  notes?: string | null;
  icon?: string | null;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string | null;
  amount?: number | null;
  is_variable_amount?: boolean;
  currency?: string;
  category_id?: string | null;
  subcategory_id?: string | null;
  type?: 'expense' | 'income';
  tags?: string[];
  notes?: string | null;
  icon?: string | null;
}

/**
 * The data returned by useApplyTemplate — ready for form pre-fill.
 * amount is null when is_variable_amount is TRUE.
 */
export interface TemplateFormData {
  amount: number | null;
  is_variable_amount: boolean;
  currency: string;
  category_id: string | null;
  subcategory_id: string | null;
  type: 'expense' | 'income';
  tags: string[];
  notes: string | null;
  description: string | null;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const TEMPLATES_KEY = ['expense-templates'] as const;

// ---------------------------------------------------------------------------
// Raw query helpers (no React state, usable outside hooks)
// ---------------------------------------------------------------------------

async function fetchTemplates(
  client: TypedSupabaseClient,
  workspaceId: string,
): Promise<ExpenseTemplate[]> {
  const { data, error } = await client
    .from('expense_templates')
    .select('*, categories(id, name, icon, color)')
    .eq('workspace_id', workspaceId)
    .order('use_count', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as ExpenseTemplate[];
}

// ---------------------------------------------------------------------------
// useExpenseTemplates — list all templates, sorted by popularity
// ---------------------------------------------------------------------------

interface UseExpenseTemplatesOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
}

export function useExpenseTemplates({
  client,
  workspaceId,
}: UseExpenseTemplatesOptions) {
  return useQuery<ExpenseTemplate[]>({
    queryKey: [...TEMPLATES_KEY, workspaceId],
    queryFn: () => fetchTemplates(client, workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useCreateTemplate
// ---------------------------------------------------------------------------

export function useCreateTemplate({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTemplateInput): Promise<ExpenseTemplate> => {
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await client
        .from('expense_templates')
        .insert({
          workspace_id: input.workspace_id,
          user_id: user.id,
          name: input.name,
          description: input.description ?? null,
          amount: input.amount ?? null,
          is_variable_amount: input.is_variable_amount ?? (input.amount == null),
          currency: input.currency ?? 'INR',
          category_id: input.category_id ?? null,
          subcategory_id: input.subcategory_id ?? null,
          type: input.type ?? 'expense',
          tags: input.tags ?? [],
          notes: input.notes ?? null,
          icon: input.icon ?? null,
          use_count: 0,
        })
        .select('*, categories(id, name, icon, color)')
        .single();

      if (error) throw error;
      return data as unknown as ExpenseTemplate;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: [...TEMPLATES_KEY, input.workspace_id],
      });
    },
  });
}

// ---------------------------------------------------------------------------
// useUpdateTemplate
// ---------------------------------------------------------------------------

interface UpdateTemplateArgs {
  id: string;
  workspaceId: string;
  input: UpdateTemplateInput;
}

export function useUpdateTemplate({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: UpdateTemplateArgs): Promise<ExpenseTemplate> => {
      const updatePayload: Record<string, unknown> = {
        ...input,
        updated_at: new Date().toISOString(),
      };

      // If amount is explicitly set to a value, ensure is_variable_amount is consistent
      if (input.amount !== undefined && input.is_variable_amount === undefined) {
        updatePayload.is_variable_amount = input.amount === null;
      }

      const { data, error } = await client
        .from('expense_templates')
        .update(updatePayload)
        .eq('id', id)
        .select('*, categories(id, name, icon, color)')
        .single();

      if (error) throw error;
      return data as unknown as ExpenseTemplate;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: [...TEMPLATES_KEY, workspaceId],
      });
    },
  });
}

// ---------------------------------------------------------------------------
// useDeleteTemplate
// ---------------------------------------------------------------------------

interface DeleteTemplateArgs {
  id: string;
  workspaceId: string;
}

export function useDeleteTemplate({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: DeleteTemplateArgs): Promise<void> => {
      const { error } = await client
        .from('expense_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: [...TEMPLATES_KEY, workspaceId],
      });
    },
  });
}

// ---------------------------------------------------------------------------
// useApplyTemplate — increments use_count, returns form-ready data
// ---------------------------------------------------------------------------

interface ApplyTemplateArgs {
  templateId: string;
  workspaceId: string;
}

export function useApplyTemplate({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
    }: ApplyTemplateArgs): Promise<TemplateFormData> => {
      // Fetch the template
      const { data: template, error: fetchError } = await client
        .from('expense_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (fetchError || !template) {
        throw fetchError ?? new Error('Template not found');
      }

      const t = template as unknown as ExpenseTemplate;

      // Increment use_count and update last_used_at
      const { error: updateError } = await client
        .from('expense_templates')
        .update({
          use_count: t.use_count + 1,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId);

      if (updateError) {
        // Non-fatal: log but do not fail the apply
        console.warn('Failed to increment template use_count:', updateError);
      }

      // Return data formatted for form pre-fill
      return {
        amount: t.is_variable_amount ? null : t.amount,
        is_variable_amount: t.is_variable_amount,
        currency: t.currency,
        category_id: t.category_id,
        subcategory_id: t.subcategory_id,
        type: t.type,
        tags: t.tags ?? [],
        notes: t.notes,
        description: t.description,
      };
    },
    onSuccess: (_data, { workspaceId }) => {
      // Invalidate so use_count updates are reflected in the template list
      queryClient.invalidateQueries({
        queryKey: [...TEMPLATES_KEY, workspaceId],
      });
    },
  });
}
