-- =============================================================================
-- ExpenseFlow: Phase 9 Features
-- Migration: 00006_phase9_features
-- Description: Expense templates, mileage logs, recurring payment templates,
--              expense comments, and void support for expenses.
-- =============================================================================

-- =============================================================================
-- TABLE: expense_templates
-- =============================================================================

CREATE TABLE public.expense_templates (
  id               UUID         PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id     UUID         NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id          UUID         NOT NULL REFERENCES auth.users(id)        ON DELETE CASCADE,
  name             TEXT         NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description      TEXT,
  amount           DECIMAL(12,2),                   -- NULL = variable amount
  is_variable_amount BOOLEAN    NOT NULL DEFAULT FALSE,
  currency         TEXT         NOT NULL DEFAULT 'INR',
  category_id      UUID         REFERENCES public.categories(id)    ON DELETE SET NULL,
  subcategory_id   UUID         REFERENCES public.subcategories(id) ON DELETE SET NULL,
  type             public.expense_type NOT NULL DEFAULT 'expense',
  tags             TEXT[]       NOT NULL DEFAULT '{}',
  notes            TEXT,
  icon             TEXT,
  use_count        INTEGER      NOT NULL DEFAULT 0,
  last_used_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.expense_templates                       IS 'Saved expense templates for quick-add reuse';
COMMENT ON COLUMN public.expense_templates.amount               IS 'NULL when is_variable_amount is TRUE';
COMMENT ON COLUMN public.expense_templates.is_variable_amount   IS 'When TRUE, user must enter amount each time template is applied';
COMMENT ON COLUMN public.expense_templates.use_count            IS 'Incremented each time the template is applied';

-- =============================================================================
-- TABLE: mileage_logs
-- =============================================================================

CREATE TABLE public.mileage_logs (
  id             UUID          PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id   UUID          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id        UUID          NOT NULL REFERENCES auth.users(id)        ON DELETE CASCADE,
  from_location  TEXT          NOT NULL CHECK (char_length(from_location) BETWEEN 1 AND 255),
  to_location    TEXT          NOT NULL CHECK (char_length(to_location)   BETWEEN 1 AND 255),
  distance_km    DECIMAL(8,2)  NOT NULL CHECK (distance_km > 0),
  rate_per_km    DECIMAL(8,2)  NOT NULL DEFAULT 8.00 CHECK (rate_per_km >= 0),
  amount         DECIMAL(12,2) GENERATED ALWAYS AS (distance_km * rate_per_km) STORED,
  purpose        TEXT,
  trip_date      DATE          NOT NULL DEFAULT CURRENT_DATE,
  expense_id     UUID          REFERENCES public.expenses(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.mileage_logs              IS 'Vehicle mileage trips for reimbursement tracking';
COMMENT ON COLUMN public.mileage_logs.amount       IS 'Computed: distance_km × rate_per_km (stored for query performance)';
COMMENT ON COLUMN public.mileage_logs.expense_id   IS 'Optional link to the expense created from this mileage log';
COMMENT ON COLUMN public.mileage_logs.rate_per_km  IS 'Default 8.00 INR/km (Indian government reimbursement rate)';

-- =============================================================================
-- TABLE: recurring_payment_templates
-- =============================================================================

CREATE TABLE public.recurring_payment_templates (
  id                          UUID                     PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id                UUID                     NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id                     UUID                     NOT NULL REFERENCES auth.users(id)        ON DELETE CASCADE,
  contact_id                  UUID                     REFERENCES public.contacts(id) ON DELETE SET NULL,
  contact_name                TEXT                     NOT NULL CHECK (char_length(contact_name) BETWEEN 1 AND 100),
  direction                   public.payment_direction NOT NULL,
  amount                      DECIMAL(12,2)            NOT NULL CHECK (amount > 0),
  currency                    TEXT                     NOT NULL DEFAULT 'INR',
  description                 TEXT,
  recurrence_interval         TEXT                     NOT NULL
                                CHECK (recurrence_interval IN ('weekly','biweekly','monthly','quarterly','yearly')),
  start_date                  DATE                     NOT NULL DEFAULT CURRENT_DATE,
  end_date                    DATE,
  next_due_date               DATE                     NOT NULL,
  is_active                   BOOLEAN                  NOT NULL DEFAULT TRUE,
  auto_generate               BOOLEAN                  NOT NULL DEFAULT FALSE,
  auto_generate_days_before   INTEGER                  NOT NULL DEFAULT 3 CHECK (auto_generate_days_before >= 0),
  notes                       TEXT,
  created_at                  TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ              NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date > start_date)
);

COMMENT ON TABLE  public.recurring_payment_templates                          IS 'Templates for generating periodic pending payments automatically';
COMMENT ON COLUMN public.recurring_payment_templates.auto_generate            IS 'When TRUE, edge function auto-creates pending_payment before due date';
COMMENT ON COLUMN public.recurring_payment_templates.auto_generate_days_before IS 'How many days before next_due_date to generate the pending payment';
COMMENT ON COLUMN public.recurring_payment_templates.next_due_date            IS 'Recalculated after each generation based on recurrence_interval';

-- =============================================================================
-- TABLE: expense_comments
-- =============================================================================

CREATE TABLE public.expense_comments (
  id          UUID        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  expense_id  UUID        NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  content     TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  is_deleted  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.expense_comments            IS 'Threaded comments on expense entries';
COMMENT ON COLUMN public.expense_comments.is_deleted IS 'Soft delete — content retained for audit trail but hidden from UI';

-- =============================================================================
-- VOID SUPPORT: add columns to expenses
-- =============================================================================

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_voided   BOOLEAN     NOT NULL DEFAULT FALSE;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS voided_at   TIMESTAMPTZ;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS void_reason TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS voided_by   UUID REFERENCES auth.users(id);

COMMENT ON COLUMN public.expenses.is_voided   IS 'TRUE when the expense has been voided (kept for audit, excluded from totals)';
COMMENT ON COLUMN public.expenses.voided_at   IS 'Timestamp when the expense was voided';
COMMENT ON COLUMN public.expenses.void_reason IS 'Optional explanation for why the expense was voided';
COMMENT ON COLUMN public.expenses.voided_by   IS 'User who performed the void operation';

-- =============================================================================
-- ROW-LEVEL SECURITY: expense_templates
-- =============================================================================

ALTER TABLE public.expense_templates ENABLE ROW LEVEL SECURITY;

-- All workspace members can view templates
CREATE POLICY "workspace_members_view_templates" ON public.expense_templates
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

-- Any workspace member can create a template
CREATE POLICY "workspace_members_insert_templates" ON public.expense_templates
  FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id) AND user_id = auth.uid());

-- Only the template owner can update
CREATE POLICY "owner_update_templates" ON public.expense_templates
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Only the template owner can delete
CREATE POLICY "owner_delete_templates" ON public.expense_templates
  FOR DELETE
  USING (user_id = auth.uid());

-- =============================================================================
-- ROW-LEVEL SECURITY: mileage_logs
-- =============================================================================

ALTER TABLE public.mileage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_mileage_logs_select" ON public.mileage_logs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "insert_own_mileage" ON public.mileage_logs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_own_mileage" ON public.mileage_logs
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete_own_mileage" ON public.mileage_logs
  FOR DELETE
  USING (user_id = auth.uid());

-- =============================================================================
-- ROW-LEVEL SECURITY: recurring_payment_templates
-- =============================================================================

ALTER TABLE public.recurring_payment_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_recurring_select" ON public.recurring_payment_templates
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_insert_recurring" ON public.recurring_payment_templates
  FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id) AND user_id = auth.uid());

