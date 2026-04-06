import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { supabase } from "@/lib/supabase";

// ---- OTP Box Input ----

interface OTPBoxInputProps {
  value: string;
  onChange: (val: string) => void;
  isDark: boolean;
  error: boolean;
  autoFocus?: boolean;
}

function OTPBoxInput({ value, onChange, isDark, error, autoFocus = true }: OTPBoxInputProps) {
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
        autoFocus={autoFocus}
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        {Array.from({ length: 6 }).map((_, i) => {
          const char = value[i];
          const isFocused = i === value.length;

          return (
            <View
              key={i}
              style={{
                width: 44,
                height: 52,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: error
                  ? "#EF4444"
                  : isFocused
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
                  fontSize: 20,
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

// ---- Main Component ----

interface TOTPVerifyProps {
  /** Called after successful verification */
  onSuccess: () => void;
  /** Called when user taps "Use backup code" */
  onUseBackupCode?: () => void;
  /** The factor ID to challenge (optional — will detect automatically) */
  factorId?: string;
  /** Subtitle shown below heading */
  subtitle?: string;
}

export default function TOTPVerify({
  onSuccess,
  onUseBackupCode,
  factorId: providedFactorId,
  subtitle,
}: TOTPVerifyProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [backupMode, setBackupMode] = useState(false);
  const [backupCode, setBackupCode] = useState("");

  const shakeX = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  function triggerShake() {
    shakeX.value = withSequence(
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-4, { duration: 50 }),
      withSpring(0)
    );
  }

  async function getFactorId(): Promise<string | null> {
    if (providedFactorId) return providedFactorId;

    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error || !data?.totp?.length) return null;
      return data.totp[0].id;
    } catch {
      return null;
    }
  }

  const handleVerify = useCallback(async () => {
    const verifyCode = backupMode ? backupCode.trim() : code;
    if (!verifyCode || (!backupMode && verifyCode.length < 6)) return;

    setLoading(true);
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const fid = await getFactorId();

      if (!fid) {
        throw new Error("No authenticator enrolled. Please set up 2FA first.");
      }

      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: fid });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: fid,
        challengeId: challengeData.id,
        code: verifyCode,
      });

      if (verifyError) throw verifyError;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess();
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(
        backupMode
          ? "Invalid backup code. Please try again."
          : "Invalid code, try again"
      );
      setCode("");
      setBackupCode("");
      triggerShake();
    } finally {
      setLoading(false);
    }
  }, [code, backupCode, backupMode, providedFactorId]);

  // Auto-submit on 6 digits
  const handleCodeChange = (val: string) => {
    setCode(val);
    setError("");
    if (val.length === 6) {
      setTimeout(() => handleVerify(), 80);
    }
  };

  function switchToBackupMode() {
    if (onUseBackupCode) {
      onUseBackupCode();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBackupMode(true);
    setCode("");
    setError("");
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={{
        backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
        borderRadius: 24,
        padding: 28,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.3 : 0.1,
        shadowRadius: 20,
        elevation: 8,
      }}
    >
      {/* Icon */}
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: isDark ? "#312E81" : "#EEF2FF",
          alignItems: "center",
          justifyContent: "center",
          alignSelf: "center",
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 28 }}>🔐</Text>
      </View>

      <Text
        style={{
          fontSize: 20,
          fontWeight: "800",
          color: isDark ? "#F8FAFC" : "#0F172A",
          textAlign: "center",
          marginBottom: 6,
        }}
      >
        {backupMode ? "Use Backup Code" : "Two-Factor Auth"}
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: isDark ? "#94A3B8" : "#64748B",
          textAlign: "center",
          marginBottom: 28,
          lineHeight: 18,
        }}
      >
        {backupMode
          ? "Enter one of your 8-digit backup codes."
          : subtitle ?? "Enter the 6-digit code from your authenticator app."}
      </Text>

      {/* Input */}
      <Animated.View style={shakeStyle}>
        {backupMode ? (
          <TextInput
            value={backupCode}
            onChangeText={(t) => {
              setBackupCode(t.toUpperCase());
              setError("");
            }}
            placeholder="XXXXXX-XXXXXX"
            placeholderTextColor={isDark ? "#475569" : "#CBD5E1"}
            style={{
              borderWidth: 2,
              borderColor: error ? "#EF4444" : isDark ? "#334155" : "#E2E8F0",
              borderRadius: 14,
              paddingHorizontal: 18,
              paddingVertical: 14,
              fontSize: 16,
              fontWeight: "700",
              textAlign: "center",
              color: isDark ? "#F8FAFC" : "#0F172A",
              backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
              letterSpacing: 2,
            }}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        ) : (
          <OTPBoxInput
            value={code}
            onChange={handleCodeChange}
            isDark={isDark}
            error={!!error}
          />
        )}
      </Animated.View>

      {/* Error */}
      {error ? (
        <Animated.View entering={FadeIn.duration(250)}>
          <Text
            style={{
              textAlign: "center",
              color: "#EF4444",
              fontSize: 13,
              fontWeight: "500",
              marginTop: 12,
            }}
          >
            {error}
          </Text>
        </Animated.View>
      ) : null}

      {/* Verify Button */}
      <TouchableOpacity
        style={{
          backgroundColor:
            loading || (!backupMode && code.length < 6) || (backupMode && !backupCode)
              ? isDark
                ? "#334155"
                : "#E2E8F0"
              : "#4F46E5",
          borderRadius: 14,
          paddingVertical: 15,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
          marginTop: 24,
        }}
        onPress={handleVerify}
        disabled={
          loading ||
          (!backupMode && code.length < 6) ||
          (backupMode && !backupCode)
        }
        activeOpacity={0.8}
      >
        {loading ? <ActivityIndicator color="#fff" size="small" /> : null}
        <Text
          style={{
            color:
              loading || (!backupMode && code.length < 6) || (backupMode && !backupCode)
                ? isDark
                  ? "#64748B"
                  : "#94A3B8"
                : "#FFFFFF",
            fontSize: 15,
            fontWeight: "700",
          }}
        >
          {loading ? "Verifying…" : "Verify"}
        </Text>
      </TouchableOpacity>

      {/* Toggle Mode */}
      <TouchableOpacity
        style={{ marginTop: 16, alignItems: "center", paddingVertical: 4 }}
        onPress={backupMode ? () => { setBackupMode(false); setBackupCode(""); setError(""); } : switchToBackupMode}
        activeOpacity={0.7}
      >
        <Text style={{ color: "#4F46E5", fontSize: 13, fontWeight: "600" }}>
          {backupMode ? "← Use authenticator app" : "Use backup code instead"}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
