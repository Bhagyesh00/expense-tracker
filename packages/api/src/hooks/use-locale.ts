import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useMemo } from 'react';
import type { TypedSupabaseClient } from '../client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserLocale {
  user_id: string;
  locale: string;
  timezone: string;
  date_format: string;
  number_format: string;
  created_at: string;
  updated_at: string;
}

export interface AccessibilitySettings {
  user_id: string;
  high_contrast: boolean;
  reduced_motion: boolean;
  font_scale: number;
  screen_reader_hints: boolean;
  created_at: string;
  updated_at: string;
}

export interface TranslationOverride {
  id: string;
  workspace_id: string;
  locale: string;
  key: string;
  value: string;
  created_at: string;
}

export interface UpdateLocaleInput {
  locale?: string;
  timezone?: string;
  date_format?: string;
  number_format?: string;
}

export interface UpdateAccessibilityInput {
  high_contrast?: boolean;
  reduced_motion?: boolean;
  font_scale?: number;
  screen_reader_hints?: boolean;
}

export interface AvailableLocale {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const AVAILABLE_LOCALES: AvailableLocale[] = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
  { code: 'hi', name: 'Hindi', nativeName: '\u0939\u093f\u0928\u094d\u0926\u0940', direction: 'ltr' },
  { code: 'mr', name: 'Marathi', nativeName: '\u092e\u0930\u093e\u0920\u0940', direction: 'ltr' },
  { code: 'ta', name: 'Tamil', nativeName: '\u0ba4\u0bae\u0bbf\u0bb4\u0bcd', direction: 'ltr' },
  { code: 'te', name: 'Telugu', nativeName: '\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41', direction: 'ltr' },
  { code: 'kn', name: 'Kannada', nativeName: '\u0c95\u0ca8\u0ccd\u0ca8\u0ca1', direction: 'ltr' },
  { code: 'bn', name: 'Bengali', nativeName: '\u09ac\u09be\u0982\u09b2\u09be', direction: 'ltr' },
  { code: 'gu', name: 'Gujarati', nativeName: '\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0', direction: 'ltr' },
  { code: 'ml', name: 'Malayalam', nativeName: '\u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02', direction: 'ltr' },
  { code: 'pa', name: 'Punjabi', nativeName: '\u0a2a\u0a70\u0a1c\u0a3e\u0a2c\u0a40', direction: 'ltr' },
  { code: 'or', name: 'Odia', nativeName: '\u0b13\u0b21\u0b3c\u0b3f\u0b06', direction: 'ltr' },
  { code: 'ur', name: 'Urdu', nativeName: '\u0627\u0631\u062f\u0648', direction: 'rtl' },
];

export const DATE_FORMATS = [
  'DD/MM/YYYY',
  'MM/DD/YYYY',
  'YYYY-MM-DD',
  'DD-MM-YYYY',
  'DD.MM.YYYY',
  'D MMM YYYY',
  'MMM D, YYYY',
];

export const TIMEZONES_INDIA = [
  'Asia/Kolkata',
];

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const LOCALE_KEY = ['user-locale'] as const;
const ACCESSIBILITY_KEY = ['accessibility-settings'] as const;
const TRANSLATIONS_KEY = ['translation-overrides'] as const;

// ---------------------------------------------------------------------------
// Locale hooks
// ---------------------------------------------------------------------------

