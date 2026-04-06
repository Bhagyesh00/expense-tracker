import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client';

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

const PROFILE_QUERY_KEY = ['auth', 'profile'] as const;
const USER_SETTINGS_KEY = ['user-settings'] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  email: string;
  default_currency: string;
  locale: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

interface UserSettings {
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  pin_hash: string | null;
  pin_enabled: boolean;
  biometric_enabled: boolean;
  push_enabled: boolean;
  email_notifications: boolean;
  reminder_days_before: number;
  weekly_summary: boolean;
  created_at: string;
  updated_at: string;
}

interface UpdateProfileInput {
  fullName?: string;
  avatarUrl?: string;
  phone?: string;
  timezone?: string;
  locale?: string;
  defaultCurrency?: string;
}

interface UpdateSettingsInput {
  theme?: 'light' | 'dark' | 'system';
  pinEnabled?: boolean;
  biometricEnabled?: boolean;
  pushEnabled?: boolean;
  emailNotifications?: boolean;
  reminderDaysBefore?: number;
  weeklySummary?: boolean;
}

interface UseProfileOptions {
  client: TypedSupabaseClient;
  userId: string | undefined;
}

// ---------------------------------------------------------------------------
// useProfile — fetch the current user's profile from profiles table
// ---------------------------------------------------------------------------

export function useProfile({ client, userId }: UseProfileOptions) {
  return useQuery({
    queryKey: [...PROFILE_QUERY_KEY, userId],
    queryFn: async () => {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId!)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useUpdateProfile — update profile fields in profiles table + auth metadata
// ---------------------------------------------------------------------------

export function useUpdateProfile({ client, userId }: UseProfileOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      if (!userId) throw new Error('No authenticated user');

      // Build the profiles table update object
      const profileUpdate: Record<string, unknown> = {};
      if (input.fullName !== undefined) profileUpdate.full_name = input.fullName;
      if (input.avatarUrl !== undefined) profileUpdate.avatar_url = input.avatarUrl;
      if (input.phone !== undefined) profileUpdate.phone = input.phone;
      if (input.timezone !== undefined) profileUpdate.timezone = input.timezone;
      if (input.locale !== undefined) profileUpdate.locale = input.locale;
      if (input.defaultCurrency !== undefined) profileUpdate.default_currency = input.defaultCurrency;

      if (Object.keys(profileUpdate).length === 0) {
        throw new Error('No fields to update');
      }

      profileUpdate.updated_at = new Date().toISOString();

      const { data, error } = await client
        .from('profiles')
        .update(profileUpdate)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      // Also sync core fields to auth user metadata
      const authData: Record<string, string | undefined> = {};
      if (input.fullName !== undefined) authData.full_name = input.fullName;
      if (input.avatarUrl !== undefined) authData.avatar_url = input.avatarUrl;

      if (Object.keys(authData).length > 0) {
        await client.auth.updateUser({ data: authData });
      }

      return data as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// useUploadAvatar — upload file to Supabase Storage, update profile
// ---------------------------------------------------------------------------

export function useUploadAvatar({ client, userId }: UseProfileOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!userId) throw new Error('No authenticated user');

      const fileExt = file.name.split('.').pop() ?? 'jpg';
      const filePath = `${userId}/avatar.${fileExt}`;

      // Upload to avatars bucket
      const { error: uploadError } = await client.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = client.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl;

      // Update profile with new avatar URL
      const { data, error: updateError } = await client
        .from('profiles')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Sync to auth metadata
      await client.auth.updateUser({ data: { avatar_url: avatarUrl } });

      return data as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// useUserSettings — fetch user settings
// ---------------------------------------------------------------------------

export function useUserSettings({ client, userId }: UseProfileOptions) {
  return useQuery({
    queryKey: [...USER_SETTINGS_KEY, userId],
    queryFn: async () => {
      const { data, error } = await client
        .from('user_settings')
        .select('*')
        .eq('user_id', userId!)
        .single();

      if (error) throw error;
      return data as UserSettings;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useUpdateUserSettings — update user settings
// ---------------------------------------------------------------------------

export function useUpdateUserSettings({ client, userId }: UseProfileOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateSettingsInput) => {
      if (!userId) throw new Error('No authenticated user');

      const settingsUpdate: Record<string, unknown> = {};
      if (input.theme !== undefined) settingsUpdate.theme = input.theme;
      if (input.pinEnabled !== undefined) settingsUpdate.pin_enabled = input.pinEnabled;
      if (input.biometricEnabled !== undefined) settingsUpdate.biometric_enabled = input.biometricEnabled;
      if (input.pushEnabled !== undefined) settingsUpdate.push_enabled = input.pushEnabled;
      if (input.emailNotifications !== undefined) settingsUpdate.email_notifications = input.emailNotifications;
      if (input.reminderDaysBefore !== undefined) settingsUpdate.reminder_days_before = input.reminderDaysBefore;
      if (input.weeklySummary !== undefined) settingsUpdate.weekly_summary = input.weeklySummary;

      if (Object.keys(settingsUpdate).length === 0) {
        throw new Error('No fields to update');
      }

      settingsUpdate.updated_at = new Date().toISOString();

      const { data, error } = await client
        .from('user_settings')
        .update(settingsUpdate)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data as UserSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_SETTINGS_KEY });
    },
  });
}
