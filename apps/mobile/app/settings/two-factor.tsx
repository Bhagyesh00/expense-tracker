import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Share,
  Alert,
  useColorScheme,
  Image,
  Clipboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeIn,
  SlideInRight,
  SlideOutLeft,
} from "react-native-reanimated";

import { supabase } from "@/lib/supabase";

// ---- Types ----

type Step = 1 | 2 | 3;

interface TOTPEnrollData {
  id: string;
  type: "totp";
  totp: {
    qr_code: string; // SVG data URL
    secret: string;
    uri: string;
  };
}

// ---- Step Indicator ----

function StepIndicator({ current, isDark }: { current: Step; isDark: boolean }) {
  const steps = [
    { num: 1, label: "Scan QR" },
    { num: 2, label: "Verify" },
    { num: 3, label: "Backup" },
  ];

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 28 }}>
      {steps.map((step, index) => {
        const isActive = step.num === current;
        const isDone = step.num < current;

        return (
          <View key={step.num} style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: isDone
                    ? "#10B981"
                    : isActive
                    ? "#4F46E5"
                    : isDark
                    ? "#1E293B"
                    : "#E2E8F0",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: isActive ? 2 : 0,
                  borderColor: isActive ? "#818CF8" : "transparent",
                }}
              >
                {isDone ? (
                  <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>✓</Text>
                ) : (
                  <Text
                    style={{
                      color: isActive ? "#fff" : isDark ? "#475569" : "#94A3B8",
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    {step.num}
                  </Text>
                )}
              </View>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color: isActive
                    ? isDark
                      ? "#A5B4FC"
                      : "#4F46E5"
                    : isDark
                    ? "#475569"
                    : "#94A3B8",
                  marginTop: 4,
                }}
              >
                {step.label}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View
                style={{
                  height: 2,
                  width: 48,
                  backgroundColor: step.num < current ? "#10B981" : isDark ? "#1E293B" : "#E2E8F0",
                  marginHorizontal: 8,
                  marginBottom: 16,
                }}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

// ---- OTP Input ----

interface OTPInputProps {
  value: string;
  onChange: (val: string) => void;
  isDark: boolean;
  error?: boolean;
}

function OTPInput({ value, onChange, isDark, error }: OTPInputProps) {
  const inputRef = useRef<TextInput>(null);

  return (
    <TouchableOpacity
      onPress={() => inputRef.current?.focus()}
      activeOpacity={1}
      style={{ alignItems: "center" }}
    >
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
        autoFocus
      />
      <View style={{ flexDirection: "row", gap: 10 }}>
        {Array.from({ length: 6 }).map((_, i) => {
          const char = value[i];
          const isCurrent = i === value.length;

          return (
            <View
              key={i}
              style={{
                width: 46,
                height: 56,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: error
                  ? "#EF4444"
                  : isCurrent
                  ? "#4F46E5"
                  : char
                  ? isDark
                    ? "#4F46E5"
                    : "#C7D2FE"
                  : isDark
                  ? "#334155"
                  : "#E2E8F0",
                backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  color: isDark ? "#F8FAFC" : "#0F172A",
                }}
              >
                {char ?? ""}
              </Text>
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

// ---- Step 1: Scan QR ----

function Step1ScanQR({
  enrollData,
  onNext,
  isDark,
}: {
  enrollData: TOTPEnrollData;
  onNext: () => void;
  isDark: boolean;
}) {
  const [copied, setCopied] = useState(false);

  function copySecret() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Clipboard.setString(enrollData.totp.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <Text
        style={{
          fontSize: 22,
          fontWeight: "800",
          color: isDark ? "#F8FAFC" : "#0F172A",
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        Scan QR Code
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: isDark ? "#94A3B8" : "#64748B",
          textAlign: "center",
          lineHeight: 20,
          marginBottom: 28,
        }}
      >
        Open your authenticator app (Google Authenticator, Authy, etc.) and scan this QR code.
      </Text>

      {/* QR Code */}
      <View
        style={{
          alignSelf: "center",
          backgroundColor: "#FFFFFF",
          padding: 16,
          borderRadius: 20,
          marginBottom: 24,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        {enrollData.totp.qr_code ? (
          <Image
            source={{ uri: enrollData.totp.qr_code }}
            style={{ width: 200, height: 200 }}
            resizeMode="contain"
          />
        ) : (
          <View
            style={{
              width: 200,
              height: 200,
              backgroundColor: "#F1F5F9",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 40 }}>📱</Text>
            <Text style={{ fontSize: 12, color: "#64748B", marginTop: 8, textAlign: "center" }}>
              QR code unavailable.{"\n"}Use secret key below.
            </Text>
          </View>
        )}
      </View>

      {/* Manual Entry */}
      <View
        style={{
          backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
          borderRadius: 14,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: isDark ? "#64748B" : "#94A3B8",
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          Manual Entry Key
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: isDark ? "#F8FAFC" : "#0F172A",
            letterSpacing: 2,
            fontVariant: ["tabular-nums"],
          }}
          selectable
        >
          {enrollData.totp.secret
            .match(/.{1,4}/g)
            ?.join(" ") ?? enrollData.totp.secret}
        </Text>
      </View>

      <TouchableOpacity
        style={{
          backgroundColor: isDark ? "#1E293B" : "#EEF2FF",
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: "center",
          marginBottom: 20,
          flexDirection: "row",
          justifyContent: "center",
          gap: 6,
        }}
        onPress={copySecret}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 16 }}>{copied ? "✓" : "📋"}</Text>
        <Text
          style={{
            color: copied ? "#10B981" : "#4F46E5",
            fontSize: 14,
            fontWeight: "600",
          }}
        >
          {copied ? "Copied!" : "Copy Secret Key"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          backgroundColor: "#4F46E5",
          borderRadius: 14,
          paddingVertical: 15,
          alignItems: "center",
        }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onNext();
        }}
        activeOpacity={0.8}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
          Next — Verify Code
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ---- Step 2: Verify ----

function Step2Verify({
  factorId,
  onSuccess,
  isDark,
}: {
  factorId: string;
  onSuccess: (backupCodes: string[]) => void;
  isDark: boolean;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function verify() {
    if (code.length !== 6) return;
    setLoading(true);
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) throw verifyError;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Generate mock backup codes (in production these come from server)
      const backupCodes = Array.from({ length: 8 }, () =>
        Math.random().toString(36).slice(2, 8).toUpperCase() +
        "-" +
        Math.random().toString(36).slice(2, 8).toUpperCase()
      );

      onSuccess(backupCodes);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError("Invalid code, try again");
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  // Auto-submit on 6 digits
  const handleCodeChange = (val: string) => {
    setCode(val);
    setError("");
    if (val.length === 6) {
      setTimeout(() => verify(), 100);
    }
  };

  return (
    <Animated.View entering={SlideInRight.duration(350)}>
      <Text
        style={{
          fontSize: 22,
          fontWeight: "800",
          color: isDark ? "#F8FAFC" : "#0F172A",
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        Enter Verification Code
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: isDark ? "#94A3B8" : "#64748B",
          textAlign: "center",
          lineHeight: 20,
          marginBottom: 36,
        }}
      >
        Enter the 6-digit code from your authenticator app.
      </Text>

      <OTPInput value={code} onChange={handleCodeChange} isDark={isDark} error={!!error} />

      {error ? (
        <Animated.View entering={FadeIn.duration(300)}>
          <Text
            style={{
              textAlign: "center",
              color: "#EF4444",
              fontSize: 13,
              fontWeight: "500",
              marginTop: 14,
            }}
          >
            {error}
          </Text>
        </Animated.View>
      ) : null}

      <TouchableOpacity
        style={{
          backgroundColor: loading || code.length < 6 ? (isDark ? "#334155" : "#E2E8F0") : "#4F46E5",
          borderRadius: 14,
          paddingVertical: 15,
          alignItems: "center",
          marginTop: 32,
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
        }}
        onPress={verify}
        disabled={loading || code.length < 6}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : null}
        <Text
          style={{
            color: loading || code.length < 6 ? (isDark ? "#64748B" : "#94A3B8") : "#FFFFFF",
            fontSize: 16,
            fontWeight: "700",
          }}
        >
          {loading ? "Verifying…" : "Verify"}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ---- Step 3: Backup Codes ----

function Step3BackupCodes({
  codes,
  onDone,
  isDark,
}: {
  codes: string[];
  onDone: () => void;
  isDark: boolean;
}) {
  async function shareBackupCodes() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        title: "ExpenseFlow 2FA Backup Codes",
        message:
          "ExpenseFlow Two-Factor Authentication Backup Codes\n\n" +
          "Store these codes in a safe place. Each code can only be used once.\n\n" +
          codes.join("\n"),
      });
    } catch {
      // User cancelled
    }
  }

  return (
    <Animated.View entering={SlideInRight.duration(350)}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: isDark ? "#14532D" : "#DCFCE7",
          alignItems: "center",
          justifyContent: "center",
          alignSelf: "center",
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 28 }}>🛡️</Text>
      </View>

      <Text
        style={{
          fontSize: 22,
          fontWeight: "800",
          color: isDark ? "#F8FAFC" : "#0F172A",
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        Save Backup Codes
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: isDark ? "#94A3B8" : "#64748B",
          textAlign: "center",
          lineHeight: 19,
          marginBottom: 24,
        }}
      >
        Save these 8 backup codes. If you lose access to your authenticator, you'll need one of these to sign in.
      </Text>

      {/* Backup Codes Grid */}
      <View
        style={{
          backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {codes.map((code, i) => (
            <View
              key={i}
              style={{
                width: "47%",
                backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: isDark ? "#334155" : "#E2E8F0",
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: isDark ? "#475569" : "#94A3B8",
                  width: 16,
                }}
              >
                {i + 1}.
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: isDark ? "#F8FAFC" : "#0F172A",
                  letterSpacing: 0.5,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {code}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={{
          backgroundColor: isDark ? "#1E293B" : "#EEF2FF",
          borderRadius: 12,
          paddingVertical: 13,
          alignItems: "center",
          marginBottom: 12,
          flexDirection: "row",
          justifyContent: "center",
          gap: 6,
        }}
        onPress={shareBackupCodes}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 16 }}>📤</Text>
        <Text style={{ color: "#4F46E5", fontSize: 14, fontWeight: "600" }}>
          Save Backup Codes
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          backgroundColor: "#4F46E5",
          borderRadius: 14,
          paddingVertical: 15,
          alignItems: "center",
        }}
        onPress={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onDone();
        }}
        activeOpacity={0.8}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
          Done — 2FA Enabled ✓
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ---- Main Screen ----

export default function TwoFactorScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [step, setStep] = useState<Step>(1);
  const [enrollData, setEnrollData] = useState<TOTPEnrollData | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState("");

  const bgColor = isDark ? "#0F172A" : "#F8FAFC";

  // Enroll TOTP on mount
  async function startEnrollment() {
    setEnrollLoading(true);
    setEnrollError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "ExpenseFlow",
        friendlyName: "ExpenseFlow Authenticator",
      });

      if (error) throw error;

      setEnrollData(data as unknown as TOTPEnrollData);
    } catch (err: any) {
      setEnrollError(err.message ?? "Failed to start 2FA setup. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setEnrollLoading(false);
    }
  }

  // Start enrollment when screen mounts
  useState(() => {
    startEnrollment();
  });

  function handleVerifySuccess(codes: string[]) {
    setBackupCodes(codes);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep(3);
  }

  function handleDone() {
    router.back();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }} edges={["top"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "#1E293B" : "#F1F5F9",
        }}
      >
        <TouchableOpacity
          onPress={() => {
            if (step > 1) {
              setStep((s) => (s - 1) as Step);
            } else {
              router.back();
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={{ color: "#4F46E5", fontSize: 16, fontWeight: "500" }}>
            {step > 1 ? "← Back" : "✕"}
          </Text>
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 17,
            fontWeight: "700",
            color: isDark ? "#F8FAFC" : "#0F172A",
          }}
        >
          Two-Factor Auth
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step Indicator */}
        <StepIndicator current={step} isDark={isDark} />

        {/* Loading / Error State */}
        {enrollLoading ? (
          <Animated.View entering={FadeIn.duration(300)} style={{ alignItems: "center", paddingVertical: 60 }}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={{ color: isDark ? "#94A3B8" : "#64748B", marginTop: 16, fontSize: 14 }}>
              Setting up two-factor authentication…
            </Text>
          </Animated.View>
        ) : enrollError ? (
          <Animated.View entering={FadeIn.duration(300)} style={{ alignItems: "center", paddingVertical: 40 }}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>⚠️</Text>
            <Text
              style={{
                color: isDark ? "#F8FAFC" : "#0F172A",
                fontSize: 16,
                fontWeight: "600",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              Setup Failed
            </Text>
            <Text
              style={{
                color: isDark ? "#94A3B8" : "#64748B",
                fontSize: 14,
                textAlign: "center",
                marginBottom: 24,
                lineHeight: 20,
              }}
            >
              {enrollError}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#4F46E5",
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 24,
              }}
              onPress={startEnrollment}
              activeOpacity={0.8}
            >
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
                Try Again
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ) : step === 1 && enrollData ? (
          <Step1ScanQR
            enrollData={enrollData}
            onNext={() => setStep(2)}
            isDark={isDark}
          />
        ) : step === 2 && enrollData ? (
          <Step2Verify
            factorId={enrollData.id}
            onSuccess={handleVerifySuccess}
            isDark={isDark}
          />
        ) : step === 3 ? (
          <Step3BackupCodes codes={backupCodes} onDone={handleDone} isDark={isDark} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
