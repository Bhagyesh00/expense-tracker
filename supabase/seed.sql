-- =============================================================================
-- ExpenseFlow: Seed Data
-- Default system categories (workspace_id = NULL, is_system = true)
-- =============================================================================

INSERT INTO public.categories (workspace_id, name, icon, color, type, is_system, sort_order)
VALUES
    -- Expense categories
    (NULL, 'Food & Dining',     'utensils',        '#ef4444', 'expense', true,  1),
    (NULL, 'Transport',         'car',             '#f97316', 'expense', true,  2),
    (NULL, 'Shopping',          'shopping-bag',    '#eab308', 'expense', true,  3),
    (NULL, 'Bills & Utilities', 'receipt',         '#22c55e', 'expense', true,  4),
    (NULL, 'Entertainment',     'film',            '#3b82f6', 'expense', true,  5),
    (NULL, 'Health',            'heart-pulse',     '#ec4899', 'expense', true,  6),
    (NULL, 'Education',         'graduation-cap',  '#8b5cf6', 'expense', true,  7),
    (NULL, 'Groceries',         'apple',           '#14b8a6', 'expense', true,  8),
    (NULL, 'Rent',              'home',            '#6366f1', 'expense', true,  9),
    (NULL, 'Travel',            'plane',           '#06b6d4', 'expense', true, 10),
    (NULL, 'Personal Care',     'smile',           '#f43f5e', 'expense', true, 11),
    (NULL, 'Gifts & Donations', 'gift',            '#a855f7', 'expense', true, 12),
    (NULL, 'Investments',       'trending-up',     '#10b981', 'expense', true, 13),
    (NULL, 'Other',             'circle-dot',      '#64748b', 'expense', true, 14),

    -- Income categories
    (NULL, 'Salary',            'briefcase',       '#22c55e', 'income',  true, 1),
    (NULL, 'Freelance',         'laptop',          '#3b82f6', 'income',  true, 2),
    (NULL, 'Investment Return', 'trending-up',     '#10b981', 'income',  true, 3),
    (NULL, 'Gift Received',     'gift',            '#a855f7', 'income',  true, 4),
    (NULL, 'Other Income',      'circle-dot',      '#64748b', 'income',  true, 5);
