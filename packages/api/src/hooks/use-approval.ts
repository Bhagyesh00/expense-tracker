import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated';

export interface ApprovalPolicy {
  id: string;
  workspace_id: string;
  name: string;
  conditions: {
    amount_above?: number;
    categories?: string[];
    tags?: string[];
  };
  approvers: string[];
  require_all: boolean;
  auto_approve_below: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRequest {
  id: string;
  expense_id: string;
  policy_id: string;
  status: ApprovalStatus;
  submitted_by: string;
  submitted_at: string;
  decided_by: string | null;
  decided_at: string | null;
  comments: string | null;
}

export interface ApprovalRequestWithDetails extends ApprovalRequest {
  expense?: {
    id: string;
    description: string;
    amount: number;
    currency: string;
    expense_date: string;
    user_id: string;
  };
  policy?: {
    id: string;
    name: string;
  };
}

export interface TeamPolicy {
  id: string;
  workspace_id: string;
  name: string;
  rules: {
    max_amount?: number;
    allowed_categories?: string[];
    receipt_required_above?: number;
    auto_flag_rules?: Array<{
      field: string;
      condition: string;
      value: unknown;
      violation_type: string;
    }>;
  };
  applies_to_roles: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PolicyViolation {
  id: string;
  expense_id: string;
  policy_id: string;
  violation_type: string;
  details: string | null;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface CreateApprovalPolicyInput {
  workspace_id: string;
  name: string;
  conditions: ApprovalPolicy['conditions'];
  approvers: string[];
  require_all?: boolean;
  auto_approve_below?: number;
}

export interface CreateTeamPolicyInput {
  workspace_id: string;
  name: string;
  rules: TeamPolicy['rules'];
  applies_to_roles?: string[];
}

export interface SubmitForApprovalResult {
  status: string;
  request_id?: string;
  policy_name?: string;
  approvers_notified?: number;
  message?: string;
}

export interface AutoCheckResult {
  violations_found: number;
  violations: Array<{
    policy_id: string;
    violation_type: string;
    details: string;
  }>;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const APPROVAL_POLICIES_KEY = ['approval-policies'] as const;
const APPROVAL_REQUESTS_KEY = ['approval-requests'] as const;
const TEAM_POLICIES_KEY = ['team-policies'] as const;
const POLICY_VIOLATIONS_KEY = ['policy-violations'] as const;

// ---------------------------------------------------------------------------
// Approval Policy hooks
// ---------------------------------------------------------------------------

interface UseApprovalPoliciesOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
}

/** List all approval policies for a workspace. */
export function useApprovalPolicies({ client, workspaceId }: UseApprovalPoliciesOptions) {
  return useQuery<ApprovalPolicy[]>({
    queryKey: [...APPROVAL_POLICIES_KEY, workspaceId],
    queryFn: async () => {
      const { data, error } = await client
        .from('approval_policies')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as ApprovalPolicy[];
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateApprovalPolicy({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<ApprovalPolicy, Error, CreateApprovalPolicyInput>({
    mutationFn: async (input) => {
      const { data, error } = await client
        .from('approval_policies')
        .insert({
          workspace_id: input.workspace_id,
          name: input.name,
          conditions: input.conditions,
          approvers: input.approvers,
          require_all: input.require_all ?? false,
          auto_approve_below: input.auto_approve_below ?? null,
          is_active: true,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ApprovalPolicy;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: [...APPROVAL_POLICIES_KEY, input.workspace_id] });
    },
  });
}

export function useUpdateApprovalPolicy({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; workspaceId: string; input: Partial<CreateApprovalPolicyInput> }>({
    mutationFn: async ({ id, input }) => {
      const { error } = await client
        .from('approval_policies')
        .update(input as any)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...APPROVAL_POLICIES_KEY, workspaceId] });
    },
  });
}

export function useDeleteApprovalPolicy({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; workspaceId: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await client
        .from('approval_policies')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...APPROVAL_POLICIES_KEY, workspaceId] });
    },
  });
}

