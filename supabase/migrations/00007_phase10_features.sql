-- =============================================================================
-- ExpenseFlow: Phase 10 Features
-- Migration: 00007_phase10_features
-- Description: Net worth tracking, budget rollover, detected subscriptions,
--              and supporting indexes/RLS for security & financial intelligence.
-- =============================================================================

-- =============================================================================
-- TABLE: net_worth_entries
-- Assets and liabilities tracked by the user
-- =============================================================================

CREATE TABLE public.net_worth_entries (
  id             UUID          PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id        UUID          NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,
  workspace_id   UUID          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entry_type     TEXT          NOT NULL CHECK (entry_type IN ('asset', 'liability')),
  category       TEXT          NOT NULL CHECK (category IN ('cash', 'bank', 'investment', 'property', 'loan', 'credit_card', 'other')),
  name           TEXT          NOT NULL CHECK (char_length(name) BETWEEN 1 AND 150),
  value          DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency       TEXT          NOT NULL DEFAULT 'INR',
  value_inr      DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes          TEXT,
  is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.net_worth_entries              IS 'Individual asset and liability records for net worth calculation';
COMMENT ON COLUMN public.net_worth_entries.entry_type  IS 'asset: things the user owns; liability: things the user owes';
COMMENT ON COLUMN public.net_worth_entries.value_inr   IS 'Value converted to INR using exchange rate at last update';
COMMENT ON COLUMN public.net_worth_entries.is_active   IS 'Soft-delete flag; inactive entries are excluded from totals';

-- =============================================================================
-- TABLE: net_worth_snapshots
-- Monthly point-in-time snapshots used for historical trend charts
-- =============================================================================

CREATE TABLE public.net_worth_snapshots (
  id                UUID          PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id           UUID          NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,
  workspace_id      UUID          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  snapshot_date     DATE          NOT NULL,
  total_assets      DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_liabilities DECIMAL(15,2) NOT NULL DEFAULT 0,
  net_worth         DECIMAL(15,2) GENERATED ALWAYS AS (total_assets - total_liabilities) STORED,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, snapshot_date)
);

COMMENT ON TABLE  public.net_worth_snapshots                   IS 'Monthly snapshots of net worth for historical trend analysis';
COMMENT ON COLUMN public.net_worth_snapshots.net_worth         IS 'Computed: total_assets - total_liabilities (stored for fast queries)';
COMMENT ON COLUMN public.net_worth_snapshots.snapshot_date     IS 'Typically the first of each month; UNIQUE per user';

