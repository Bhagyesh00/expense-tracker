-- =============================================================================
-- ExpenseFlow: Phase 14 — Platform (i18n, Accessibility)
-- Migration: 00011_platform
-- Description: User locale settings, translation overrides, accessibility
-- =============================================================================

-- =============================================================================
-- TABLE: user_locale
-- Per-user locale and formatting preferences
-- =============================================================================

CREATE TABLE public.user_locale (
  user_id       UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  locale        TEXT          NOT NULL DEFAULT 'en',
  timezone      TEXT          NOT NULL DEFAULT 'Asia/Kolkata',
  date_format   TEXT          NOT NULL DEFAULT 'DD/MM/YYYY',
  number_format TEXT          NOT NULL DEFAULT 'en-IN',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.user_locale              IS 'Per-user locale, timezone, and formatting preferences';
COMMENT ON COLUMN public.user_locale.locale       IS 'BCP 47 locale tag (e.g. en, hi, ta, mr)';
COMMENT ON COLUMN public.user_locale.date_format  IS 'Preferred date display format string';
COMMENT ON COLUMN public.user_locale.number_format IS 'Intl.NumberFormat locale string for number formatting';

-- =============================================================================
-- TABLE: translation_overrides
-- Custom workspace-level translation overrides
-- =============================================================================

CREATE TABLE public.translation_overrides (
  id           UUID          PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id UUID          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  locale       TEXT          NOT NULL CHECK (char_length(locale) BETWEEN 2 AND 10),
  key          TEXT          NOT NULL CHECK (char_length(key) BETWEEN 1 AND 200),
  value        TEXT          NOT NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, locale, key)
);

COMMENT ON TABLE  public.translation_overrides      IS 'Custom per-workspace translation overrides';
COMMENT ON COLUMN public.translation_overrides.key  IS 'Dot-separated translation key (e.g. expenses.title)';
COMMENT ON COLUMN public.translation_overrides.value IS 'Custom translated string value';

-- =============================================================================
-- TABLE: accessibility_settings
-- Per-user accessibility preferences
-- =============================================================================

CREATE TABLE public.accessibility_settings (
  user_id             UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  high_contrast       BOOLEAN       NOT NULL DEFAULT FALSE,
  reduced_motion      BOOLEAN       NOT NULL DEFAULT FALSE,
  font_scale          DECIMAL(3,2)  NOT NULL DEFAULT 1.00 CHECK (font_scale BETWEEN 0.5 AND 3.0),
  screen_reader_hints BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.accessibility_settings                  IS 'Per-user accessibility preferences';
COMMENT ON COLUMN public.accessibility_settings.font_scale       IS 'Font scale multiplier (1.0 = default, 1.5 = 150%)';
COMMENT ON COLUMN public.accessibility_settings.screen_reader_hints IS 'Enable additional ARIA hints for screen readers';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.user_locale ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessibility_settings ENABLE ROW LEVEL SECURITY;

-- User locale: users manage their own
CREATE POLICY "user_locale_select" ON public.user_locale
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_locale_insert" ON public.user_locale
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_locale_update" ON public.user_locale
  FOR UPDATE USING (user_id = auth.uid());

-- Translation overrides: workspace members can read, admins can manage
CREATE POLICY "translation_overrides_select" ON public.translation_overrides
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = translation_overrides.workspace_id AND wm.user_id = auth.uid())
  );
CREATE POLICY "translation_overrides_insert" ON public.translation_overrides
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = translation_overrides.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );
CREATE POLICY "translation_overrides_update" ON public.translation_overrides
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = translation_overrides.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );
CREATE POLICY "translation_overrides_delete" ON public.translation_overrides
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = translation_overrides.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );

-- Accessibility settings: users manage their own
CREATE POLICY "accessibility_settings_select" ON public.accessibility_settings
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "accessibility_settings_insert" ON public.accessibility_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "accessibility_settings_update" ON public.accessibility_settings
  FOR UPDATE USING (user_id = auth.uid());

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_translation_overrides_workspace ON public.translation_overrides (workspace_id, locale);
CREATE INDEX idx_translation_overrides_lookup ON public.translation_overrides (workspace_id, locale, key);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_locale_updated_at') THEN
    CREATE TRIGGER trg_user_locale_updated_at
      BEFORE UPDATE ON public.user_locale
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_accessibility_settings_updated_at') THEN
    CREATE TRIGGER trg_accessibility_settings_updated_at
      BEFORE UPDATE ON public.accessibility_settings
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;
