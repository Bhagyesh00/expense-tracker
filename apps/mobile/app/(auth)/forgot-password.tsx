import { useState } from "react";
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
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
} from "react-native-reanimated";

import { supabase } from "@/lib/supabase";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSendReset() {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email address");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setError("");

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        trimmed,
        { redirectTo: "expenseflow://auth/reset-password" }
      );

      if (resetError) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", resetError.message);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsSent(true);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const bgColor = isDark ? "bg-slate-900" : "bg-white";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const inputBg = isDark ? "bg-slate-800" : "bg-slate-50";
  const inputBorder = isDark ? "border-slate-700" : "border-slate-200";
  const inputText = isDark ? "text-white" : "text-slate-900";
  const placeholderColor = isDark ? "#64748B" : "#94A3B8";

  if (isSent) {
    return (
      <SafeAreaView className={`flex-1 ${bgColor}`}>
        <View className="flex-1 justify-center items-center px-6">
          {/* Success Icon */}
          <Animated.View
            entering={FadeIn.duration(600)}
            className="w-24 h-24 rounded-full bg-green-100 items-center justify-center mb-6"
          >
            <Text className="text-5xl">✓</Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(500).delay(200)}
            className="items-center"
          >
            <Text className={`text-2xl font-bold ${textPrimary} mb-3`}>
              Check Your Email
            </Text>
            <Text
              className={`text-sm ${textSecondary} text-center leading-5 mb-8`}
            >
              We've sent a password reset link to{"\n"}
              <Text className={`${textPrimary} font-medium`}>
                {email.trim()}
              </Text>
              {"\n\n"}
              Please check your inbox and follow the instructions to reset your
              password.
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(500).delay(400)}
            className="w-full"
          >
            <TouchableOpacity
              className="bg-primary-600 rounded-xl py-4 items-center mb-4"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.replace("/(auth)/login");
              }}
              activeOpacity={0.8}
            >
              <Text className="text-white text-base font-semibold">
                Back to Login
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="items-center py-2"
              onPress={() => {
                setIsSent(false);
                setEmail("");
              }}
              activeOpacity={0.7}
            >
              <Text className="text-primary-600 text-sm font-medium">
                Didn't receive it? Try again
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

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
            <View className="w-20 h-20 rounded-full bg-primary-100 items-center justify-center">
              <Text className="text-4xl">🔑</Text>
            </View>
          </Animated.View>

          {/* Header */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(200)}
            className="mb-8"
          >
            <Text
              className={`text-2xl font-bold ${textPrimary} mb-2 text-center`}
            >
              Forgot Password?
            </Text>
            <Text className={`text-sm ${textSecondary} text-center leading-5`}>
              No worries! Enter the email address associated with your account
              and we'll send you a reset link.
            </Text>
          </Animated.View>

          {/* Email Input */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(300)}
            className="mb-6"
          >
            <Text
              className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"} mb-1.5`}
            >
              Email Address
            </Text>
            <TextInput
              className={`${inputBg} border rounded-xl px-4 py-3.5 text-base ${inputText} ${
                error ? "border-red-500" : inputBorder
              }`}
              placeholder="you@example.com"
              placeholderTextColor={placeholderColor}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSendReset}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError("");
              }}
              editable={!isLoading}
            />
            {error ? (
              <Text className="text-red-500 text-xs mt-1">{error}</Text>
            ) : null}
          </Animated.View>

          {/* Send Button */}
          <Animated.View entering={FadeInDown.duration(500).delay(400)}>
            <TouchableOpacity
              className={`rounded-xl py-4 items-center ${
                isLoading ? "bg-primary-400" : "bg-primary-600"
              }`}
              style={{
                shadowColor: "#4F46E5",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
              }}
              onPress={handleSendReset}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-base font-semibold">
                  Send Reset Link
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Back to Login */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(500)}
            className="items-center mt-6"
          >
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              activeOpacity={0.7}
            >
              <Text className="text-primary-600 text-sm font-medium">
                Back to Login
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