-- =============================================================================
-- BUDGET ROLLOVER COLUMNS
-- Extend existing budgets table to support carrying over unused budget
-- =============================================================================

ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS rollover_enabled     BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rollover_type        TEXT         NOT NULL DEFAULT 'full'
    CHECK (rollover_type IN ('full', 'partial', 'capped')),
  ADD COLUMN IF NOT EXISTS rollover_percentage  INTEGER      NOT NULL DEFAULT 100
    CHECK (rollover_percentage BETWEEN 1 AND 100),
  ADD COLUMN IF NOT EXISTS rollover_cap         DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS rollover_amount      DECIMAL(12,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.budgets.rollover_enabled    IS 'When TRUE, unused budget carries over to the next period';
COMMENT ON COLUMN public.budgets.rollover_type       IS 'full: carry 100%; partial: carry rollover_percentage%; capped: carry up to rollover_cap';
COMMENT ON COLUMN public.budgets.rollover_percentage IS 'Percentage of unused budget to carry over (used when rollover_type=partial)';
COMMENT ON COLUMN public.budgets.rollover_cap        IS 'Maximum INR amount to carry over (used when rollover_type=capped)';
COMMENT ON COLUMN public.budgets.rollover_amount     IS 'Accumulated rollover from previous periods; added to effective budget amount';

-- =============================================================================
-- TABLE: detected_subscriptions
-- Cache of auto-detected recurring charges
-- =============================================================================

CREATE TABLE public.detected_subscriptions (
  id                  UUID          PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id        UUID          NOT NULL REFERENCES public.workspaces(id)       ON DELETE CASCADE,
  user_id             UUID          NOT NULL REFERENCES auth.users(id)              ON DELETE CASCADE,
  merchant_name       TEXT          NOT NULL CHECK (char_length(merchant_name) BETWEEN 1 AND 200),
  average_amount      DECIMAL(12,2) NOT NULL CHECK (average_amount > 0),
  currency            TEXT          NOT NULL DEFAULT 'INR',
  detected_interval   TEXT          NOT NULL CHECK (detected_interval IN ('weekly', 'monthly', 'yearly')),
  last_charged_at     DATE,
  next_expected_at    DATE,
  transaction_count   INTEGER       NOT NULL DEFAULT 0,
  is_dismissed        BOOLEAN       NOT NULL DEFAULT FALSE,
  linked_template_id  UUID          REFERENCES public.expense_templates(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id, merchant_name, detected_interval)
);

COMMENT ON TABLE  public.detected_subscriptions                    IS 'Auto-detected recurring subscription charges from expense history';
COMMENT ON COLUMN public.detected_subscriptions.merchant_name     IS 'Normalized (lowercase, stripped) merchant/description text';
COMMENT ON COLUMN public.detected_subscriptions.detected_interval IS 'weekly | monthly | yearly — inferred from transaction spacing';
COMMENT ON COLUMN public.detected_subscriptions.next_expected_at  IS 'Projected next charge date based on last_charged_at + interval';
COMMENT ON COLUMN public.detected_subscriptions.linked_template_id IS 'Optional expense template for quick-adding this subscription';

-- =============================================================================
-- ROW LEVEL SECURITY: net_worth_entries
-- =============================================================================

ALTER TABLE public.net_worth_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "net_worth_entries_select_own"
  ON public.net_worth_entries
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "net_worth_entries_insert_own"
  ON public.net_worth_entries
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "net_worth_entries_update_own"
  ON public.net_worth_entries
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "net_worth_entries_delete_own"
  ON public.net_worth_entries
  FOR DELETE
  USING (user_id = auth.uid());

-- =============================================================================
-- ROW LEVEL SECURITY: net_worth_snapshots
-- =============================================================================

ALTER TABLE public.net_worth_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "net_worth_snapshots_select_own"
  ON public.net_worth_snapshots
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "net_worth_snapshots_insert_own"
  ON public.net_worth_snapshots
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "net_worth_snapshots_update_own"
  ON public.net_worth_snapshots
  FOR UPDATE
  USING (user_id = auth.uid());

-- =============================================================================
-- ROW LEVEL SECURITY: detected_subscriptions
-- =============================================================================

ALTER TABLE public.detected_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "detected_subscriptions_select_own"
  ON public.detected_subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "detected_subscriptions_insert_own"
  ON public.detected_subscriptions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "detected_subscriptions_update_own"
  ON public.detected_subscriptions
  FOR UPDATE
  USING (user_id = auth.uid());

-- =============================================================================
-- INDEXES
-- =============================================================================

-- net_worth_entries: primary access pattern is user + type + active flag
CREATE INDEX idx_net_worth_entries_user_type
  ON public.net_worth_entries (user_id, entry_type, is_active);

-- net_worth_entries: workspace-scoped queries
CREATE INDEX idx_net_worth_entries_workspace
  ON public.net_worth_entries (workspace_id, is_active);

-- net_worth_snapshots: timeline queries ordered newest first
CREATE INDEX idx_net_worth_snapshots_user_date
  ON public.net_worth_snapshots (user_id, snapshot_date DESC);

-- detected_subscriptions: list active (non-dismissed) for a workspace member
CREATE INDEX idx_detected_subscriptions_workspace_user
  ON public.detected_subscriptions (workspace_id, user_id, is_dismissed);

-- detected_subscriptions: upcoming charge lookups
CREATE INDEX idx_detected_subscriptions_next_expected
  ON public.detected_subscriptions (user_id, next_expected_at)
  WHERE is_dismissed = FALSE;

-- =============================================================================
-- TRIGGER: auto-update updated_at on net_worth_entries
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Reuse set_updated_at if it already exists from a previous migration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_net_worth_entries_updated_at'
  ) THEN
    CREATE TRIGGER trg_net_worth_entries_updated_at
      BEFORE UPDATE ON public.net_worth_entries
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_detected_subscriptions_updated_at'
  ) THEN
    CREATE TRIGGER trg_detected_subscriptions_updated_at
      BEFORE UPDATE ON public.detected_subscriptions
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;
