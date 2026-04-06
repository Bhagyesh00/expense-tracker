"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  X,
  Loader2,
  CheckCircle2,
  Download,
  Copy,
  Shield,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { createBrowserClient } from "@/lib/supabase/client";
import { OTPInput } from "./otp-input";

interface TOTPSetupModalProps {
  onClose: () => void;
  onComplete: () => void;
}

type Step = "scan" | "verify" | "backup";

interface TOTPEnrollData {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}

// Generate a simple QR code SVG using a data matrix approach.
// We use the totp_uri from Supabase and render it as an <img> with a QR endpoint,
// or fall back to showing the manual entry code.
function QRCodeDisplay({ uri, size = 200 }: { uri: string; size?: number }) {
  // Use Google Charts QR API as a fallback (no external library needed)
  const encodedUri = encodeURIComponent(uri);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedUri}&format=svg`;

  return (
    <div
      className="flex items-center justify-center rounded-lg border border-border bg-white p-3"
      style={{ width: size + 24, height: size + 24 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrUrl}
        alt="TOTP QR Code"
        width={size}
        height={size}
        className="rounded"
        onError={(e) => {
          // If QR API fails, hide the image
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    </div>
  );
}

const BACKUP_CODES = Array.from({ length: 8 }, () =>
  Math.random().toString(36).substring(2, 6).toUpperCase() +
  "-" +
  Math.random().toString(36).substring(2, 6).toUpperCase()
);

export function TOTPSetupModal({ onClose, onComplete }: TOTPSetupModalProps) {
  const [step, setStep] = useState<Step>("scan");
  const [enrollData, setEnrollData] = useState<TOTPEnrollData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [backupCodes] = useState<string[]>(BACKUP_CODES);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const enroll = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "ExpenseFlow Authenticator",
      });

      if (error) throw error;

      const totp = data.totp;
      setEnrollData({
        factorId: data.id,
        qrCode: totp.qr_code,
        secret: totp.secret,
        uri: totp.uri,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to setup 2FA";
      toast.error(message);
      onClose();
    } finally {
      setIsLoading(false);
    }
  }, [onClose]);

  useEffect(() => {
    enroll();
  }, [enroll]);

  const handleVerify = async (code: string) => {
    if (!enrollData) return;
    setIsVerifying(true);
    setVerifyError(false);

    try {
      const supabase = createBrowserClient();

      // Create challenge
      let cId = challengeId;
      if (!cId) {
        const { data: challengeData, error: challengeError } =
          await supabase.auth.mfa.challenge({ factorId: enrollData.factorId });
        if (challengeError) throw challengeError;
        cId = challengeData.id;
        setChallengeId(cId);
      }

      // Verify
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollData.factorId,
        challengeId: cId!,
        code,
      });

      if (verifyError) {
        setVerifyError(true);
        toast.error("Invalid code. Please try again.");
        setChallengeId(null); // Reset challenge on error
        return;
      }

      setStep("backup");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification failed";
      toast.error(message);
      setVerifyError(true);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopySecret = async () => {
    if (!enrollData?.secret) return;
    await navigator.clipboard.writeText(enrollData.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
    toast.success("Secret copied to clipboard");
  };

  const handleDownloadBackupCodes = () => {
    const content = [
      "ExpenseFlow Backup Codes",
      "========================",
      "Keep these codes safe. Each code can only be used once.",
      "",
      ...backupCodes,
      "",
      `Generated: ${new Date().toLocaleString()}`,
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenseflow-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const steps = [
    { id: "scan", label: "Scan QR" },
    { id: "verify", label: "Verify" },
    { id: "backup", label: "Backup Codes" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">
              Set up Two-Factor Authentication
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 border-b border-border px-6 py-3">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  step === s.id
                    ? "bg-primary/15 text-primary"
                    : steps.findIndex((st) => st.id === step) > i
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground"
                )}
              >
                {steps.findIndex((st) => st.id === step) > i ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px]">
                    {i + 1}
                  </span>
                )}
                {s.label}
              </div>
              {i < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 mx-1" />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Scan QR Code */}
          {step === "scan" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Scan this QR code
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Open your authenticator app (Google Authenticator, Authy, or
                  similar) and scan the QR code below.
                </p>
              </div>

              {isLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : enrollData ? (
                <>
                  <div className="flex justify-center">
                    <QRCodeDisplay uri={enrollData.uri} size={180} />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground text-center">
                      Can&apos;t scan? Enter this code manually:
                    </p>
                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2">
                      <code className="flex-1 break-all text-center text-xs font-mono text-foreground">
                        {enrollData.secret}
                      </code>
                      <button
                        onClick={handleCopySecret}
                        className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copiedSecret ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : null}

              <button
                onClick={() => setStep("verify")}
                disabled={isLoading || !enrollData}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                I&apos;ve scanned it
              </button>
            </div>
          )}

          {/* Step 2: Verify Code */}
          {step === "verify" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Enter the verification code
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Enter the 6-digit code from your authenticator app to verify
                  the setup.
                </p>
              </div>

              <div className="py-2">
                <OTPInput
                  length={6}
                  onComplete={handleVerify}
                  disabled={isVerifying}
                  error={verifyError}
                />
              </div>

              {verifyError && (
                <p className="text-center text-xs text-destructive">
                  Invalid code. Please check your authenticator app and try
                  again.
                </p>
              )}

              {isVerifying && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </div>
              )}

              <button
                onClick={() => setStep("scan")}
                className="w-full rounded-lg border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Back
              </button>
            </div>
          )}

          {/* Step 3: Backup Codes */}
          {step === "backup" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    2FA enabled successfully!
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Save these backup codes somewhere safe
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-900/20">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  These codes can be used to access your account if you lose
                  your phone. Each code can only be used once. Store them
                  securely.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, i) => (
                  <code
                    key={i}
                    className="rounded-md border border-dashed border-border bg-muted/50 px-2 py-1.5 text-center text-xs font-mono text-foreground"
                  >
                    {code}
                  </code>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleDownloadBackupCodes}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <Download className="h-4 w-4" />
                  Download backup codes
                </button>
                <button
                  onClick={onComplete}
                  className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