/** Get current user's locale settings. */
export function useLocale({ client }: { client: TypedSupabaseClient }) {
  return useQuery<UserLocale | null>({
    queryKey: LOCALE_KEY,
    queryFn: async () => {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) return null;

      const { data, error } = await client
        .from('user_locale')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data as unknown as UserLocale;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/** Update user's locale settings (upsert). */
export function useUpdateLocale({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<UserLocale, Error, UpdateLocaleInput>({
    mutationFn: async (input) => {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await client
        .from('user_locale')
        .upsert(
          {
            user_id: user.id,
            ...input,
          },
          { onConflict: 'user_id' },
        )
        .select()
        .single();

      if (error) throw error;
      return data as unknown as UserLocale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOCALE_KEY });
    },
  });
}

/** Get available locales list. */
export function useAvailableLocales() {
  return useMemo(() => AVAILABLE_LOCALES, []);
}

// ---------------------------------------------------------------------------
// Accessibility hooks
// ---------------------------------------------------------------------------

/** Get current user's accessibility settings. */
export function useAccessibilitySettings({ client }: { client: TypedSupabaseClient }) {
  return useQuery<AccessibilitySettings | null>({
    queryKey: ACCESSIBILITY_KEY,
    queryFn: async () => {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) return null;

      const { data, error } = await client
        .from('accessibility_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data as unknown as AccessibilitySettings;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/** Update user's accessibility settings (upsert). */
export function useUpdateAccessibility({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<AccessibilitySettings, Error, UpdateAccessibilityInput>({
    mutationFn: async (input) => {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await client
        .from('accessibility_settings')
        .upsert(
          {
            user_id: user.id,
            ...input,
          },
          { onConflict: 'user_id' },
        )
        .select()
        .single();

      if (error) throw error;
      return data as unknown as AccessibilitySettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCESSIBILITY_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// Translation override hooks
// ---------------------------------------------------------------------------

/** Get translation overrides for a workspace and locale. */
export function useTranslationOverrides({
  client,
  workspaceId,
  locale,
}: {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
  locale: string | undefined;
}) {
  return useQuery<TranslationOverride[]>({
    queryKey: [...TRANSLATIONS_KEY, workspaceId, locale],
    queryFn: async () => {
      let query = client
        .from('translation_overrides')
        .select('*')
        .eq('workspace_id', workspaceId!);

      if (locale) {
        query = query.eq('locale', locale);
      }

      const { data, error } = await query.order('key', { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as TranslationOverride[];
    },
    enabled: !!workspaceId,
    staleTime: 10 * 60 * 1000,
  });
}

/** Set a translation override (upsert by workspace + locale + key). */
export function useSetTranslationOverride({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<TranslationOverride, Error, {
    workspaceId: string;
    locale: string;
    key: string;
    value: string;
  }>({
    mutationFn: async ({ workspaceId, locale, key, value }) => {
      const { data, error } = await client
        .from('translation_overrides')
        .upsert(
          {
            workspace_id: workspaceId,
            locale,
            key,
            value,
          },
          { onConflict: 'workspace_id,locale,key' },
        )
        .select()
        .single();

      if (error) throw error;
      return data as unknown as TranslationOverride;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...TRANSLATIONS_KEY, workspaceId] });
    },
  });
}

/** Delete a translation override. */
export function useDeleteTranslationOverride({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; workspaceId: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await client
        .from('translation_overrides')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...TRANSLATIONS_KEY, workspaceId] });
    },
  });
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

/**
 * Format a number according to the user's locale settings.
 */
export function formatNumber(value: number, locale: string = 'en-IN', currency?: string): string {
  if (currency) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a date according to a format string.
 * Supports DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, D MMM YYYY, MMM D, YYYY
 */
export function formatDate(date: Date | string, format: string = 'DD/MM/YYYY', locale: string = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return String(date);

  const day = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();

  const pad = (n: number) => n.toString().padStart(2, '0');

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  switch (format) {
    case 'DD/MM/YYYY':
      return `${pad(day)}/${pad(month + 1)}/${year}`;
    case 'MM/DD/YYYY':
      return `${pad(month + 1)}/${pad(day)}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${pad(month + 1)}-${pad(day)}`;
    case 'DD-MM-YYYY':
      return `${pad(day)}-${pad(month + 1)}-${year}`;
    case 'DD.MM.YYYY':
      return `${pad(day)}.${pad(month + 1)}.${year}`;
    case 'D MMM YYYY':
      return `${day} ${monthNames[month]} ${year}`;
    case 'MMM D, YYYY':
      return `${monthNames[month]} ${day}, ${year}`;
    default:
      return d.toLocaleDateString(locale);
  }
}
