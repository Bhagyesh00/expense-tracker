-- =============================================================================
-- ExpenseFlow: Initial Database Schema
-- Migration: 00001_initial_schema
-- Description: Complete PostgreSQL schema for ExpenseFlow expense tracker
-- =============================================================================

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto"  WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm"   WITH SCHEMA public;

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE public.workspace_role       AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE public.expense_type         AS ENUM ('expense', 'income');
CREATE TYPE public.payment_direction    AS ENUM ('give', 'receive');
CREATE TYPE public.payment_status       AS ENUM ('pending', 'partial', 'settled', 'overdue', 'cancelled');
CREATE TYPE public.recurrence_interval  AS ENUM ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE public.notification_type    AS ENUM ('payment_reminder', 'budget_alert', 'overdue_payment', 'workspace_invite', 'system');
CREATE TYPE public.budget_period        AS ENUM ('weekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE public.split_method         AS ENUM ('equal', 'percentage', 'exact');

-- =============================================================================
-- TABLE 1: profiles
-- =============================================================================

CREATE TABLE public.profiles (
    id               UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name        TEXT,
    avatar_url       TEXT,
    phone            TEXT,
    default_currency TEXT        NOT NULL DEFAULT 'INR',
    locale           TEXT        NOT NULL DEFAULT 'en-IN',
    timezone         TEXT        NOT NULL DEFAULT 'Asia/Kolkata',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.profiles              IS 'Extended user profile linked 1-to-1 with auth.users';
COMMENT ON COLUMN public.profiles.id           IS 'Matches auth.users.id — single source of identity';
COMMENT ON COLUMN public.profiles.default_currency IS 'ISO 4217 currency code used as default for new expenses';

-- =============================================================================
-- TABLE 2: user_settings
-- =============================================================================

CREATE TABLE public.user_settings (
    user_id             UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    theme               TEXT        NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    pin_hash            TEXT,
    pin_enabled         BOOLEAN     NOT NULL DEFAULT false,
    biometric_enabled   BOOLEAN     NOT NULL DEFAULT false,
    push_enabled        BOOLEAN     NOT NULL DEFAULT true,
    email_notifications BOOLEAN     NOT NULL DEFAULT true,
    reminder_days_before INTEGER    NOT NULL DEFAULT 3 CHECK (reminder_days_before >= 0 AND reminder_days_before <= 30),
    weekly_summary      BOOLEAN     NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.user_settings                    IS 'Per-user application settings and preferences';
COMMENT ON COLUMN public.user_settings.pin_hash           IS 'bcrypt hash of the optional app lock PIN';
COMMENT ON COLUMN public.user_settings.reminder_days_before IS 'How many days before due date to send payment reminders';

-- =============================================================================
-- TABLE 3: workspaces
-- =============================================================================

CREATE TABLE public.workspaces (
    id               UUID        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name             TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
    slug             TEXT        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
    owner_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    default_currency TEXT        NOT NULL DEFAULT 'INR',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.workspaces         IS 'Shared workspace for group expense tracking';
COMMENT ON COLUMN public.workspaces.slug    IS 'URL-safe unique identifier for the workspace';

CREATE INDEX idx_workspaces_owner_id ON public.workspaces(owner_id);

-- =============================================================================
-- TABLE 4: workspace_members
-- =============================================================================

CREATE TABLE public.workspace_members (
    workspace_id UUID           NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id      UUID           NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,
    role         workspace_role NOT NULL DEFAULT 'member',
    joined_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    PRIMARY KEY (workspace_id, user_id)
);

COMMENT ON TABLE public.workspace_members IS 'Many-to-many relationship between users and workspaces with role';

CREATE INDEX idx_workspace_members_user_id ON public.workspace_members(user_id);

-- =============================================================================
-- TABLE 5: categories
-- =============================================================================

CREATE TABLE public.categories (
    id           UUID         PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    workspace_id UUID         REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name         TEXT         NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
    icon         TEXT         NOT NULL DEFAULT 'circle-dot',
    color        TEXT         NOT NULL DEFAULT '#64748b' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
    type         expense_type NOT NULL DEFAULT 'expense',
    is_system    BOOLEAN      NOT NULL DEFAULT false,
    sort_order   INTEGER      NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, name, type)
);

COMMENT ON TABLE  public.categories              IS 'Expense/income categories. workspace_id NULL = system default';
COMMENT ON COLUMN public.categories.workspace_id IS 'NULL for system-wide default categories';
COMMENT ON COLUMN public.categories.is_system    IS 'True for built-in categories that cannot be deleted';

CREATE INDEX idx_categories_workspace_id ON public.categories(workspace_id);
CREATE INDEX idx_categories_type         ON public.categories(type);

-- =============================================================================
-- TABLE 6: subcategories
-- =============================================================================

CREATE TABLE public.subcategories (
    id          UUID        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    category_id UUID        NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
    icon        TEXT,
    sort_order  INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (category_id, name)
);

COMMENT ON TABLE public.subcategories IS 'Optional second-level categories under a parent category';

CREATE INDEX idx_subcategories_category_id ON public.subcategories(category_id);

-- =============================================================================
-- TABLE 7: contacts
-- =============================================================================

CREATE TABLE public.contacts (
    id             UUID        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    workspace_id   UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id        UUID        NOT NULL REFERENCES auth.users(id)        ON DELETE CASCADE,
    name           TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
    phone          TEXT,
    email          TEXT,
    upi_id         TEXT,
    avatar_url     TEXT,
    notes          TEXT,
    linked_user_id UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.contacts               IS 'People you track payments with inside a workspace';
COMMENT ON COLUMN public.contacts.linked_user_id IS 'If the contact is also an app user, link their auth.users id';

CREATE INDEX idx_contacts_workspace_id   ON public.contacts(workspace_id);
CREATE INDEX idx_contacts_user_id        ON public.contacts(user_id);
CREATE INDEX idx_contacts_linked_user_id ON public.contacts(linked_user_id) WHERE linked_user_id IS NOT NULL;
CREATE INDEX idx_contacts_name_trgm      ON public.contacts USING gin (name gin_trgm_ops);

-- =============================================================================
-- TABLE 8: expenses
-- =============================================================================

CREATE TABLE public.expenses (
    id                   UUID               PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    workspace_id         UUID               NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id              UUID               NOT NULL REFERENCES auth.users(id)        ON DELETE CASCADE,
    type                 expense_type       NOT NULL DEFAULT 'expense',
    amount               DECIMAL(15,2)      NOT NULL CHECK (amount > 0),
    currency             TEXT               NOT NULL DEFAULT 'INR',
    amount_inr           DECIMAL(15,2),
    exchange_rate        DECIMAL(12,6),
    category_id          UUID               REFERENCES public.categories(id)    ON DELETE SET NULL,
    subcategory_id       UUID               REFERENCES public.subcategories(id) ON DELETE SET NULL,
    description          TEXT               NOT NULL CHECK (char_length(description) BETWEEN 1 AND 500),
    notes                TEXT,
    receipt_url          TEXT,
    receipt_ocr_data     JSONB,
    location             TEXT,
    latitude             DECIMAL(10,7),
    longitude            DECIMAL(10,7),
    expense_date         DATE               NOT NULL DEFAULT CURRENT_DATE,
    tags                 TEXT[]             DEFAULT '{}',
    is_recurring         BOOLEAN            NOT NULL DEFAULT false,
    recurrence_interval  recurrence_interval,
    recurrence_end_date  DATE,
    parent_recurring_id  UUID               REFERENCES public.expenses(id) ON DELETE SET NULL,
    is_split             BOOLEAN            NOT NULL DEFAULT false,
    split_group_id       UUID,
    split_method         split_method,
    created_at           TIMESTAMPTZ        NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ        NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ,

    CONSTRAINT chk_recurring_has_interval CHECK (
        (is_recurring = false) OR (recurrence_interval IS NOT NULL)
    ),
    CONSTRAINT chk_split_has_method CHECK (
        (is_split = false) OR (split_method IS NOT NULL)
    ),
    CONSTRAINT chk_lat_lng_together CHECK (
        (latitude IS NULL AND longitude IS NULL) OR
        (latitude IS NOT NULL AND longitude IS NOT NULL)
    )
);

COMMENT ON TABLE  public.expenses                   IS 'Core expense and income transactions';
COMMENT ON COLUMN public.expenses.amount_inr        IS 'Amount converted to INR for consistent reporting';
COMMENT ON COLUMN public.expenses.receipt_ocr_data  IS 'Structured data extracted from receipt by OCR';
COMMENT ON COLUMN public.expenses.deleted_at        IS 'Soft delete timestamp — non-null means deleted';
COMMENT ON COLUMN public.expenses.parent_recurring_id IS 'Points to the template expense for recurring series';

CREATE INDEX idx_expenses_workspace_id     ON public.expenses(workspace_id);
CREATE INDEX idx_expenses_user_id          ON public.expenses(user_id);
CREATE INDEX idx_expenses_category_id      ON public.expenses(category_id);
CREATE INDEX idx_expenses_subcategory_id   ON public.expenses(subcategory_id) WHERE subcategory_id IS NOT NULL;
CREATE INDEX idx_expenses_expense_date     ON public.expenses(expense_date DESC);
CREATE INDEX idx_expenses_type             ON public.expenses(type);
CREATE INDEX idx_expenses_deleted_at       ON public.expenses(deleted_at)      WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_recurring        ON public.expenses(parent_recurring_id) WHERE parent_recurring_id IS NOT NULL;
CREATE INDEX idx_expenses_split_group      ON public.expenses(split_group_id)  WHERE split_group_id IS NOT NULL;
CREATE INDEX idx_expenses_tags             ON public.expenses USING gin (tags);
CREATE INDEX idx_expenses_description_trgm ON public.expenses USING gin (description gin_trgm_ops);
CREATE INDEX idx_expenses_ws_date          ON public.expenses(workspace_id, expense_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_ws_type_date     ON public.expenses(workspace_id, type, expense_date DESC) WHERE deleted_at IS NULL;

-- =============================================================================
-- TABLE 9: expense_history
-- =============================================================================

CREATE TABLE public.expense_history (
    id         UUID        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    expense_id UUID        NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
    changes    JSONB       NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.expense_history         IS 'Audit trail of changes to expenses';
COMMENT ON COLUMN public.expense_history.changes IS 'JSONB diff: { field: { old: ..., new: ... } }';

CREATE INDEX idx_expense_history_expense_id ON public.expense_history(expense_id);
CREATE INDEX idx_expense_history_user_id    ON public.expense_history(user_id);

-- =============================================================================
-- TABLE 10: expense_splits
-- =============================================================================

CREATE TABLE public.expense_splits (
    id         UUID          PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    expense_id UUID          NOT NULL REFERENCES public.expenses(id)  ON DELETE CASCADE,
    user_id    UUID          REFERENCES auth.users(id)                ON DELETE SET NULL,
    contact_id UUID          REFERENCES public.contacts(id)           ON DELETE SET NULL,
    amount     DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
    percentage DECIMAL(5,2)  CHECK (percentage >= 0 AND percentage <= 100),
    is_paid    BOOLEAN       NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT chk_split_has_party CHECK (user_id IS NOT NULL OR contact_id IS NOT NULL)
);

COMMENT ON TABLE  public.expense_splits            IS 'Individual split portions of a shared expense';
COMMENT ON COLUMN public.expense_splits.user_id    IS 'App user involved in the split (nullable if external contact)';
COMMENT ON COLUMN public.expense_splits.contact_id IS 'External contact involved in the split (nullable if app user)';

CREATE INDEX idx_expense_splits_expense_id ON public.expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user_id    ON public.expense_splits(user_id)    WHERE user_id IS NOT NULL;
CREATE INDEX idx_expense_splits_contact_id ON public.expense_splits(contact_id) WHERE contact_id IS NOT NULL;

-- =============================================================================
-- TABLE 11: pending_payments
-- =============================================================================

CREATE TABLE public.pending_payments (
    id           UUID              PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    workspace_id UUID              NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id      UUID              NOT NULL REFERENCES auth.users(id)        ON DELETE CASCADE,
    contact_id   UUID              NOT NULL REFERENCES public.contacts(id)   ON DELETE CASCADE,
    direction    payment_direction NOT NULL,
    total_amount DECIMAL(15,2)     NOT NULL CHECK (total_amount > 0),
    paid_amount  DECIMAL(15,2)     NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    currency     TEXT              NOT NULL DEFAULT 'INR',
    status       payment_status    NOT NULL DEFAULT 'pending',
    description  TEXT,
    notes        TEXT,
    due_date     DATE,
    created_at   TIMESTAMPTZ       NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ       NOT NULL DEFAULT now(),
    settled_at   TIMESTAMPTZ,

    CONSTRAINT chk_paid_lte_total CHECK (paid_amount <= total_amount)
);

COMMENT ON TABLE  public.pending_payments            IS 'Tracks money owed to or from contacts';
COMMENT ON COLUMN public.pending_payments.direction  IS 'give = you owe them, receive = they owe you';
COMMENT ON COLUMN public.pending_payments.settled_at IS 'Timestamp when the payment was fully settled';

CREATE INDEX idx_pending_payments_workspace_id ON public.pending_payments(workspace_id);
CREATE INDEX idx_pending_payments_user_id      ON public.pending_payments(user_id);
CREATE INDEX idx_pending_payments_contact_id   ON public.pending_payments(contact_id);
CREATE INDEX idx_pending_payments_status       ON public.pending_payments(status) WHERE status NOT IN ('settled', 'cancelled');
CREATE INDEX idx_pending_payments_due_date     ON public.pending_payments(due_date) WHERE status IN ('pending', 'partial', 'overdue');

-- =============================================================================
-- TABLE 12: payment_history
-- =============================================================================

CREATE TABLE public.payment_history (
    id                UUID          PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    pending_payment_id UUID         NOT NULL REFERENCES public.pending_payments(id) ON DELETE CASCADE,
    amount            DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    payment_method    TEXT,
    proof_url         TEXT,
    notes             TEXT,
    paid_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.payment_history              IS 'Individual payment records against a pending payment';
COMMENT ON COLUMN public.payment_history.proof_url    IS 'URL to uploaded payment screenshot or receipt';

CREATE INDEX idx_payment_history_pending_id ON public.payment_history(pending_payment_id);
CREATE INDEX idx_payment_history_paid_at    ON public.payment_history(paid_at DESC);

-- =============================================================================
-- TABLE 13: budgets
-- =============================================================================

CREATE TABLE public.budgets (
    id                    UUID          PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    workspace_id          UUID          NOT NULL REFERENCES public.workspaces(id)  ON DELETE CASCADE,
    user_id               UUID          NOT NULL REFERENCES auth.users(id)         ON DELETE CASCADE,
    category_id           UUID          REFERENCES public.categories(id)           ON DELETE CASCADE,
    amount                DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency              TEXT          NOT NULL DEFAULT 'INR',
    period                budget_period NOT NULL DEFAULT 'monthly',
    alert_threshold_percent INTEGER     NOT NULL DEFAULT 80 CHECK (alert_threshold_percent BETWEEN 1 AND 100),
    is_active             BOOLEAN       NOT NULL DEFAULT true,
    start_date            DATE          NOT NULL DEFAULT CURRENT_DATE,
    end_date              DATE,
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT chk_budget_date_range CHECK (end_date IS NULL OR end_date > start_date)
);

COMMENT ON TABLE  public.budgets               IS 'Spending budgets per category or total';
COMMENT ON COLUMN public.budgets.category_id   IS 'NULL = total spending budget across all categories';

CREATE INDEX idx_budgets_workspace_id ON public.budgets(workspace_id);
CREATE INDEX idx_budgets_user_id      ON public.budgets(user_id);
CREATE INDEX idx_budgets_category_id  ON public.budgets(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_budgets_active       ON public.budgets(is_active) WHERE is_active = true;

-- =============================================================================
-- TABLE 14: savings_goals
-- =============================================================================

CREATE TABLE public.savings_goals (
    id             UUID          PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    workspace_id   UUID          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id        UUID          NOT NULL REFERENCES auth.users(id)        ON DELETE CASCADE,
    name           TEXT          NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
    target_amount  DECIMAL(15,2) NOT NULL CHECK (target_amount > 0),
    current_amount DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
    currency       TEXT          NOT NULL DEFAULT 'INR',
    target_date    DATE,
    icon           TEXT          DEFAULT 'piggy-bank',
    color          TEXT          DEFAULT '#10b981' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
    is_completed   BOOLEAN       NOT NULL DEFAULT false,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.savings_goals IS 'User savings goals with progress tracking';

CREATE INDEX idx_savings_goals_workspace_id ON public.savings_goals(workspace_id);
CREATE INDEX idx_savings_goals_user_id      ON public.savings_goals(user_id);
CREATE INDEX idx_savings_goals_active       ON public.savings_goals(is_completed) WHERE is_completed = false;

-- =============================================================================
-- TABLE 15: notifications
-- =============================================================================

CREATE TABLE public.notifications (
    id           UUID              PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id      UUID              NOT NULL REFERENCES auth.users(id)        ON DELETE CASCADE,
    workspace_id UUID              REFERENCES public.workspaces(id)          ON DELETE CASCADE,
    type         notification_type NOT NULL,
    title        TEXT              NOT NULL,
    body         TEXT              NOT NULL,
    data         JSONB             DEFAULT '{}',
    is_read      BOOLEAN           NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ       NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.notifications      IS 'In-app notification feed for users';
COMMENT ON COLUMN public.notifications.data IS 'Arbitrary payload: { expense_id, payment_id, workspace_id, ... }';

CREATE INDEX idx_notifications_user_id    ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread     ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- =============================================================================
-- TABLE 16: push_tokens
-- =============================================================================

CREATE TABLE public.push_tokens (
    id         UUID        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token      TEXT        NOT NULL UNIQUE,
    platform   TEXT        NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.push_tokens IS 'Expo / FCM / APNs push notification tokens';

CREATE INDEX idx_push_tokens_user_id ON public.push_tokens(user_id);

-- =============================================================================
-- TABLE 17: audit_log
-- =============================================================================

CREATE TABLE public.audit_log (
    id           UUID        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    workspace_id UUID        REFERENCES public.workspaces(id) ON DELETE SET NULL,
    user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action       TEXT        NOT NULL,
    entity_type  TEXT        NOT NULL,
    entity_id    UUID,
    metadata     JSONB       DEFAULT '{}',
    ip_address   INET,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.audit_log             IS 'Immutable audit trail of significant actions';
COMMENT ON COLUMN public.audit_log.action      IS 'e.g. create, update, delete, settle, invite';
COMMENT ON COLUMN public.audit_log.entity_type IS 'e.g. expense, payment, workspace, budget';

CREATE INDEX idx_audit_log_workspace_id ON public.audit_log(workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX idx_audit_log_user_id      ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_entity       ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at   ON public.audit_log(created_at DESC);

-- =============================================================================
-- TABLE 18: currency_rates
-- =============================================================================

CREATE TABLE public.currency_rates (
    base_currency   TEXT           NOT NULL,
    target_currency TEXT           NOT NULL,
    rate            DECIMAL(12,6)  NOT NULL CHECK (rate > 0),
    fetched_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    PRIMARY KEY (base_currency, target_currency)
);

COMMENT ON TABLE public.currency_rates IS 'Cached exchange rates; refreshed periodically by edge function';

-- =============================================================================
-- TABLE 19: ai_cache
-- =============================================================================

CREATE TABLE public.ai_cache (
    id         UUID        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    cache_key  TEXT        NOT NULL UNIQUE,
    cache_type TEXT        NOT NULL,
    data       JSONB       NOT NULL DEFAULT '{}',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.ai_cache            IS 'Cache for AI-generated insights, forecasts, and categorization results';
COMMENT ON COLUMN public.ai_cache.cache_key  IS 'Deterministic key: e.g. insight:{user_id}:{period}';
COMMENT ON COLUMN public.ai_cache.cache_type IS 'e.g. insight, forecast, categorization, anomaly';

CREATE INDEX idx_ai_cache_type       ON public.ai_cache(cache_type);
CREATE INDEX idx_ai_cache_expires_at ON public.ai_cache(expires_at);

-- =============================================================================
-- HELPER FUNCTIONS FOR RLS
-- =============================================================================

-- Check if the current user is a member of the given workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.workspace_members
        WHERE workspace_id = ws_id
          AND user_id = auth.uid()
    );
$$;

COMMENT ON FUNCTION public.is_workspace_member IS 'Returns true if the current auth user is a member of the workspace';

-- Get the current user''s role in the given workspace
CREATE OR REPLACE FUNCTION public.get_workspace_role(ws_id UUID)
RETURNS workspace_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_workspace_role IS 'Returns the current auth user''s role in the workspace, or NULL if not a member';

-- =============================================================================
-- ROW LEVEL SECURITY — ENABLE ON ALL TABLES
-- =============================================================================

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_payments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_rates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_cache          ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES: profiles (own only)
-- =============================================================================

CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "profiles_insert_own"
    ON public.profiles FOR INSERT
    WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- =============================================================================
-- RLS POLICIES: user_settings (own only)
-- =============================================================================

CREATE POLICY "user_settings_select_own"
    ON public.user_settings FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "user_settings_insert_own"
    ON public.user_settings FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_settings_update_own"
    ON public.user_settings FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- RLS POLICIES: workspaces (member view, owner modify)
-- =============================================================================

CREATE POLICY "workspaces_select_member"
    ON public.workspaces FOR SELECT
    USING (public.is_workspace_member(id));

CREATE POLICY "workspaces_insert_authenticated"
    ON public.workspaces FOR INSERT
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_update_owner"
    ON public.workspaces FOR UPDATE
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_delete_owner"
    ON public.workspaces FOR DELETE
    USING (owner_id = auth.uid());

-- =============================================================================
-- RLS POLICIES: workspace_members
-- =============================================================================

CREATE POLICY "workspace_members_select"
    ON public.workspace_members FOR SELECT
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_members_insert_admin"
    ON public.workspace_members FOR INSERT
    WITH CHECK (
        public.get_workspace_role(workspace_id) IN ('owner', 'admin')
    );

CREATE POLICY "workspace_members_update_admin"
    ON public.workspace_members FOR UPDATE
    USING (
        public.get_workspace_role(workspace_id) IN ('owner', 'admin')
    );

CREATE POLICY "workspace_members_delete_admin_or_self"
    ON public.workspace_members FOR DELETE
    USING (
        public.get_workspace_role(workspace_id) IN ('owner', 'admin')
        OR user_id = auth.uid()
    );

-- =============================================================================
-- RLS POLICIES: categories (system readable by all authenticated)
-- =============================================================================

CREATE POLICY "categories_select_system_or_member"
    ON public.categories FOR SELECT
    USING (
        workspace_id IS NULL  -- system categories visible to all authenticated users
        OR public.is_workspace_member(workspace_id)
    );

CREATE POLICY "categories_insert_admin"
    ON public.categories FOR INSERT
    WITH CHECK (
        workspace_id IS NOT NULL
        AND public.get_workspace_role(workspace_id) IN ('owner', 'admin')
    );

CREATE POLICY "categories_update_admin"
    ON public.categories FOR UPDATE
    USING (
        workspace_id IS NOT NULL
        AND public.get_workspace_role(workspace_id) IN ('owner', 'admin')
    );

CREATE POLICY "categories_delete_admin"
    ON public.categories FOR DELETE
    USING (
        is_system = false
        AND workspace_id IS NOT NULL
        AND public.get_workspace_role(workspace_id) IN ('owner', 'admin')
    );

-- =============================================================================
-- RLS POLICIES: subcategories
-- =============================================================================

CREATE POLICY "subcategories_select"
    ON public.subcategories FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND (c.workspace_id IS NULL OR public.is_workspace_member(c.workspace_id))
        )
    );

CREATE POLICY "subcategories_insert"
    ON public.subcategories FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND c.workspace_id IS NOT NULL
              AND public.get_workspace_role(c.workspace_id) IN ('owner', 'admin')
        )
    );

CREATE POLICY "subcategories_update"
    ON public.subcategories FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND c.workspace_id IS NOT NULL
              AND public.get_workspace_role(c.workspace_id) IN ('owner', 'admin')
        )
    );

CREATE POLICY "subcategories_delete"
    ON public.subcategories FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id
              AND c.workspace_id IS NOT NULL
              AND public.get_workspace_role(c.workspace_id) IN ('owner', 'admin')
        )
    );

-- =============================================================================
-- RLS POLICIES: expenses (workspace member view, creator/admin modify)
-- =============================================================================

CREATE POLICY "expenses_select_member"
    ON public.expenses FOR SELECT
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "expenses_insert_member"
    ON public.expenses FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND public.is_workspace_member(workspace_id)
        AND public.get_workspace_role(workspace_id) != 'viewer'
    );

CREATE POLICY "expenses_update_creator_or_admin"
    ON public.expenses FOR UPDATE
    USING (
        user_id = auth.uid()
        OR public.get_workspace_role(workspace_id) IN ('owner', 'admin')
    )
    WITH CHECK (
        user_id = auth.uid()
        OR public.get_workspace_role(workspace_id) IN ('owner', 'admin')
    );

CREATE POLICY "expenses_delete_creator_or_admin"
    ON public.expenses FOR DELETE
    USING (
        user_id = auth.uid()
        OR public.get_workspace_role(workspace_id) IN ('owner', 'admin')
    );

-- =============================================================================
-- RLS POLICIES: expense_history
-- =============================================================================

CREATE POLICY "expense_history_select"
    ON public.expense_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.expenses e
            WHERE e.id = expense_id
              AND public.is_workspace_member(e.workspace_id)
        )
    );

CREATE POLICY "expense_history_insert"
    ON public.expense_history FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- RLS POLICIES: expense_splits
-- =============================================================================

CREATE POLICY "expense_splits_select"
    ON public.expense_splits FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.expenses e
            WHERE e.id = expense_id
              AND public.is_workspace_member(e.workspace_id)
        )
    );

