-- =============================================================================
-- ExpenseFlow: Phase 13 — Enterprise Features
-- Migration: 00010_enterprise
-- Description: SSO, approval workflows, team policies, policy violations
-- =============================================================================

-- =============================================================================
-- TABLE: sso_configs
-- Single Sign-On configuration per workspace
-- =============================================================================

CREATE TABLE public.sso_configs (
  id           UUID          PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id UUID          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider     TEXT          NOT NULL CHECK (provider IN ('saml', 'okta', 'azure_ad')),
  entity_id    TEXT          NOT NULL CHECK (char_length(entity_id) BETWEEN 1 AND 500),
  sso_url      TEXT          NOT NULL CHECK (char_length(sso_url) BETWEEN 10 AND 2048),
  certificate  TEXT          NOT NULL,
  metadata_url TEXT,
  is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, provider)
);

COMMENT ON TABLE  public.sso_configs             IS 'SSO/SAML configuration for enterprise workspace authentication';
COMMENT ON COLUMN public.sso_configs.certificate IS 'X.509 certificate for validating SAML assertions';
COMMENT ON COLUMN public.sso_configs.metadata_url IS 'IdP metadata URL for auto-configuration';

-- =============================================================================
-- TABLE: approval_policies
-- Rules that determine when expenses need approval
-- =============================================================================

CREATE TABLE public.approval_policies (
  id                UUID          PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id      UUID          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name              TEXT          NOT NULL CHECK (char_length(name) BETWEEN 1 AND 150),
  conditions        JSONB         NOT NULL DEFAULT '{}',
  approvers         UUID[]        NOT NULL DEFAULT '{}',
  require_all       BOOLEAN       NOT NULL DEFAULT FALSE,
  auto_approve_below DECIMAL(15,2),
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.approval_policies                IS 'Rules defining when expenses require approval';
COMMENT ON COLUMN public.approval_policies.conditions     IS 'JSON conditions: {amount_above, categories, tags, etc.}';
COMMENT ON COLUMN public.approval_policies.approvers      IS 'Array of user UUIDs who can approve matching expenses';
COMMENT ON COLUMN public.approval_policies.require_all    IS 'If true, all approvers must approve; otherwise any one suffices';
COMMENT ON COLUMN public.approval_policies.auto_approve_below IS 'Expenses below this amount are auto-approved';

-- =============================================================================
-- TABLE: approval_requests
-- Individual approval requests for expenses
-- =============================================================================

CREATE TABLE public.approval_requests (
  id           UUID          PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  expense_id   UUID          NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  policy_id    UUID          NOT NULL REFERENCES public.approval_policies(id) ON DELETE CASCADE,
  status       TEXT          NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
  submitted_by UUID          NOT NULL REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  decided_by   UUID          REFERENCES auth.users(id),
  decided_at   TIMESTAMPTZ,
  comments     TEXT
);

COMMENT ON TABLE  public.approval_requests            IS 'Approval requests linking expenses to policies';
COMMENT ON COLUMN public.approval_requests.status     IS 'pending -> approved/rejected/escalated';
COMMENT ON COLUMN public.approval_requests.decided_by IS 'User who made the approval/rejection decision';

-- =============================================================================
-- TABLE: team_policies
-- Workspace-level expense policies and rules
-- =============================================================================

CREATE TABLE public.team_policies (
  id             UUID          PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id   UUID          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name           TEXT          NOT NULL CHECK (char_length(name) BETWEEN 1 AND 150),
  rules          JSONB         NOT NULL DEFAULT '{}',
  applies_to_roles TEXT[]      NOT NULL DEFAULT '{member}',
  is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.team_policies          IS 'Workspace expense policies enforced on team members';
COMMENT ON COLUMN public.team_policies.rules    IS 'JSON rules: {max_amount, allowed_categories, receipt_required_above, auto_flag_rules}';
COMMENT ON COLUMN public.team_policies.applies_to_roles IS 'Workspace roles this policy applies to';

-- =============================================================================
-- TABLE: policy_violations
-- Recorded violations when expenses break team policies
-- =============================================================================

CREATE TABLE public.policy_violations (
  id             UUID          PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  expense_id     UUID          NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  policy_id      UUID          NOT NULL REFERENCES public.team_policies(id) ON DELETE CASCADE,
  violation_type TEXT          NOT NULL CHECK (char_length(violation_type) BETWEEN 1 AND 100),
  details        TEXT,
  is_resolved    BOOLEAN       NOT NULL DEFAULT FALSE,
  resolved_by    UUID          REFERENCES auth.users(id),
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.policy_violations               IS 'Recorded violations when expenses breach team policies';
COMMENT ON COLUMN public.policy_violations.violation_type IS 'Type: over_limit, missing_receipt, unapproved_category, etc.';

-- =============================================================================
-- ALTER expenses: add approval_status column
-- =============================================================================

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'none'
    CHECK (approval_status IN ('none', 'pending', 'approved', 'rejected'));

COMMENT ON COLUMN public.expenses.approval_status IS 'Approval workflow status: none (no approval needed), pending, approved, rejected';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.sso_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_violations ENABLE ROW LEVEL SECURITY;

-- SSO configs: only workspace owners/admins
CREATE POLICY "sso_configs_select" ON public.sso_configs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sso_configs.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );
CREATE POLICY "sso_configs_insert" ON public.sso_configs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sso_configs.workspace_id AND wm.user_id = auth.uid() AND wm.role = 'owner')
  );
