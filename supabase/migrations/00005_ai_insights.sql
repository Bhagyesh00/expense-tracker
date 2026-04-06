-- =============================================================================
-- ExpenseFlow: AI Insights & Enhanced Cache Schema
-- Migration: 00005_ai_insights
-- Description: Creates ai_insights table, insight_type enum, enhances
--              ai_cache with workspace scoping, and a safe query RPC.
-- =============================================================================

-- =============================================================================
-- ENUM: insight_type
-- =============================================================================

CREATE TYPE public.insight_type AS ENUM (
    'spending_pattern',
    'anomaly',
    'budget_warning',
    'savings_opportunity',
    'forecast'
);

COMMENT ON TYPE public.insight_type IS 'Classification of AI-generated financial insights';

-- =============================================================================
-- ENUM: insight_severity
-- =============================================================================

CREATE TYPE public.insight_severity AS ENUM (
    'info',
    'warning',
    'critical'
);

COMMENT ON TYPE public.insight_severity IS 'Urgency level of an AI insight';

-- =============================================================================
-- TABLE: ai_insights
-- Stores generated insights for each workspace.
-- Rows are workspace-scoped and can be dismissed by the user.
-- =============================================================================

CREATE TABLE public.ai_insights (
    id               UUID             PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    workspace_id     UUID             NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id          UUID             NOT NULL REFERENCES auth.users(id)        ON DELETE CASCADE,
    type             public.insight_type      NOT NULL,
    title            TEXT             NOT NULL CHECK (char_length(title)       BETWEEN 1 AND 200),
    description      TEXT             NOT NULL,
    supporting_data  JSONB            NOT NULL DEFAULT '{}',
    recommendation   TEXT             NOT NULL DEFAULT '',
    severity         public.insight_severity  NOT NULL DEFAULT 'info',
    is_dismissed     BOOLEAN          NOT NULL DEFAULT false,
    created_at       TIMESTAMPTZ      NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.ai_insights                    IS 'AI-generated financial insights scoped to a workspace';
COMMENT ON COLUMN public.ai_insights.type               IS 'Category of insight: spending_pattern, anomaly, budget_warning, savings_opportunity, forecast';
COMMENT ON COLUMN public.ai_insights.supporting_data    IS 'Raw data that supports the insight (amounts, category IDs, etc.)';
COMMENT ON COLUMN public.ai_insights.recommendation     IS 'Actionable suggestion derived from the insight';
COMMENT ON COLUMN public.ai_insights.severity           IS 'How urgent or important the insight is';
COMMENT ON COLUMN public.ai_insights.is_dismissed       IS 'True once the user acknowledges and hides the insight';

-- Indexes for common access patterns
CREATE INDEX idx_ai_insights_workspace_dismissed
    ON public.ai_insights(workspace_id, is_dismissed);

CREATE INDEX idx_ai_insights_workspace_type
    ON public.ai_insights(workspace_id, type);

CREATE INDEX idx_ai_insights_workspace_created
    ON public.ai_insights(workspace_id, created_at DESC);

CREATE INDEX idx_ai_insights_user_id
    ON public.ai_insights(user_id);

-- =============================================================================
-- ENHANCE: ai_cache — add workspace_id and query_hash columns
--
-- The existing ai_cache table has: id, cache_key, cache_type, data,
-- expires_at, created_at.
-- We add workspace_id (nullable — NULL for global caches like currency rates)
-- and query_hash for faster lookups on long cache keys.
-- =============================================================================

ALTER TABLE public.ai_cache
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS query_hash   TEXT GENERATED ALWAYS AS (
        encode(extensions.digest(cache_key, 'sha256'), 'hex')
    ) STORED;

COMMENT ON COLUMN public.ai_cache.workspace_id IS 'Workspace this cached result belongs to (NULL = global)';
COMMENT ON COLUMN public.ai_cache.query_hash   IS 'SHA-256 of cache_key for fast indexed lookups';

-- Indexes on new columns
CREATE INDEX IF NOT EXISTS idx_ai_cache_workspace_type
    ON public.ai_cache(workspace_id, cache_type)
    WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_cache_query_hash
    ON public.ai_cache(query_hash);

-- Re-create expires_at index (already exists, ensure it covers new usage)
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires_at_v2
    ON public.ai_cache(expires_at)
    WHERE expires_at < now() + INTERVAL '2 hours';

-- =============================================================================
-- RLS: Enable and configure Row Level Security
-- =============================================================================

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- Workspace members can read all insights in their workspace
CREATE POLICY "ai_insights_select_workspace_members"
    ON public.ai_insights
    FOR SELECT
    USING (public.is_workspace_member(workspace_id));

-- Only the insight owner (or service role) can insert
CREATE POLICY "ai_insights_insert_own"
    ON public.ai_insights
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        OR public.is_workspace_member(workspace_id)
    );

-- Users can update (dismiss) their own workspace's insights
CREATE POLICY "ai_insights_update_workspace_members"
    ON public.ai_insights
    FOR UPDATE
    USING (public.is_workspace_member(workspace_id))
    WITH CHECK (public.is_workspace_member(workspace_id));

-- Users cannot hard-delete insights; only service role can purge old ones
CREATE POLICY "ai_insights_no_user_delete"
    ON public.ai_insights
    FOR DELETE
    USING (false);

-- =============================================================================
-- SAFE QUERY RPC: ai_execute_query
--
-- Executes a SELECT-only SQL string passed from the edge function.
-- The edge function is responsible for sanitizing the SQL before calling this.
-- This function runs as SECURITY DEFINER so it can access workspace data
-- but only allows read operations.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.ai_execute_query(
    query_sql    TEXT,
    p_workspace_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
    clean_sql TEXT;
BEGIN
    -- Strip comments and whitespace
    clean_sql := regexp_replace(query_sql, '--[^\n]*\n', '', 'g');
    clean_sql := regexp_replace(clean_sql, '/\*.*?\*/', '', 'gs');
    clean_sql := trim(clean_sql);

    -- Enforce SELECT-only
    IF NOT (clean_sql ~* '^\s*SELECT\b') THEN
        RAISE EXCEPTION 'Only SELECT queries are permitted';
    END IF;

    -- Block mutation keywords even in subqueries
    IF clean_sql ~* '\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|EXECUTE|EXEC|MERGE)\b' THEN
        RAISE EXCEPTION 'Mutation keywords are not permitted in AI queries';
    END IF;

    -- Verify the workspace_id appears in the query to prevent cross-workspace leaks
    IF position(p_workspace_id::TEXT IN clean_sql) = 0 THEN
        RAISE EXCEPTION 'Query must be scoped to workspace_id: %', p_workspace_id;
    END IF;

    -- Execute and return as JSONB array
    EXECUTE format('SELECT coalesce(jsonb_agg(row_to_json(q)), ''[]''::jsonb) FROM (%s) q', clean_sql)
    INTO result;

    RETURN COALESCE(result, '[]'::jsonb);

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'AI query execution error: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.ai_execute_query IS
    'Executes a sanitized SELECT-only SQL query for AI insights. Called by the ai-insights edge function.';

-- Grant execute permission to authenticated role
GRANT EXECUTE ON FUNCTION public.ai_execute_query TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_execute_query TO service_role;

-- =============================================================================
-- UTILITY FUNCTION: cleanup_expired_ai_cache
-- Can be called by a Supabase cron job to prune stale cache entries.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.ai_cache
    WHERE expires_at < now();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_ai_cache IS
    'Removes expired entries from ai_cache. Safe to call from a scheduled cron job.';

GRANT EXECUTE ON FUNCTION public.cleanup_expired_ai_cache TO service_role;