CREATE POLICY "expense_splits_insert"
    ON public.expense_splits FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.expenses e
            WHERE e.id = expense_id
              AND (e.user_id = auth.uid() OR public.get_workspace_role(e.workspace_id) IN ('owner', 'admin'))
        )
    );

CREATE POLICY "expense_splits_update"
    ON public.expense_splits FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.expenses e
            WHERE e.id = expense_id
              AND (e.user_id = auth.uid() OR public.get_workspace_role(e.workspace_id) IN ('owner', 'admin'))
        )
    );

CREATE POLICY "expense_splits_delete"
    ON public.expense_splits FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.expenses e
            WHERE e.id = expense_id
              AND (e.user_id = auth.uid() OR public.get_workspace_role(e.workspace_id) IN ('owner', 'admin'))
        )
    );

-- =============================================================================
-- RLS POLICIES: contacts
-- =============================================================================

CREATE POLICY "contacts_select_member"
    ON public.contacts FOR SELECT
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "contacts_insert_member"
    ON public.contacts FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND public.is_workspace_member(workspace_id)
    );

CREATE POLICY "contacts_update_owner"
    ON public.contacts FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "contacts_delete_owner"
    ON public.contacts FOR DELETE
    USING (user_id = auth.uid());

-- =============================================================================
-- RLS POLICIES: pending_payments
-- =============================================================================