CREATE POLICY "owner_update_recurring" ON public.recurring_payment_templates
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner_delete_recurring" ON public.recurring_payment_templates
  FOR DELETE
  USING (user_id = auth.uid());

-- =============================================================================
-- ROW-LEVEL SECURITY: expense_comments
-- =============================================================================

ALTER TABLE public.expense_comments ENABLE ROW LEVEL SECURITY;

-- Workspace members can view non-deleted comments on expenses they can see
CREATE POLICY "view_expense_comments" ON public.expense_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.expenses e
      WHERE e.id = expense_id
        AND public.is_workspace_member(e.workspace_id)
    )
  );

-- Authenticated users can insert their own comments
CREATE POLICY "insert_own_comments" ON public.expense_comments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.expenses e
      WHERE e.id = expense_id
        AND public.is_workspace_member(e.workspace_id)
    )
  );

-- Only the comment author can update (e.g., soft-delete / edit)
CREATE POLICY "update_own_comments" ON public.expense_comments
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Only the comment author can hard-delete (use soft delete in practice)
CREATE POLICY "delete_own_comments" ON public.expense_comments
  FOR DELETE
  USING (user_id = auth.uid());

-- =============================================================================
-- INDEXES
-- =============================================================================

-- expense_templates
CREATE INDEX idx_templates_workspace_user
  ON public.expense_templates(workspace_id, user_id);
CREATE INDEX idx_templates_category
  ON public.expense_templates(category_id)
  WHERE category_id IS NOT NULL;
CREATE INDEX idx_templates_use_count
  ON public.expense_templates(workspace_id, use_count DESC);

-- mileage_logs
CREATE INDEX idx_mileage_workspace_date
  ON public.mileage_logs(workspace_id, trip_date DESC);
CREATE INDEX idx_mileage_user_date
  ON public.mileage_logs(user_id, trip_date DESC);
CREATE INDEX idx_mileage_expense_id
  ON public.mileage_logs(expense_id)
  WHERE expense_id IS NOT NULL;

-- recurring_payment_templates
CREATE INDEX idx_recurring_workspace
  ON public.recurring_payment_templates(workspace_id, is_active);
CREATE INDEX idx_recurring_next_due
  ON public.recurring_payment_templates(next_due_date)
  WHERE is_active = TRUE;
CREATE INDEX idx_recurring_user
  ON public.recurring_payment_templates(user_id);

-- expense_comments
CREATE INDEX idx_comments_expense
  ON public.expense_comments(expense_id, created_at);
CREATE INDEX idx_comments_user
  ON public.expense_comments(user_id);

-- expenses (void support)
CREATE INDEX idx_expenses_is_voided
  ON public.expenses(workspace_id, is_voided)
  WHERE is_voided = TRUE;

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

-- Re-use the existing set_updated_at() trigger function from migration 00001

CREATE TRIGGER set_expense_templates_updated_at
  BEFORE UPDATE ON public.expense_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_recurring_payment_templates_updated_at
  BEFORE UPDATE ON public.recurring_payment_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_expense_comments_updated_at
  BEFORE UPDATE ON public.expense_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
