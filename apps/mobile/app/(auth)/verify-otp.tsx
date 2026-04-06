import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";

import { supabase } from "@/lib/supabase";

const OTP_LENGTH = 6;
const RESEND_INTERVAL = 60;

export default function VerifyOTPScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const { phone, email } = useLocalSearchParams<{
    phone?: string;
    email?: string;
  }>();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_INTERVAL);
  const [canResend, setCanResend] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const shakeX = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  // Countdown timer
  useEffect(() => {
    if (resendTimer <= 0) {
      setCanResend(true);
      return;
    }

    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [resendTimer]);

  const triggerShake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(-15, { duration: 50 }),
      withTiming(15, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-5, { duration: 50 }),
      withSpring(0)
    );
  }, []);

  const handleOtpChange = useCallback(
    (value: string, index: number) => {
      const sanitized = value.replace(/[^0-9]/g, "");

      // Handle paste (multiple digits)
      if (sanitized.length > 1) {
        const digits = sanitized.slice(0, OTP_LENGTH).split("");
        const newOtp = [...otp];
        digits.forEach((digit, i) => {
          if (index + i < OTP_LENGTH) {
            newOtp[index + i] = digit;
          }
        });
        setOtp(newOtp);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
        setFocusedIndex(nextIndex);
        inputRefs.current[nextIndex]?.focus();

        // Auto-submit if all filled
        if (newOtp.every((d) => d !== "")) {
          verifyOtp(newOtp.join(""));
        }
        return;
      }

      const newOtp = [...otp];
      newOtp[index] = sanitized;
      setOtp(newOtp);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (sanitized && index < OTP_LENGTH - 1) {
        setFocusedIndex(index + 1);
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit if all 6 digits are filled
      if (sanitized && newOtp.every((d) => d !== "")) {
        verifyOtp(newOtp.join(""));
      }
    },
    [otp]
  );

  const handleKeyPress = useCallback(
    (key: string, index: number) => {
      if (key === "Backspace" && !otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        setFocusedIndex(index - 1);
        inputRefs.current[index - 1]?.focus();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [otp]
  );

  async function verifyOtp(code: string) {
    setIsVerifying(true);
    try {
      const verifyParams = phone
        ? { phone, token: code, type: "sms" as const }
        : { email: email ?? "", token: code, type: "email" as const };

      const { error } = await supabase.auth.verifyOtp(verifyParams);

      if (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        triggerShake();
        Alert.alert("Verification Failed", error.message);
        // Reset OTP
        setOtp(Array(OTP_LENGTH).fill(""));
        setFocusedIndex(0);
        inputRefs.current[0]?.focus();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Auth state change will handle navigation
      }
    } catch {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    if (!canResend) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCanResend(false);
    setResendTimer(RESEND_INTERVAL);

    try {
      if (phone) {
        const { error } = await supabase.auth.signInWithOtp({ phone });
        if (error) throw error;
      } else if (email) {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
      }
      Alert.alert("Code Sent", "A new verification code has been sent.");
    } catch {
      Alert.alert("Error", "Failed to resend code. Please try again.");
      setCanResend(true);
    }
  }

  const contactInfo = phone ?? email ?? "your phone/email";

  const bgColor = isDark ? "bg-slate-900" : "bg-white";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-6">
          {/* Back Button */}
          <Animated.View entering={FadeInUp.duration(400).delay(100)}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              className={`mb-8 w-10 h-10 rounded-full ${isDark ? "bg-slate-800" : "bg-slate-100"} items-center justify-center`}
              activeOpacity={0.7}
            >
              <Text className={`text-lg ${textPrimary}`}>←</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Icon */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(150)}
            className="items-center mb-6"
          >
            <View className="w-20 h-20 rounded-full bg-primary-100 items-center justify-center mb-4">
              <Text className="text-4xl">📩</Text>
            </View>
          </Animated.View>

          {/* Header */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(200)}
            className="items-center mb-8"
          >
            <Text className={`text-2xl font-bold ${textPrimary} mb-2`}>
              Verify Code
            </Text>
            <Text className={`text-sm ${textSecondary} text-center`}>
              Enter the 6-digit code sent to{"\n"}
              <Text className={`${textPrimary} font-medium`}>
                {contactInfo}
              </Text>
            </Text>
          </Animated.View>

          {/* OTP Input Boxes */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(300)}
            style={shakeStyle}
            className="flex-row justify-center mb-8 gap-2.5"
          >
            {otp.map((digit, index) => {
              const isFocused = focusedIndex === index;
              const isFilled = digit !== "";

              return (
                <View
                  key={index}
                  className={`w-12 h-14 rounded-xl border-2 items-center justify-center ${
                    isFilled
                      ? "border-primary-500 bg-primary-50"
                      : isFocused
                        ? "border-primary-400 bg-primary-50/50"
                        : isDark
                          ? "border-slate-700 bg-slate-800"
                          : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <TextInput
                    ref={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    className={`w-full h-full text-center text-2xl font-bold ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={({ nativeEvent }) =>
                      handleKeyPress(nativeEvent.key, index)
                    }
                    onFocus={() => setFocusedIndex(index)}
                    keyboardType="number-pad"
                    maxLength={OTP_LENGTH}
                    selectTextOnFocus
                    editable={!isVerifying}
                    autoFocus={index === 0}
                  />
                </View>
              );
            })}
          </Animated.View>

          {/* Verifying Indicator */}
          {isVerifying && (
            <Animated.View
              entering={FadeInDown.duration(300)}
              className="flex-row items-center justify-center mb-6"
            >
              <ActivityIndicator size="small" color="#4F46E5" />
              <Text className="ml-2 text-primary-600 font-medium">
                Verifying...
              </Text>
            </Animated.View>
          )}

          {/* Resend */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(400)}
            className="items-center"
          >
            {canResend ? (
              <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                <Text className="text-primary-600 font-semibold text-base">
                  Resend Code
                </Text>
              </TouchableOpacity>
            ) : (
              <View className="items-center">
                <Text className={`${textSecondary} text-sm`}>
                  Didn't receive the code?
                </Text>
                <Text className={`${textSecondary} text-sm mt-1`}>
                  Resend in{" "}
                  <Text className={`${textPrimary} font-semibold`}>
                    {String(Math.floor(resendTimer / 60)).padStart(1, "0")}:
                    {String(resendTimer % 60).padStart(2, "0")}
                  </Text>
                </Text>
              </View>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