CREATE POLICY "sso_configs_update" ON public.sso_configs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sso_configs.workspace_id AND wm.user_id = auth.uid() AND wm.role = 'owner')
  );
CREATE POLICY "sso_configs_delete" ON public.sso_configs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sso_configs.workspace_id AND wm.user_id = auth.uid() AND wm.role = 'owner')
  );

-- Approval policies: admins/owners manage, members can view
CREATE POLICY "approval_policies_select" ON public.approval_policies
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = approval_policies.workspace_id AND wm.user_id = auth.uid())
  );
CREATE POLICY "approval_policies_insert" ON public.approval_policies
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = approval_policies.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );
CREATE POLICY "approval_policies_update" ON public.approval_policies
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = approval_policies.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );
CREATE POLICY "approval_policies_delete" ON public.approval_policies
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = approval_policies.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );

-- Approval requests: submitters can see own, approvers can see assigned
CREATE POLICY "approval_requests_select" ON public.approval_requests
  FOR SELECT USING (
    submitted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.approval_policies ap
      WHERE ap.id = approval_requests.policy_id AND auth.uid() = ANY(ap.approvers)
    )
    OR EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.workspace_members wm ON wm.workspace_id = e.workspace_id
      WHERE e.id = approval_requests.expense_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin')
    )
  );
CREATE POLICY "approval_requests_insert" ON public.approval_requests
  FOR INSERT WITH CHECK (submitted_by = auth.uid());
CREATE POLICY "approval_requests_update" ON public.approval_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.approval_policies ap
      WHERE ap.id = approval_requests.policy_id AND auth.uid() = ANY(ap.approvers)
    )
    OR EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.workspace_members wm ON wm.workspace_id = e.workspace_id
      WHERE e.id = approval_requests.expense_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin')
    )
  );

-- Team policies: admins/owners manage, members can view
CREATE POLICY "team_policies_select" ON public.team_policies
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = team_policies.workspace_id AND wm.user_id = auth.uid())
  );
CREATE POLICY "team_policies_insert" ON public.team_policies
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = team_policies.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );
CREATE POLICY "team_policies_update" ON public.team_policies
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = team_policies.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );
CREATE POLICY "team_policies_delete" ON public.team_policies
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = team_policies.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );

-- Policy violations: members see own, admins see all in workspace
CREATE POLICY "policy_violations_select" ON public.policy_violations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = policy_violations.expense_id AND e.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.workspace_members wm ON wm.workspace_id = e.workspace_id
      WHERE e.id = policy_violations.expense_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin')
    )
  );
CREATE POLICY "policy_violations_update" ON public.policy_violations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.workspace_members wm ON wm.workspace_id = e.workspace_id
      WHERE e.id = policy_violations.expense_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin')
    )
  );

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_sso_configs_workspace ON public.sso_configs (workspace_id, is_active);
CREATE INDEX idx_approval_policies_workspace ON public.approval_policies (workspace_id, is_active);
CREATE INDEX idx_approval_requests_expense ON public.approval_requests (expense_id, status);
CREATE INDEX idx_approval_requests_submitted_by ON public.approval_requests (submitted_by, status);
CREATE INDEX idx_approval_requests_pending ON public.approval_requests (status, submitted_at) WHERE status = 'pending';
CREATE INDEX idx_team_policies_workspace ON public.team_policies (workspace_id, is_active);
CREATE INDEX idx_policy_violations_expense ON public.policy_violations (expense_id, is_resolved);
CREATE INDEX idx_policy_violations_unresolved ON public.policy_violations (is_resolved, created_at) WHERE is_resolved = FALSE;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sso_configs_updated_at') THEN
    CREATE TRIGGER trg_sso_configs_updated_at
      BEFORE UPDATE ON public.sso_configs
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_approval_policies_updated_at') THEN
    CREATE TRIGGER trg_approval_policies_updated_at
      BEFORE UPDATE ON public.approval_policies
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_team_policies_updated_at') THEN
    CREATE TRIGGER trg_team_policies_updated_at
      BEFORE UPDATE ON public.team_policies
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;
