import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import type { TypedSupabaseClient } from '../client';
import { getExpenses } from '../queries/expenses';
import {
  getSmartDefaults,
  type SmartDefaults,
  detectDuplicate,
  type ExpenseInput,
  type DuplicateResult,
} from '@expenseflow/ai';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const AI_INSIGHTS_KEY = ['ai-insights'] as const;
const AI_FORECAST_KEY = ['ai-forecast'] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategorizeResult {
  categoryId: string | null;
  confidence: number;
  reasoning: string;
}

interface CategorizeResponse {
  data: CategorizeResult;
  source: 'cache' | 'ai';
}

interface AIInsight {
  id: string;
  workspace_id: string;
  user_id: string;
  type:
    | 'spending_pattern'
    | 'anomaly'
    | 'budget_warning'
    | 'savings_opportunity'
    | 'forecast';
  title: string;
  description: string;
  supporting_data: Record<string, unknown>;
  recommendation: string;
  severity: 'info' | 'warning' | 'critical';
  is_dismissed: boolean;
  created_at: string;
}

interface AIQueryResponse {
  answer: string;
  data: Record<string, unknown>[];
  suggestedFollowUps: string[];
  cached?: boolean;
}

interface ForecastBreakdownItem {
  categoryId: string;
  categoryName: string;
  projectedAmount: number;
  currentAmount: number;
  trend: 'up' | 'down' | 'stable';
}

interface AIForecastResponse {
  projectedExpenses: number;
  projectedIncome: number;
  projectedNet: number;
  confidence: number;
  narrative: string;
  breakdown: ForecastBreakdownItem[];
  assumptions: string[];
  periodDays: 30 | 60 | 90;
  generatedAt: string;
}

interface UseAiCategorizeOptions {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  categories: Array<{ id: string; name: string }>;
}

interface UseSmartDefaultsOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
}

interface UseDuplicateCheckOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
}

interface UseAIQueryOptions {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  workspaceId: string | undefined;
}

interface UseAIInsightsOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
  type?: AIInsight['type'];
  includesDismissed?: boolean;
}

interface UseAIForecastOptions {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  workspaceId: string | undefined;
  days: 30 | 60 | 90;
}

interface UseRefreshInsightsOptions {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  workspaceId: string | undefined;
}

// ---------------------------------------------------------------------------
// useAiCategorize — calls the AI categorize edge function
// ---------------------------------------------------------------------------

export function useAiCategorize({
  supabaseUrl,
  supabaseAnonKey,
  accessToken,
  categories,
}: UseAiCategorizeOptions) {
  return useMutation({
    mutationFn: async ({
      description,
      merchant,
    }: {
      description: string;
      merchant?: string;
    }): Promise<CategorizeResult> => {
      if (!description.trim()) {
        return { categoryId: null, confidence: 0, reasoning: 'Empty description' };
      }

      if (categories.length === 0) {
        return { categoryId: null, confidence: 0, reasoning: 'No categories available' };
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/ai-categorize`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({ description, merchant, categories }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error ??
            `Categorization failed: ${response.status}`,
        );
      }

      const result = (await response.json()) as CategorizeResponse;
      return result.data;
    },
  });
}

// ---------------------------------------------------------------------------
// useAIQuery — natural language query via ai-insights edge function
// ---------------------------------------------------------------------------

export function useAIQuery({
  supabaseUrl,
  supabaseAnonKey,
  accessToken,
  workspaceId,
}: UseAIQueryOptions) {
  return useMutation({
    mutationFn: async (question: string): Promise<AIQueryResponse> => {
      if (!question.trim()) {
        throw new Error('Question is required');
      }
      if (!workspaceId) {
        throw new Error('Workspace ID is required');
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/ai-insights`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({ question, workspaceId }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error ??
            `AI query failed: ${response.status}`,
        );
      }

      return response.json() as Promise<AIQueryResponse>;
    },
  });
}

// ---------------------------------------------------------------------------
// useAIInsights — fetches stored ai_insights for a workspace
// ---------------------------------------------------------------------------