CREATE POLICY "pending_payments_select_member"
    ON public.pending_payments FOR SELECT
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "pending_payments_insert_member"
    ON public.pending_payments FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND public.is_workspace_member(workspace_id)
    );

CREATE POLICY "pending_payments_update_creator_or_admin"
    ON public.pending_payments FOR UPDATE
    USING (
        user_id = auth.uid()
        OR public.get_workspace_role(workspace_id) IN ('owner', 'admin')
    );

CREATE POLICY "pending_payments_delete_creator_or_admin"
    ON public.pending_payments FOR DELETE
    USING (
        user_id = auth.uid()
        OR public.get_workspace_role(workspace_id) IN ('owner', 'admin')
    );

-- =============================================================================
-- RLS POLICIES: payment_history
-- =============================================================================

CREATE POLICY "payment_history_select"
    ON public.payment_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.pending_payments pp
            WHERE pp.id = pending_payment_id
              AND public.is_workspace_member(pp.workspace_id)
        )
    );

CREATE POLICY "payment_history_insert"
    ON public.payment_history FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pending_payments pp
            WHERE pp.id = pending_payment_id
              AND (pp.user_id = auth.uid() OR public.get_workspace_role(pp.workspace_id) IN ('owner', 'admin'))
        )
    );

-- =============================================================================
-- RLS POLICIES: budgets
-- =============================================================================

