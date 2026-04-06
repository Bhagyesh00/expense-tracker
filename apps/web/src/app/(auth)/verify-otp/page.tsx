"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Smartphone } from "lucide-react";
import { OTPInput } from "@/components/auth/otp-input";
import { cn } from "@/lib/cn";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const phoneSchema = z.object({
  phone: z.string().min(1, "Phone number is required").regex(/^\+?[1-9]\d{6,14}$/, "Invalid phone number"),
});

type PhoneInput = z.infer<typeof phoneSchema>;

export default function VerifyOTPPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneParam = searchParams.get("phone") || "";

  const [step, setStep] = useState<"phone" | "otp">(phoneParam ? "otp" : "phone");
  const [phone, setPhone] = useState(phoneParam);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState(phoneParam ? 60 : 0);
  const [otpError, setOtpError] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PhoneInput>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: phoneParam },
  });

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const sendOTP = useCallback(async (phoneNumber: string) => {
    setIsSending(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({ phone: phoneNumber });
      if (error) {
        toast.error(error.message);
        setIsSending(false);
        return false;
      }
      toast.success("OTP sent successfully!");
      setCountdown(60);
      setIsSending(false);
      return true;
    } catch {
      toast.error("Failed to send OTP");
      setIsSending(false);
      return false;
    }
  }, []);

  const onPhoneSubmit = async (data: PhoneInput) => {
    setPhone(data.phone);
    const sent = await sendOTP(data.phone);
    if (sent) {
      setStep("otp");
    }
  };

  const handleOTPComplete = async (otp: string) => {
    setIsVerifying(true);
    setOtpError(false);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: "sms",
      });

      if (error) {
        toast.error(error.message);
        setOtpError(true);
        setIsVerifying(false);
        return;
      }

      toast.success("Phone verified successfully!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Verification failed. Please try again.");
      setOtpError(true);
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    await sendOTP(phone);
  };

  const maskPhone = (p: string) => {
    if (p.length <= 4) return p;
    return p.slice(0, -4).replace(/./g, "*") + p.slice(-4);
  };

  if (step === "phone") {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Smartphone className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Phone verification</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter your phone number to receive a verification code
          </p>
        </div>

        <form onSubmit={handleSubmit(onPhoneSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-sm font-medium text-foreground">
              Phone number
            </label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+1234567890"
                {...register("phone")}
                className={cn(
                  "h-10 w-full rounded-lg border bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors",
                  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                  errors.phone ? "border-destructive" : "border-input"
                )}
              />
            </div>
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSending}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send verification code"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Smartphone className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Enter verification code</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-foreground">{maskPhone(phone)}</span>
        </p>
      </div>

      <div className="space-y-6">
        <OTPInput
          length={6}
          onComplete={handleOTPComplete}
          disabled={isVerifying}
          error={otpError}
        />

        {isVerifying && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying...
          </div>
        )}

        <div className="text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={countdown > 0 || isSending}
            className={cn(
              "text-sm font-medium transition-colors",
              countdown > 0
                ? "cursor-not-allowed text-muted-foreground"
                : "text-primary hover:text-primary/80"
            )}
          >
            {countdown > 0
              ? `Resend code in ${countdown}s`
              : isSending
                ? "Sending..."
                : "Resend code"}
          </button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setOtpError(false);
            }}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Entered wrong number? Go back
          </button>
        </div>
      </div>
    </div>
  );
}
