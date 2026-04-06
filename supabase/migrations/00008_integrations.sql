-- =============================================================================
-- ExpenseFlow: Phase 11 — Integrations
-- Migration: 00008_integrations
-- Description: Webhooks, third-party integrations, API keys, export jobs
-- =============================================================================

-- =============================================================================
-- TABLE: webhooks
-- User-configured outgoing webhook endpoints
-- =============================================================================

CREATE TABLE public.webhooks (
  id           UUID          PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id UUID          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name         TEXT          NOT NULL CHECK (char_length(name) BETWEEN 1 AND 150),
  url          TEXT          NOT NULL CHECK (char_length(url) BETWEEN 10 AND 2048),
  secret       TEXT          NOT NULL CHECK (char_length(secret) >= 16),
  events       TEXT[]        NOT NULL DEFAULT '{}',
  is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.webhooks             IS 'Outgoing webhook endpoints configured per workspace';
COMMENT ON COLUMN public.webhooks.secret      IS 'HMAC-SHA256 secret used to sign payloads';
COMMENT ON COLUMN public.webhooks.events      IS 'Array of event types this webhook subscribes to (e.g. expense.created)';

-- =============================================================================
-- TABLE: webhook_deliveries
-- Log of every webhook delivery attempt
-- =============================================================================

CREATE TABLE public.webhook_deliveries (
  id            UUID          PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  webhook_id    UUID          NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_type    TEXT          NOT NULL,
  payload       JSONB         NOT NULL DEFAULT '{}',
  status        TEXT          NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  response_code INTEGER,
  response_body TEXT,
  attempts      INTEGER       NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.webhook_deliveries              IS 'Delivery log for each webhook dispatch attempt';
COMMENT ON COLUMN public.webhook_deliveries.attempts     IS 'Number of delivery attempts (max 3)';
COMMENT ON COLUMN public.webhook_deliveries.next_retry_at IS 'Next scheduled retry timestamp (exponential backoff)';

-- =============================================================================
-- TABLE: integrations
-- Third-party service connections (Google Sheets, Slack, etc.)
-- =============================================================================

CREATE TABLE public.integrations (
  id            UUID          PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id  UUID          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider      TEXT          NOT NULL CHECK (provider IN ('google_sheets', 'slack', 'teams', 'quickbooks', 'xero', 'zoho')),
  config        JSONB         NOT NULL DEFAULT '{}',
  access_token  TEXT,
  refresh_token TEXT,
  expires_at    TIMESTAMPTZ,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, provider)
);

COMMENT ON TABLE  public.integrations              IS 'Third-party service connections per workspace';
COMMENT ON COLUMN public.integrations.config       IS 'Provider-specific config (encrypted at application layer)';
COMMENT ON COLUMN public.integrations.access_token IS 'OAuth access token (encrypted at application layer)';

-- =============================================================================
-- TABLE: api_keys
-- Developer API keys for programmatic access
-- =============================================================================

CREATE TABLE public.api_keys (
  id           UUID          PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id UUID          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name         TEXT          NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  key_hash     TEXT          NOT NULL,
  prefix       TEXT          NOT NULL CHECK (char_length(prefix) = 8),
  scopes       TEXT[]        NOT NULL DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.api_keys          IS 'API keys for programmatic workspace access';
COMMENT ON COLUMN public.api_keys.key_hash IS 'SHA-256 hash of the full API key';
COMMENT ON COLUMN public.api_keys.prefix   IS 'First 8 characters of the key for identification';
COMMENT ON COLUMN public.api_keys.scopes   IS 'Permitted scopes: expenses:read, expenses:write, reports:read, etc.';

-- =============================================================================
-- TABLE: export_jobs
-- Async export job tracking
-- =============================================================================

CREATE TABLE public.export_jobs (
  id           UUID          PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id UUID          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  format       TEXT          NOT NULL CHECK (format IN ('csv', 'pdf', 'xlsx', 'qbo', 'xero')),
  status       TEXT          NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_url     TEXT,
  filters      JSONB         NOT NULL DEFAULT '{}',
  error_message TEXT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

COMMENT ON TABLE  public.export_jobs         IS 'Async export jobs for generating downloadable files';
COMMENT ON COLUMN public.export_jobs.filters IS 'Date range, categories, and other filters applied to the export';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;

-- Webhooks: workspace members can manage
CREATE POLICY "webhooks_select" ON public.webhooks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = webhooks.workspace_id AND wm.user_id = auth.uid())
  );
CREATE POLICY "webhooks_insert" ON public.webhooks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = webhooks.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );
CREATE POLICY "webhooks_update" ON public.webhooks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = webhooks.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );
CREATE POLICY "webhooks_delete" ON public.webhooks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = webhooks.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );

-- Webhook deliveries: readable by workspace members
CREATE POLICY "webhook_deliveries_select" ON public.webhook_deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.webhooks w
      JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id
      WHERE w.id = webhook_deliveries.webhook_id AND wm.user_id = auth.uid()
    )
  );

-- Integrations: workspace admins/owners can manage
CREATE POLICY "integrations_select" ON public.integrations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = integrations.workspace_id AND wm.user_id = auth.uid())
  );
CREATE POLICY "integrations_insert" ON public.integrations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = integrations.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );
CREATE POLICY "integrations_update" ON public.integrations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = integrations.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );
CREATE POLICY "integrations_delete" ON public.integrations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = integrations.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );

-- API keys: workspace admins/owners can manage
CREATE POLICY "api_keys_select" ON public.api_keys
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = api_keys.workspace_id AND wm.user_id = auth.uid())
  );
CREATE POLICY "api_keys_insert" ON public.api_keys
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = api_keys.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );
CREATE POLICY "api_keys_update" ON public.api_keys
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = api_keys.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );
CREATE POLICY "api_keys_delete" ON public.api_keys
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = api_keys.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );

-- Export jobs: workspace members can manage their own
CREATE POLICY "export_jobs_select" ON public.export_jobs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = export_jobs.workspace_id AND wm.user_id = auth.uid())
  );
CREATE POLICY "export_jobs_insert" ON public.export_jobs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = export_jobs.workspace_id AND wm.user_id = auth.uid())
  );

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_webhooks_workspace ON public.webhooks (workspace_id, is_active);
CREATE INDEX idx_webhook_deliveries_webhook ON public.webhook_deliveries (webhook_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_status ON public.webhook_deliveries (status, next_retry_at) WHERE status = 'pending' OR status = 'failed';
CREATE INDEX idx_integrations_workspace ON public.integrations (workspace_id, provider, is_active);
CREATE INDEX idx_api_keys_workspace ON public.api_keys (workspace_id, is_active);
CREATE INDEX idx_api_keys_prefix ON public.api_keys (prefix) WHERE is_active = TRUE;
CREATE INDEX idx_export_jobs_workspace ON public.export_jobs (workspace_id, created_at DESC);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_webhooks_updated_at') THEN
    CREATE TRIGGER trg_webhooks_updated_at
      BEFORE UPDATE ON public.webhooks
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_integrations_updated_at') THEN
    CREATE TRIGGER trg_integrations_updated_at
      BEFORE UPDATE ON public.integrations
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;
