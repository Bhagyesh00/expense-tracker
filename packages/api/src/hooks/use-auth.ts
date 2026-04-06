import { useEffect, useCallback, useRef } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  Session,
  User,
  AuthError,
  AuthChangeEvent,
} from '@supabase/supabase-js';
import type { TypedSupabaseClient } from '../client';

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const AUTH_QUERY_KEY = ['auth', 'session'] as const;
export const PROFILE_QUERY_KEY = ['auth', 'profile'] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthErrorResult {
  code: string;
  message: string;
  status?: number;
}

interface ProfileUpdateData {
  fullName?: string;
  avatarUrl?: string;
  phone?: string;
  timezone?: string;
  defaultCurrency?: string;
}

interface UseAuthOptions {
  client: TypedSupabaseClient;
}

interface AuthMutationState {
  isLoading: boolean;
  error: AuthErrorResult | null;
}

export interface AuthState {
  /** Current authenticated user or null */
  user: User | null;
  /** Current session or null */
  session: Session | null;
  /** True while the initial session is being fetched */
  isLoading: boolean;
  /** Convenience boolean: true when session + user exist */
  isAuthenticated: boolean;

  // --- Sign-in methods ---
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;

  // --- Session management ---
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;

  // --- Password ---
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;

  // --- Profile (auth metadata + profiles table) ---
  updateProfile: (data: ProfileUpdateData) => Promise<void>;

  // --- Mutation states ---
  signInState: AuthMutationState;
  signUpState: AuthMutationState;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toAuthErrorResult(err: unknown): AuthErrorResult {
  if (err && typeof err === 'object' && 'message' in err) {
    const authErr = err as AuthError;
    return {
      code: authErr.name ?? 'AuthError',
      message: authErr.message,
      status: (authErr as unknown as { status?: number }).status,
    };
  }
  return { code: 'UNKNOWN', message: String(err) };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth({ client }: UseAuthOptions): AuthState {
  const queryClient = useQueryClient();
  const listenerRef = useRef<{ unsubscribe: () => void } | null>(null);

  // ── Session query ──────────────────────────────────────────────────────
  const {
    data: sessionData,
    isLoading,
  } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: true,
  });

  // ── Auth state change listener ─────────────────────────────────────────
  useEffect(() => {
    const { data } = client.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        queryClient.setQueryData(AUTH_QUERY_KEY, session);

        if (session?.user) {
          queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
        }

        // On sign-out clear all cached data
        if (event === 'SIGNED_OUT') {
          queryClient.clear();
        }

        // On token refresh just update the session
        if (event === 'TOKEN_REFRESHED') {
          queryClient.setQueryData(AUTH_QUERY_KEY, session);
        }
      },
    );

    listenerRef.current = data.subscription;