CREATE POLICY "budgets_select_member"
    ON public.budgets FOR SELECT
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "budgets_insert_member"
    ON public.budgets FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND public.is_workspace_member(workspace_id)
    );

CREATE POLICY "budgets_update_own"
    ON public.budgets FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "budgets_delete_own"
    ON public.budgets FOR DELETE
    USING (user_id = auth.uid());

-- =============================================================================
-- RLS POLICIES: savings_goals
-- =============================================================================

CREATE POLICY "savings_goals_select_member"
    ON public.savings_goals FOR SELECT
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "savings_goals_insert_member"
    ON public.savings_goals FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND public.is_workspace_member(workspace_id)
    );

CREATE POLICY "savings_goals_update_own"
    ON public.savings_goals FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "savings_goals_delete_own"
    ON public.savings_goals FOR DELETE
    USING (user_id = auth.uid());

-- =============================================================================
-- RLS POLICIES: notifications (own only)
-- =============================================================================

CREATE POLICY "notifications_select_own"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_service"
    ON public.notifications FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid());

-- =============================================================================
-- RLS POLICIES: push_tokens (own only)
-- =============================================================================

CREATE POLICY "push_tokens_select_own"
    ON public.push_tokens FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "push_tokens_insert_own"
    ON public.push_tokens FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_tokens_delete_own"
    ON public.push_tokens FOR DELETE
    USING (user_id = auth.uid());

