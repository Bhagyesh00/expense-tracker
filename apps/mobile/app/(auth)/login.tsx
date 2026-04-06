import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { z } from "zod";

import { supabase } from "@/lib/supabase";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginFormData) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Login Failed", error.message);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSocialLogin(provider: "google" | "apple") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSocialLoading(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: "expenseflow://auth/callback",
        },
      });

      if (error) {
        Alert.alert("Login Failed", error.message);
      }
    } catch {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setSocialLoading(null);
    }
  }

  async function handleMagicLink() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.prompt
      ? Alert.prompt(
          "Magic Link",
          "Enter your email to receive a sign-in link.",
          async (email: string) => {
            if (!email) return;
            try {
              const { error } = await supabase.auth.signInWithOtp({
                email,
                options: { emailRedirectTo: "expenseflow://auth/callback" },
              });
              if (error) {
                Alert.alert("Error", error.message);
              } else {
                Alert.alert(
                  "Check Your Email",
                  "We sent a magic link to " + email
                );
              }
            } catch {
              Alert.alert("Error", "Failed to send magic link.");
            }
          },
          "plain-text",
          "",
          "email-address"
        )
      : Alert.alert(
          "Magic Link",
          "Enter your email to receive a sign-in link.",
          [{ text: "OK" }]
        );
  }

  function handlePhoneOTP() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(auth)/verify-otp");
  }

  const bgColor = isDark ? "bg-slate-900" : "bg-white";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const textTertiary = isDark ? "text-slate-500" : "text-slate-400";
  const inputBg = isDark ? "bg-slate-800" : "bg-slate-50";
  const inputBorder = isDark ? "border-slate-700" : "border-slate-200";
  const inputText = isDark ? "text-white" : "text-slate-900";
  const dividerColor = isDark ? "bg-slate-700" : "bg-slate-200";
  const socialBorder = isDark ? "border-slate-700" : "border-slate-200";
  const socialText = isDark ? "text-slate-200" : "text-slate-700";
  const placeholderColor = isDark ? "#64748B" : "#94A3B8";

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Brand */}
          <Animated.View
            entering={FadeInUp.duration(600).delay(100)}
            className="items-center mb-10"
          >
            <View className="w-20 h-20 rounded-3xl bg-primary-600 items-center justify-center mb-4 shadow-lg">
              <Text className="text-white text-3xl font-bold">E</Text>
            </View>
            <Text className={`text-3xl font-bold ${textPrimary} mb-1`}>
              ExpenseFlow
            </Text>
            <Text className={`text-base ${textSecondary}`}>
              Smart expense tracking
            </Text>
          </Animated.View>

          {/* Welcome Text */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(200)}
            className="mb-8"
          >
            <Text className={`text-2xl font-bold ${textPrimary} mb-1`}>
              Welcome back
            </Text>
            <Text className={`text-sm ${textSecondary}`}>
              Sign in to manage your expenses
            </Text>
          </Animated.View>

          {/* Email Input */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(300)}
            className="mb-4"
          >
            <Text
              className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"} mb-1.5`}
            >
              Email
            </Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className={`${inputBg} border rounded-xl px-4 py-3.5 text-base ${inputText} ${
                    errors.email ? "border-red-500" : inputBorder
                  }`}
                  placeholder="you@example.com"
                  placeholderTextColor={placeholderColor}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  editable={!isLoading}
                />
              )}
            />
            {errors.email && (
              <Text className="text-red-500 text-xs mt-1">
                {errors.email.message}
              </Text>
            )}
          </Animated.View>

          {/* Password Input */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(400)}
            className="mb-2"
          >
            <Text
              className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"} mb-1.5`}
            >
              Password
            </Text>
            <View className="relative">
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    ref={passwordRef}
                    className={`${inputBg} border rounded-xl px-4 py-3.5 pr-12 text-base ${inputText} ${
                      errors.password ? "border-red-500" : inputBorder
                    }`}
                    placeholder="Enter your password"
                    placeholderTextColor={placeholderColor}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit(onSubmit)}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    editable={!isLoading}
                  />
                )}
              />
              <TouchableOpacity
                className="absolute right-3 top-0 bottom-0 justify-center px-1"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowPassword(!showPassword);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text className={`text-lg ${textTertiary}`}>
                  {showPassword ? "🙈" : "👁"}
                </Text>
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text className="text-red-500 text-xs mt-1">
                {errors.password.message}
              </Text>
            )}
          </Animated.View>

          {/* Forgot Password */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(450)}
            className="items-end mb-6"
          >
            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                }
              >
                <Text className="text-primary-600 text-sm font-medium">
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>

          {/* Sign In Button */}
          <Animated.View entering={FadeInDown.duration(500).delay(500)}>
            <TouchableOpacity
              className={`rounded-xl py-4 items-center mb-4 ${
                isLoading ? "bg-primary-400" : "bg-primary-600"
              }`}
              style={{
                shadowColor: "#4F46E5",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
              }}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-base font-semibold">
                  Sign In
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Divider */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(550)}
            className="flex-row items-center my-6"
          >
            <View className={`flex-1 h-px ${dividerColor}`} />
            <Text className={`mx-4 text-sm ${textTertiary}`}>
              or continue with
            </Text>
            <View className={`flex-1 h-px ${dividerColor}`} />
          </Animated.View>

          {/* Social Login Row */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(600)}
            className="flex-row gap-3 mb-4"
          >
            <TouchableOpacity
              className={`flex-1 border ${socialBorder} rounded-xl py-3.5 flex-row items-center justify-center gap-2`}
              onPress={() => handleSocialLogin("google")}
              disabled={!!socialLoading}
              activeOpacity={0.7}
            >
              {socialLoading === "google" ? (
                <ActivityIndicator size="small" color="#4F46E5" />
              ) : (
                <>
                  <Text className="text-lg">G</Text>
                  <Text className={`${socialText} font-medium`}>Google</Text>
                </>
              )}
            </TouchableOpacity>

            {Platform.OS === "ios" && (
              <TouchableOpacity
                className={`flex-1 ${isDark ? "bg-white" : "bg-black"} rounded-xl py-3.5 flex-row items-center justify-center gap-2`}
                onPress={() => handleSocialLogin("apple")}
                disabled={!!socialLoading}
                activeOpacity={0.7}
              >
                {socialLoading === "apple" ? (
                  <ActivityIndicator
                    size="small"
                    color={isDark ? "#000" : "#FFF"}
                  />
                ) : (
                  <>
                    <Text
                      className={`text-lg ${isDark ? "text-black" : "text-white"}`}
                    >

                    </Text>
                    <Text
                      className={`font-medium ${isDark ? "text-black" : "text-white"}`}
                    >
                      Apple
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Phone OTP */}
          <Animated.View entering={FadeInDown.duration(500).delay(650)}>
            <TouchableOpacity
              className={`border ${socialBorder} rounded-xl py-3.5 flex-row items-center justify-center gap-2 mb-3`}
              onPress={handlePhoneOTP}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text className="text-lg">📱</Text>
              <Text className={`${socialText} font-medium`}>
                Sign in with Phone
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Magic Link */}
          <Animated.View entering={FadeInDown.duration(500).delay(700)}>
            <TouchableOpacity
              className="items-center mb-8 py-2"
              onPress={handleMagicLink}
              activeOpacity={0.7}
            >
              <Text className="text-primary-600 text-sm font-medium">
                Use Magic Link
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Register Link */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(750)}
            className="flex-row justify-center"
          >
            <Text className={`${textSecondary} text-sm`}>
              Don't have an account?{" "}
            </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text className="text-primary-600 text-sm font-semibold">
                  Sign Up
                </Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