    return () => {
      listenerRef.current?.unsubscribe();
    };
  }, [client, queryClient]);

  // ── Sign-in with email / password ──────────────────────────────────────
  const signInEmailMutation = useMutation<void, AuthError, { email: string; password: string }>({
    mutationFn: async ({ email, password }) => {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
  });

  // ── Sign-up with email / password ──────────────────────────────────────
  const signUpEmailMutation = useMutation<
    void,
    AuthError,
    { email: string; password: string; fullName?: string }
  >({
    mutationFn: async ({ email, password, fullName }) => {
      const { error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) throw error;
    },
  });

  // ── OAuth: Google ──────────────────────────────────────────────────────
  const signInGoogleMutation = useMutation<void, AuthError>({
    mutationFn: async () => {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    },
  });

  // ── OAuth: Apple ───────────────────────────────────────────────────────
  const signInAppleMutation = useMutation<void, AuthError>({
    mutationFn: async () => {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      if (error) throw error;
    },
  });

  // ── OTP: Send ──────────────────────────────────────────────────────────
  const signInOtpMutation = useMutation<void, AuthError, { phone: string }>({
    mutationFn: async ({ phone }) => {
      const { error } = await client.auth.signInWithOtp({ phone });
      if (error) throw error;
    },
  });

  // ── OTP: Verify ────────────────────────────────────────────────────────
  const verifyOtpMutation = useMutation<
    void,
    AuthError,
    { phone: string; token: string }
  >({
    mutationFn: async ({ phone, token }) => {
      const { error } = await client.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });
      if (error) throw error;
    },
  });

  // ── Magic link ─────────────────────────────────────────────────────────
  const signInMagicLinkMutation = useMutation<void, AuthError, { email: string }>({
    mutationFn: async ({ email }) => {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      if (error) throw error;
    },
  });

  // ── Sign out ───────────────────────────────────────────────────────────
  const signOutMutation = useMutation<void, AuthError>({
    mutationFn: async () => {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear();
    },
  });

  // ── Reset password (send email) ────────────────────────────────────────
  const resetPasswordMutation = useMutation<void, AuthError, { email: string }>({
    mutationFn: async ({ email }) => {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : undefined,
      });
      if (error) throw error;
    },
  });

  // ── Update password ────────────────────────────────────────────────────
  const updatePasswordMutation = useMutation<void, AuthError, { newPassword: string }>({
    mutationFn: async ({ newPassword }) => {
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
  });

  // ── Refresh session ────────────────────────────────────────────────────
  const refreshSessionMutation = useMutation<void, AuthError>({
    mutationFn: async () => {
      const { error } = await client.auth.refreshSession();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    },
  });

  // ── Update profile (auth metadata + profiles table) ────────────────────
  const updateProfileMutation = useMutation<void, Error, ProfileUpdateData>({
    mutationFn: async (data) => {
      // 1. Update auth user metadata
      const authData: Record<string, string | undefined> = {};
      if (data.fullName !== undefined) authData.full_name = data.fullName;
      if (data.avatarUrl !== undefined) authData.avatar_url = data.avatarUrl;
      if (data.phone !== undefined) authData.phone = data.phone;

      if (Object.keys(authData).length > 0) {
        const { error: authError } = await client.auth.updateUser({ data: authData });
        if (authError) throw authError;
      }

      // 2. Update profiles table
      const user = sessionData?.user;
      if (!user) throw new Error('No authenticated user');

      const profileData: Record<string, string | undefined> = {};
      if (data.fullName !== undefined) profileData.full_name = data.fullName;
      if (data.avatarUrl !== undefined) profileData.avatar_url = data.avatarUrl;
      if (data.phone !== undefined) profileData.phone = data.phone;
      if (data.timezone !== undefined) profileData.timezone = data.timezone;
      if (data.defaultCurrency !== undefined) profileData.default_currency = data.defaultCurrency;

      if (Object.keys(profileData).length > 0) {
        const { error: profileError } = await client
          .from('profiles')
          .update(profileData)
          .eq('id', user.id);
        if (profileError) throw profileError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });

  // ── Stable callbacks ───────────────────────────────────────────────────

  const signInWithEmail = useCallback(
    (email: string, password: string) =>
      signInEmailMutation.mutateAsync({ email, password }),
    [signInEmailMutation],
  );

  const signUpWithEmail = useCallback(
    (email: string, password: string, fullName?: string) =>
      signUpEmailMutation.mutateAsync({ email, password, fullName }),
    [signUpEmailMutation],
  );

  const signInWithGoogle = useCallback(
    () => signInGoogleMutation.mutateAsync(),
    [signInGoogleMutation],
  );

  const signInWithApple = useCallback(
    () => signInAppleMutation.mutateAsync(),
    [signInAppleMutation],
  );

  const signInWithOtp = useCallback(
    (phone: string) => signInOtpMutation.mutateAsync({ phone }),
    [signInOtpMutation],
  );

  const verifyOtp = useCallback(
    (phone: string, token: string) =>
      verifyOtpMutation.mutateAsync({ phone, token }),
    [verifyOtpMutation],
  );

  const signInWithMagicLink = useCallback(
    (email: string) => signInMagicLinkMutation.mutateAsync({ email }),
    [signInMagicLinkMutation],
  );

  const signOut = useCallback(
    () => signOutMutation.mutateAsync(),
    [signOutMutation],
  );

  const resetPassword = useCallback(
    (email: string) => resetPasswordMutation.mutateAsync({ email }),
    [resetPasswordMutation],
  );

  const updatePassword = useCallback(
    (newPassword: string) => updatePasswordMutation.mutateAsync({ newPassword }),
    [updatePasswordMutation],
  );

  const refreshSession = useCallback(
    () => refreshSessionMutation.mutateAsync(),
    [refreshSessionMutation],
  );

  const updateProfile = useCallback(
    (data: ProfileUpdateData) => updateProfileMutation.mutateAsync(data),
    [updateProfileMutation],
  );

  // ── Return ─────────────────────────────────────────────────────────────

  return {
    user: sessionData?.user ?? null,
    session: sessionData ?? null,
    isLoading,
    isAuthenticated: !!sessionData?.user,

    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    signInWithOtp,
    verifyOtp,
    signInWithMagicLink,

    signOut,
    refreshSession,

    resetPassword,
    updatePassword,

    updateProfile,

    signInState: {
      isLoading: signInEmailMutation.isPending,
      error: signInEmailMutation.error ? toAuthErrorResult(signInEmailMutation.error) : null,
    },
    signUpState: {
      isLoading: signUpEmailMutation.isPending,
      error: signUpEmailMutation.error ? toAuthErrorResult(signUpEmailMutation.error) : null,
    },
  };
}