-- =============================================================================
-- RLS POLICIES: audit_log (read only for workspace members)
-- =============================================================================

CREATE POLICY "audit_log_select_member"
    ON public.audit_log FOR SELECT
    USING (
        workspace_id IS NULL AND user_id = auth.uid()
        OR public.is_workspace_member(workspace_id)
    );

-- Insert is allowed only via service role (triggers / edge functions)
-- No INSERT/UPDATE/DELETE policies for authenticated users

-- =============================================================================
-- RLS POLICIES: currency_rates (public read)
-- =============================================================================

CREATE POLICY "currency_rates_select_all"
    ON public.currency_rates FOR SELECT
    USING (true);

-- Write only via service role (edge function)

-- =============================================================================
-- RLS POLICIES: ai_cache (public read)
-- =============================================================================

CREATE POLICY "ai_cache_select_all"
    ON public.ai_cache FOR SELECT
    USING (true);

-- Write only via service role (edge function)

-- =============================================================================
-- TRIGGER FUNCTIONS
-- =============================================================================

-- 1. Auto-create profile + user_settings when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture', '')
    );

    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id);

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 2. Auto-create "Personal" workspace + membership when a profile is created
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ws_id UUID;
    ws_slug TEXT;
BEGIN
    -- Generate a unique slug from user id
    ws_slug := 'personal-' || replace(NEW.id::text, '-', '');

    INSERT INTO public.workspaces (name, slug, owner_id, default_currency)
    VALUES ('Personal', ws_slug, NEW.id, NEW.default_currency)
    RETURNING id INTO ws_id;

    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (ws_id, NEW.id, 'owner');

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_profile();