export function useAIInsights({
  client,
  workspaceId,
  type,
  includesDismissed = false,
}: UseAIInsightsOptions) {
  return useQuery({
    queryKey: [...AI_INSIGHTS_KEY, workspaceId, type, includesDismissed],
    queryFn: async (): Promise<AIInsight[]> => {
      let query = client
        .from('ai_insights')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!includesDismissed) {
        query = query.eq('is_dismissed', false);
      }

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as AIInsight[];
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useDismissInsight — marks a single insight as dismissed
// ---------------------------------------------------------------------------

export function useDismissInsight({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (insightId: string): Promise<void> => {
      const { error } = await client
        .from('ai_insights')
        .update({ is_dismissed: true })
        .eq('id', insightId);

      if (error) throw error;
    },
    onMutate: async (insightId) => {
      await queryClient.cancelQueries({ queryKey: AI_INSIGHTS_KEY });

      // Optimistic update: mark insight as dismissed
      queryClient.setQueriesData<AIInsight[]>(
        { queryKey: AI_INSIGHTS_KEY },
        (old) =>
          old?.map((insight) =>
            insight.id === insightId
              ? { ...insight, is_dismissed: true }
              : insight,
          ),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: AI_INSIGHTS_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// useAIForecast — calls the ai-forecast edge function
// ---------------------------------------------------------------------------

export function useAIForecast({
  supabaseUrl,
  supabaseAnonKey,
  accessToken,
  workspaceId,
  days,
}: UseAIForecastOptions) {
  return useQuery({
    queryKey: [...AI_FORECAST_KEY, workspaceId, days],
    queryFn: async (): Promise<AIForecastResponse> => {
      if (!workspaceId) throw new Error('Workspace ID is required');

      const response = await fetch(
        `${supabaseUrl}/functions/v1/ai-forecast`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({ workspaceId, days }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error ??
            `Forecast failed: ${response.status}`,
        );
      }

      return response.json() as Promise<AIForecastResponse>;
    },
    enabled: !!workspaceId && !!accessToken,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  });
}

// ---------------------------------------------------------------------------
// useAnomalyAlerts — fetches anomaly-type insights for a workspace
// ---------------------------------------------------------------------------

export function useAnomalyAlerts({
  client,
  workspaceId,
}: {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
}) {
  return useAIInsights({ client, workspaceId, type: 'anomaly' });
}

// ---------------------------------------------------------------------------
// useRefreshInsights — triggers on-demand insight generation
// ---------------------------------------------------------------------------

export function useRefreshInsights({
  supabaseUrl,
  supabaseAnonKey,
  accessToken,
  workspaceId,
}: UseRefreshInsightsOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ generated: number }> => {
      if (!workspaceId) throw new Error('Workspace ID is required');

      const response = await fetch(
        `${supabaseUrl}/functions/v1/ai-insights/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({ workspaceId }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error ??
            `Insight generation failed: ${response.status}`,
        );
      }

      const result = await response.json() as { generated: number };
      return result;
    },
    onSuccess: () => {
      // Invalidate all AI insights so UI re-fetches fresh data
      queryClient.invalidateQueries({ queryKey: AI_INSIGHTS_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// useSmartDefaults — time-based category/description suggestions
// ---------------------------------------------------------------------------

export function useSmartDefaults({
  client,
  workspaceId,
}: UseSmartDefaultsOptions) {
  const { data: recentExpenses } = useQuery({
    queryKey: ['expenses', 'recent-for-defaults', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      return getExpenses(client, workspaceId, {
        dateRange: {
          startDate: thirtyDaysAgo.toISOString().split('T')[0]!,
          endDate: new Date().toISOString().split('T')[0]!,
        },
      });
    },
    enabled: !!workspaceId,
    staleTime: 10 * 60 * 1000,
  });

  const defaults = useMemo((): SmartDefaults => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    const recentInputs = (recentExpenses ?? []).map((e) => ({
      description: e.description,
      category_id: e.category_id,
      // Normalize: expense_date takes precedence over date
      date: e.expense_date,
    }));

    return getSmartDefaults(hour, dayOfWeek, recentInputs);
  }, [recentExpenses]);

  return defaults;
}

// ---------------------------------------------------------------------------
// useDuplicateCheck — checks against recent expenses for duplicates
// ---------------------------------------------------------------------------

export function useDuplicateCheck({
  client,
  workspaceId,
}: UseDuplicateCheckOptions) {
  const checkDuplicate = useCallback(
    async (expense: ExpenseInput): Promise<DuplicateResult> => {
      if (!workspaceId) {
        return { isDuplicate: false, matchingExpenseId: null, confidence: 0 };
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentExpenses = await getExpenses(client, workspaceId, {
        dateRange: {
          startDate: sevenDaysAgo.toISOString().split('T')[0]!,
          endDate: new Date().toISOString().split('T')[0]!,
        },
      });

      const recentInputs: ExpenseInput[] = recentExpenses.map((e) => ({
        id: e.id,
        amount: e.amount,
        description: e.description,
        date: e.expense_date,
      }));

      return detectDuplicate(expense, recentInputs);
    },
    [client, workspaceId],
  );

  return { checkDuplicate };
}

// ---------------------------------------------------------------------------
// Re-export types for consumers
// ---------------------------------------------------------------------------

export type {
  AIInsight,
  AIQueryResponse,
  AIForecastResponse,
  ForecastBreakdownItem,
  CategorizeResult,
};