// ---------------------------------------------------------------------------
// Approval Request hooks
// ---------------------------------------------------------------------------

/** List pending approval requests (for approvers). */
export function usePendingApprovals({
  client,
  workspaceId,
}: UseApprovalPoliciesOptions) {
  return useQuery<ApprovalRequestWithDetails[]>({
    queryKey: [...APPROVAL_REQUESTS_KEY, 'pending', workspaceId],
    queryFn: async () => {
      const { data, error } = await client
        .from('approval_requests')
        .select(`
          *,
          expenses:expense_id (id, description, amount, currency, expense_date, user_id),
          approval_policies:policy_id (id, name)
        `)
        .in('status', ['pending', 'escalated'])
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      return ((data ?? []) as any[]).map((r) => ({
        ...r,
        expense: r.expenses,
        policy: r.approval_policies,
      }));
    },
    enabled: !!workspaceId,
    staleTime: 30 * 1000,
  });
}

/** List my submitted approval requests. */
export function useMyApprovalRequests({
  client,
  userId,
}: {
  client: TypedSupabaseClient;
  userId: string | undefined;
}) {
  return useQuery<ApprovalRequestWithDetails[]>({
    queryKey: [...APPROVAL_REQUESTS_KEY, 'mine', userId],
    queryFn: async () => {
      const { data, error } = await client
        .from('approval_requests')
        .select(`
          *,
          expenses:expense_id (id, description, amount, currency, expense_date, user_id),
          approval_policies:policy_id (id, name)
        `)
        .eq('submitted_by', userId!)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      return ((data ?? []) as any[]).map((r) => ({
        ...r,
        expense: r.expenses,
        policy: r.approval_policies,
      }));
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

/** Submit an expense for approval. */
export function useSubmitForApproval({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<SubmitForApprovalResult, Error, { workspaceId: string; expenseId: string }>({
    mutationFn: async ({ workspaceId, expenseId }) => {
      const {
        data: { session },
      } = await client.auth.getSession();

      if (!session?.access_token) throw new Error('Not authenticated');

      const supabaseUrl = (client as unknown as { supabaseUrl?: string }).supabaseUrl;
      if (!supabaseUrl) throw new Error('Supabase URL not available');

      const res = await fetch(`${supabaseUrl}/functions/v1/approval-workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'submit_for_approval',
          workspace_id: workspaceId,
          expense_id: expenseId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err?.error ?? 'Submit for approval failed');
      }

      const result = await res.json();
      return result.data as SubmitForApprovalResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPROVAL_REQUESTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

/** Approve an approval request. */
export function useApproveExpense({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { requestId: string; workspaceId: string; comments?: string }>({
    mutationFn: async ({ requestId, workspaceId, comments }) => {
      const {
        data: { session },
      } = await client.auth.getSession();

      if (!session?.access_token) throw new Error('Not authenticated');

      const supabaseUrl = (client as unknown as { supabaseUrl?: string }).supabaseUrl;
      if (!supabaseUrl) throw new Error('Supabase URL not available');

      const res = await fetch(`${supabaseUrl}/functions/v1/approval-workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'approve',
          workspace_id: workspaceId,
          request_id: requestId,
          comments,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err?.error ?? 'Approve failed');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPROVAL_REQUESTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

/** Reject an approval request. */
export function useRejectExpense({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { requestId: string; workspaceId: string; comments?: string }>({
    mutationFn: async ({ requestId, workspaceId, comments }) => {
      const {
        data: { session },
      } = await client.auth.getSession();

      if (!session?.access_token) throw new Error('Not authenticated');

      const supabaseUrl = (client as unknown as { supabaseUrl?: string }).supabaseUrl;
      if (!supabaseUrl) throw new Error('Supabase URL not available');

      const res = await fetch(`${supabaseUrl}/functions/v1/approval-workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'reject',
          workspace_id: workspaceId,
          request_id: requestId,
          comments,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err?.error ?? 'Reject failed');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPROVAL_REQUESTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

/** Run auto-check of expense against team policies. */
export function useAutoCheckExpense({ client }: { client: TypedSupabaseClient }) {
  return useMutation<AutoCheckResult, Error, { workspaceId: string; expenseId: string }>({
    mutationFn: async ({ workspaceId, expenseId }) => {
      const {
        data: { session },
      } = await client.auth.getSession();

      if (!session?.access_token) throw new Error('Not authenticated');

      const supabaseUrl = (client as unknown as { supabaseUrl?: string }).supabaseUrl;
      if (!supabaseUrl) throw new Error('Supabase URL not available');

      const res = await fetch(`${supabaseUrl}/functions/v1/approval-workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'auto_check',
          workspace_id: workspaceId,
          expense_id: expenseId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err?.error ?? 'Auto check failed');
      }

      const result = await res.json();
      return result.data as AutoCheckResult;
    },
  });
}

// ---------------------------------------------------------------------------
// Team Policy hooks
// ---------------------------------------------------------------------------

/** List team policies for a workspace. */
export function useTeamPolicies({ client, workspaceId }: UseApprovalPoliciesOptions) {
  return useQuery<TeamPolicy[]>({
    queryKey: [...TEAM_POLICIES_KEY, workspaceId],
    queryFn: async () => {
      const { data, error } = await client
        .from('team_policies')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as TeamPolicy[];
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTeamPolicy({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<TeamPolicy, Error, CreateTeamPolicyInput>({
    mutationFn: async (input) => {
      const { data, error } = await client
        .from('team_policies')
        .insert({
          workspace_id: input.workspace_id,
          name: input.name,
          rules: input.rules as unknown as import('@expenseflow/types').Json,
          applies_to_roles: input.applies_to_roles ?? ['member'],
          is_active: true,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as TeamPolicy;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: [...TEAM_POLICIES_KEY, input.workspace_id] });
    },
  });
}

export function useUpdateTeamPolicy({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; workspaceId: string; input: Partial<CreateTeamPolicyInput> }>({
    mutationFn: async ({ id, input }) => {
      const { error } = await client
        .from('team_policies')
        .update(input as any)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...TEAM_POLICIES_KEY, workspaceId] });
    },
  });
}

export function useDeleteTeamPolicy({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; workspaceId: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await client
        .from('team_policies')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...TEAM_POLICIES_KEY, workspaceId] });
    },
  });
}

// ---------------------------------------------------------------------------
// Policy Violation hooks
// ---------------------------------------------------------------------------

/** List policy violations for a workspace, optionally filtered. */
export function usePolicyViolations({
  client,
  workspaceId,
  expenseId,
  unresolvedOnly = false,
}: {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
  expenseId?: string;
  unresolvedOnly?: boolean;
}) {
  return useQuery<PolicyViolation[]>({
    queryKey: [...POLICY_VIOLATIONS_KEY, workspaceId, expenseId, unresolvedOnly],
    queryFn: async () => {
      let query = client
        .from('policy_violations')
        .select('*')
        .order('created_at', { ascending: false });

      if (expenseId) {
        query = query.eq('expense_id', expenseId);
      }
      if (unresolvedOnly) {
        query = query.eq('is_resolved', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as PolicyViolation[];
    },
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });
}

/** Resolve a policy violation. */
export function useResolveViolation({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { violationId: string; workspaceId: string }>({
    mutationFn: async ({ violationId }) => {
      const {
        data: { user },
      } = await client.auth.getUser();

      const { error } = await client
        .from('policy_violations')
        .update({
          is_resolved: true,
          resolved_by: user?.id ?? null,
          resolved_at: new Date().toISOString(),
        } as any)
        .eq('id', violationId);

      if (error) throw error;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...POLICY_VIOLATIONS_KEY, workspaceId] });
    },
  });
}
