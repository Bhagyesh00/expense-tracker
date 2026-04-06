import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import type { TypedSupabaseClient } from '../client';

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

const SESSIONS_KEY = ['active-sessions'] as const;
const DEVICE_INFO_KEY = ['device-info'] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionInfo {
  id: string;
  factorId: string | null;
  createdAt: string;
  updatedAt: string;
  isCurrent: boolean;
  userAgent: string | null;
  ip: string | null;
}

interface DeviceInfo {
  name: string;
  type: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  browser: string;
  os: string;
  isMobile: boolean;
}

interface UseSessionOptions {
  client: TypedSupabaseClient;
}

// ---------------------------------------------------------------------------
// Helpers — user-agent parsing (lightweight, no dependency)
// ---------------------------------------------------------------------------

function parseUserAgent(ua?: string): DeviceInfo {
  if (!ua) {
    return { name: 'Unknown Device', type: 'unknown', browser: 'Unknown', os: 'Unknown', isMobile: false };
  }

  // Detect OS
  let os = 'Unknown';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';

  // Detect browser
  let browser = 'Unknown';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/chrome/i.test(ua) && !/chromium/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/opera|opr\//i.test(ua)) browser = 'Opera';

  // Detect device type
  const isMobile = /mobile|android|iphone|ipod/i.test(ua);
  const isTablet = /tablet|ipad/i.test(ua);
  let type: DeviceInfo['type'] = 'desktop';
  if (isMobile) type = 'mobile';
  else if (isTablet) type = 'tablet';

  const name = `${browser} on ${os}`;

  return { name, type, browser, os, isMobile: isMobile || isTablet };
}

// ---------------------------------------------------------------------------
// useDeviceInfo — current device name/type based on navigator.userAgent
// ---------------------------------------------------------------------------

export function useDeviceInfo() {
  const deviceInfo = useMemo<DeviceInfo>(() => {
    if (typeof navigator === 'undefined') {
      return { name: 'Server', type: 'unknown', browser: 'Unknown', os: 'Unknown', isMobile: false };
    }
    return parseUserAgent(navigator.userAgent);
  }, []);

  return useQuery({
    queryKey: DEVICE_INFO_KEY,
    queryFn: () => deviceInfo,
    staleTime: Infinity, // Device info never changes within a session
    gcTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// useActiveSessions — list active sessions via Supabase MFA/session APIs
//
// Note: Supabase does not natively expose a "list all sessions" endpoint in
// the same way some auth providers do. This implementation uses the current
// session and MFA factors as a proxy. For full multi-session tracking, you
// would typically maintain a custom `user_sessions` table populated by an
// auth hook or the user-setup edge function.
// ---------------------------------------------------------------------------

export function useActiveSessions({ client }: UseSessionOptions) {
  return useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: async () => {
      // Get the current session
      const { data: { session }, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) return [];

      // Build a representation of the current session
      const currentSession: SessionInfo = {
        id: session.access_token.substring(0, 16) + '...',
        factorId: null,
        createdAt: new Date((session.expires_at ?? 0) * 1000 - 3600 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        isCurrent: true,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        ip: null, // Not available client-side
      };

      // If MFA is enrolled, list MFA factors as additional info
      const { data: mfaData } = await client.auth.mfa.listFactors();
      const factors = mfaData?.all ?? [];

      const sessions: SessionInfo[] = [currentSession];

      // Add MFA factor info as supplementary session data
      for (const factor of factors) {
        if (factor.status === 'verified') {
          sessions.push({
            id: factor.id,
            factorId: factor.id,
            createdAt: factor.created_at,
            updatedAt: factor.updated_at,
            isCurrent: false,
            userAgent: null,
            ip: null,
          });
        }
      }

      return sessions;
    },
    staleTime: 30 * 1000, // Refresh every 30 seconds
  });
}

// ---------------------------------------------------------------------------
// useRevokeSession — sign out from a specific session
//
// Since Supabase's client-side SDK primarily supports signing out the current
// session, revoking other sessions requires either:
//   a) scope: 'others' to sign out all other sessions
//   b) scope: 'global' to sign out everywhere
// ---------------------------------------------------------------------------

export function useRevokeSession({ client }: UseSessionOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, scope }: { sessionId?: string; scope?: 'local' | 'others' | 'global' }) => {
      // If revoking a specific non-current session or all others
      const signOutScope = scope ?? 'others';

      const { error } = await client.auth.signOut({ scope: signOutScope });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// useSignOutEverywhere — convenience hook to sign out from all devices
// ---------------------------------------------------------------------------

export function useSignOutEverywhere({ client }: UseSessionOptions) {
  const queryClient = useQueryClient();

  const signOutEverywhere = useCallback(async () => {
    const { error } = await client.auth.signOut({ scope: 'global' });
    if (error) throw error;
    queryClient.clear();
  }, [client, queryClient]);

  return { signOutEverywhere };
}
