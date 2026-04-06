"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import {
  Shield,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Monitor,
  Smartphone,
  Trash2,
  LogOut,
  Lock,
  Download,
  AlertTriangle,
  Key,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { createBrowserClient } from "@/lib/supabase/client";
import { TOTPSetupModal } from "@/components/auth/totp-setup";


const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

const MOCK_SESSIONS: ActiveSession[] = [
  {
    id: "current",
    device: "MacBook Pro",
    browser: "Chrome 122",
    ip: "192.168.1.1",
    lastActive: "Just now",
    isCurrent: true,
  },
  {
    id: "session-2",
    device: "iPhone 15",
    browser: "Safari Mobile",
    ip: "103.45.67.89",
    lastActive: "2 hours ago",
    isCurrent: false,
  },
  {
    id: "session-3",
    device: "Windows PC",
    browser: "Firefox 123",
    ip: "74.125.224.72",
    lastActive: "Yesterday",
    isCurrent: false,
  },
];

export default function SecuritySettingsPage() {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [checkingMfa, setCheckingMfa] = useState(true);
  const [showTOTPSetup, setShowTOTPSetup] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDisableMfaConfirm, setShowDisableMfaConfirm] = useState(false);
  const [sessions, setSessions] = useState<ActiveSession[]>(MOCK_SESSIONS);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [disablingMfa, setDisablingMfa] = useState(false);
  const [backupCodes] = useState<string[]>([
    "ABCD-1234",
    "EFGH-5678",
    "IJKL-9012",
    "MNOP-3456",
    "QRST-7890",
    "UVWX-1234",
    "YZAB-5678",
    "CDEF-9012",
  ]);

  useEffect(() => {
    const checkMfaStatus = async () => {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (!error && data) {
          const totpFactors = data.totp ?? [];
          setMfaEnabled(totpFactors.some((f) => f.status === "verified"));
        }
      } catch {
        // Silently fail — MFA check is non-critical
      } finally {
        setCheckingMfa(false);
      }
    };
    checkMfaStatus();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSession(sessionId);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success("Session revoked");
    } catch {
      toast.error("Failed to revoke session");
    } finally {
      setRevokingSession(null);
    }
  };

  const handleSignOutAll = async () => {
    setSigningOutAll(true);
    try {
      const supabase = createBrowserClient();
      await supabase.auth.signOut({ scope: "others" });
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      toast.success("All other sessions signed out");
    } catch {
      toast.error("Failed to sign out other sessions");
    } finally {
      setSigningOutAll(false);
    }
  };

  const handleDisableMfa = async () => {
    setDisablingMfa(true);
    try {
      const supabase = createBrowserClient();
      const { data } = await supabase.auth.mfa.listFactors();
      const totpFactor = data?.totp?.[0];
      if (totpFactor) {
        await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
      }
      setMfaEnabled(false);
      setShowDisableMfaConfirm(false);
      toast.success("Two-factor authentication disabled");
    } catch {
      toast.error("Failed to disable 2FA");
    } finally {
      setDisablingMfa(false);
    }
  };

  const handleTOTPSetupComplete = () => {
    setMfaEnabled(true);
    setShowTOTPSetup(false);
    toast.success("Two-factor authentication enabled!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Security</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage your account security and active sessions
          </p>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Two-Factor Authentication
              </h2>
              <p className="mt-1 text-xs text-muted-foreground max-w-md">
                Add an extra layer of security to your account by requiring a
                verification code in addition to your password.
              </p>
            </div>
          </div>
          <div className="shrink-0">
            {checkingMfa ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : mfaEnabled ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Enabled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                <XCircle className="h-3.5 w-3.5" />
                Disabled
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {!mfaEnabled ? (
            <button
              onClick={() => setShowTOTPSetup(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <Shield className="h-4 w-4" />
              Enable 2FA
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowDisableMfaConfirm(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <XCircle className="h-4 w-4" />
                Disable 2FA
              </button>
            </>
          )}
        </div>

        {/* Backup codes — only shown when MFA is enabled */}
        {mfaEnabled && (
          <div className="mt-5 rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  Backup Codes
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Use these codes if you lose access to your authenticator app.
                  Each code can only be used once.
                </p>
              </div>
              <button
                onClick={() => {
                  const content = backupCodes.join("\n");
                  const blob = new Blob([content], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "expenseflow-backup-codes.txt";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {backupCodes.map((code, i) => (
                <code
                  key={i}
                  className="rounded border border-dashed border-border bg-background px-2 py-1 text-center text-xs font-mono text-foreground"
                >
                  {code}
                </code>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Active Sessions
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Devices currently signed in to your account
            </p>
          </div>
          <button
            onClick={handleSignOutAll}
            disabled={signingOutAll || sessions.length <= 1}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {signingOutAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LogOut className="h-3.5 w-3.5" />
            )}
            Sign out all others
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                "flex items-center justify-between gap-4 rounded-lg border p-3.5",
                session.isCurrent
                  ? "border-primary/30 bg-primary/5"
                  : "border-border"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  {session.device.includes("iPhone") ||
                  session.device.includes("Android") ? (
                    <Smartphone className="h-4.5 w-4.5 text-muted-foreground" />
                  ) : (
                    <Monitor className="h-4.5 w-4.5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    {session.device}
                    {session.isCurrent && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                        This device
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {session.browser} · {session.ip} · {session.lastActive}
                  </p>
                </div>
              </div>
              {!session.isCurrent && (
                <button
                  onClick={() => handleRevokeSession(session.id)}
                  disabled={revokingSession === session.id}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                  title="Revoke session"
                >
                  {revokingSession === session.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Password */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Password
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Change your account password
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Lock className="h-4 w-4" />
            Change Password
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-destructive/30 bg-card p-6 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Danger Zone
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                Export My Data
              </p>
              <p className="text-xs text-muted-foreground">
                Download a complete copy of your data (GDPR)
              </p>
            </div>
            <Link
              href="/settings/data"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Download className="h-3.5 w-3.5" />
              Go to Data Export
            </Link>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                Delete Account
              </p>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all associated data
              </p>
            </div>
            <Link
              href="/settings/data#delete"
              className="inline-flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
            >
              Delete Account
            </Link>
          </div>
        </div>
      </div>

      {/* TOTP Setup Modal */}
      {showTOTPSetup && (
        <TOTPSetupModal
          onClose={() => setShowTOTPSetup(false)}
          onComplete={handleTOTPSetupComplete}
        />
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}

      {/* Disable MFA Confirm */}
      {showDisableMfaConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Disable Two-Factor Authentication?
                </h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Disabling 2FA will make your account less secure. Are you sure you
              want to continue?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDisableMfaConfirm(false)}
                className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleDisableMfa}
                disabled={disablingMfa}
                className="flex-1 rounded-lg bg-destructive py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
              >
                {disablingMfa ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Disabling...
                  </span>
                ) : (
                  "Disable 2FA"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Change Password Modal ────────────────────────────────────────────────────

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordInput) => {
    setIsSaving(true);
    try {
      const supabase = createBrowserClient();
      // Re-authenticate first
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("No user email");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: data.currentPassword,
      });

      if (signInError) {
        toast.error("Current password is incorrect");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password changed successfully");
        onClose();
      }
    } catch {
      toast.error("Failed to change password");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <h3 className="mb-5 text-base font-semibold text-foreground">
          Change Password
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                {...register("currentPassword")}
                className={cn(
                  "h-10 w-full rounded-lg border bg-background px-3 pr-10 text-sm text-foreground transition-colors",
                  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                  errors.currentPassword ? "border-destructive" : "border-input"
                )}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-xs text-destructive">
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                {...register("newPassword")}
                className={cn(
                  "h-10 w-full rounded-lg border bg-background px-3 pr-10 text-sm text-foreground transition-colors",
                  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                  errors.newPassword ? "border-destructive" : "border-input"
                )}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-destructive">
                {errors.newPassword.message}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Confirm New Password
            </label>
            <input
              type="password"
              {...register("confirmPassword")}
              className={cn(
                "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground transition-colors",
                "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                errors.confirmPassword ? "border-destructive" : "border-input"
              )}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Changing...
                </span>
              ) : (
                "Change Password"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
