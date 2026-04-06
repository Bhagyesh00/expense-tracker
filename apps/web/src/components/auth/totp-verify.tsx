"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Shield, KeyRound } from "lucide-react";
import { cn } from "@/lib/cn";
import { createBrowserClient } from "@/lib/supabase/client";
import { OTPInput } from "./otp-input";

interface TOTPVerifyProps {
  factorId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function TOTPVerify({ factorId, onSuccess, onCancel }: TOTPVerifyProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [isSubmittingBackup, setIsSubmittingBackup] = useState(false);

  const handleVerify = async (code: string) => {
    if (code.length !== 6) return;
    setIsVerifying(true);
    setVerifyError(false);

    try {
      const supabase = createBrowserClient();

      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyErr) {
        setVerifyError(true);
        toast.error("Invalid verification code");
        return;
      }

      toast.success("Identity verified successfully");
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification failed";
      toast.error(message);
      setVerifyError(true);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBackupCodeSubmit = async () => {
    const cleaned = backupCode.replace(/\s/g, "").toUpperCase();
    if (!cleaned) {
      toast.error("Please enter a backup code");
      return;
    }

    setIsSubmittingBackup(true);
    try {
      // Backup codes are handled the same as TOTP codes via MFA verify
      const supabase = createBrowserClient();

      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: cleaned,
      });

      if (verifyErr) {
        toast.error("Invalid backup code");
        return;
      }

      toast.success("Backup code accepted");
      onSuccess();
    } catch {
      toast.error("Invalid backup code");
    } finally {
      setIsSubmittingBackup(false);
    }
  };

  if (useBackupCode) {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Enter Backup Code
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter one of your saved backup codes
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={backupCode}
            onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX"
            className={cn(
              "h-12 w-full rounded-lg border bg-background px-4 text-center font-mono text-sm text-foreground tracking-widest placeholder:text-muted-foreground transition-colors",
              "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
              "border-input"
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleBackupCodeSubmit();
            }}
          />

          <button
            onClick={handleBackupCodeSubmit}
            disabled={isSubmittingBackup || !backupCode.trim()}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmittingBackup ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Use Backup Code"
            )}
          </button>

          <button
            onClick={() => setUseBackupCode(false)}
            className="w-full rounded-lg border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Back to authenticator app
          </button>

          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel sign in
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          Two-Factor Authentication
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app
        </p>
      </div>

      <OTPInput
        length={6}
        onComplete={handleVerify}
        disabled={isVerifying}
        error={verifyError}
      />

      {verifyError && (
        <p className="text-center text-sm text-destructive">
          Invalid code. Please check your authenticator app and try again.
        </p>
      )}

      {isVerifying && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Verifying...
        </div>
      )}

      <div className="space-y-2 pt-2">
        <button
          onClick={() => setUseBackupCode(true)}
          className="w-full text-center text-sm text-primary hover:text-primary/80 transition-colors"
        >
          Use a backup code instead
        </button>

        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel sign in
          </button>
        )}
      </div>
    </div>
  );
}

// Standalone page component that wraps the verifier for the login flow
interface TOTPVerifyPageProps {
  factorId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function TOTPVerifyCard({
  factorId,
  onSuccess,
  onCancel,
}: TOTPVerifyPageProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <TOTPVerify
        factorId={factorId}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </div>
  );
}