-- 3. Auto-update pending_payment status/paid_amount on payment_history INSERT
CREATE OR REPLACE FUNCTION public.update_pending_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total   DECIMAL(15,2);
    v_paid    DECIMAL(15,2);
    v_status  payment_status;
BEGIN
    -- Calculate new paid total
    SELECT COALESCE(SUM(amount), 0) INTO v_paid
    FROM public.payment_history
    WHERE pending_payment_id = NEW.pending_payment_id;

    -- Get the total amount
    SELECT total_amount INTO v_total
    FROM public.pending_payments
    WHERE id = NEW.pending_payment_id;

    -- Determine new status
    IF v_paid >= v_total THEN
        v_status := 'settled';
    ELSIF v_paid > 0 THEN
        v_status := 'partial';
    ELSE
        v_status := 'pending';
    END IF;

    -- Update the pending payment
    UPDATE public.pending_payments
    SET paid_amount = v_paid,
        status      = v_status,
        settled_at  = CASE WHEN v_status = 'settled' THEN now() ELSE NULL END,
        updated_at  = now()
    WHERE id = NEW.pending_payment_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_payment_history_insert
    AFTER INSERT ON public.payment_history
    FOR EACH ROW
    EXECUTE FUNCTION public.update_pending_on_payment();

-- 4. Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Apply updated_at trigger to all tables that have the column
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_workspaces_updated_at
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_contacts_updated_at
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_pending_payments_updated_at
    BEFORE UPDATE ON public.pending_payments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_budgets_updated_at
    BEFORE UPDATE ON public.budgets
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_savings_goals_updated_at
    BEFORE UPDATE ON public.savings_goals
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Mark overdue payments — called by pg_cron or edge function on a schedule
CREATE OR REPLACE FUNCTION public.mark_overdue_payments()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    affected INTEGER;
BEGIN
    UPDATE public.pending_payments
    SET status     = 'overdue',
        updated_at = now()
    WHERE status IN ('pending', 'partial')
      AND due_date IS NOT NULL
      AND due_date < CURRENT_DATE;

    GET DIAGNOSTICS affected = ROW_COUNT;
    RETURN affected;
END;
$$;

COMMENT ON FUNCTION public.mark_overdue_payments IS 'Flags pending/partial payments past due date as overdue. Call via pg_cron daily.';

-- =============================================================================
-- GRANTS — ensure service_role can bypass RLS for edge functions
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
