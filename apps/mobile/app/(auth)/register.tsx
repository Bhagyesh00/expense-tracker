import { useState, useRef, useMemo } from "react";
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
import Animated, { FadeInDown } from "react-native-reanimated";
import { z } from "zod";

import { supabase } from "@/lib/supabase";

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be less than 100 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain uppercase, lowercase, and a number"
      ),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({
        message: "You must accept the terms and conditions",
      }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

interface PasswordRequirement {
  label: string;
  met: boolean;
}

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  requirements: PasswordRequirement[];
} {
  const requirements: PasswordRequirement[] = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
    { label: "Contains a number", met: /[0-9]/.test(password) },
    {
      label: "Contains special character",
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];

  const score = requirements.filter((r) => r.met).length;

  if (score <= 1) return { score, label: "Weak", color: "#EF4444", requirements };
  if (score <= 2) return { score, label: "Fair", color: "#F59E0B", requirements };
  if (score <= 3) return { score, label: "Good", color: "#3B82F6", requirements };
  if (score <= 4) return { score, label: "Strong", color: "#10B981", requirements };
  return { score, label: "Excellent", color: "#059669", requirements };
}

export default function RegisterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false as unknown as true,
    },
  });

  const acceptTerms = watch("acceptTerms");
  const passwordValue = watch("password");

  const passwordStrength = useMemo(
    () => getPasswordStrength(passwordValue || ""),
    [passwordValue]
  );

  async function onSubmit(data: RegisterFormData) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          },
          emailRedirectTo: "expenseflow://auth/callback",
        },
      });

      if (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Registration Failed", error.message);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Check Your Email",
          "We sent a confirmation link to your email address. Please verify to continue.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSocialSignup(provider: "google" | "apple") {
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
        Alert.alert("Sign Up Failed", error.message);
      }
    } catch {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setSocialLoading(null);
    }
  }

  const bgColor = isDark ? "bg-slate-900" : "bg-white";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const textTertiary = isDark ? "text-slate-500" : "text-slate-400";
  const labelColor = isDark ? "text-slate-300" : "text-slate-700";
  const inputBg = isDark ? "bg-slate-800" : "bg-slate-50";
  const inputBorder = isDark ? "border-slate-700" : "border-slate-200";
  const inputText = isDark ? "text-white" : "text-slate-900";
  const dividerColor = isDark ? "bg-slate-700" : "bg-slate-200";
  const socialBorder = isDark ? "border-slate-700" : "border-slate-200";
  const socialText = isDark ? "text-slate-200" : "text-slate-700";
  const placeholderColor = isDark ? "#64748B" : "#94A3B8";
  const checkboxBorder = isDark ? "border-slate-600" : "border-slate-300";

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow px-6 py-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back + Header */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(100)}
            className="mb-6"
          >
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              className="mb-4 w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
              activeOpacity={0.7}
            >
              <Text className={`text-lg ${textPrimary}`}>←</Text>
            </TouchableOpacity>
            <Text className={`text-3xl font-bold ${textPrimary} mb-1`}>
              Create Account
            </Text>
            <Text className={`text-sm ${textSecondary}`}>
              Start tracking your expenses today
            </Text>
          </Animated.View>

          {/* Full Name */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(200)}
            className="mb-4"
          >
            <Text className={`text-sm font-medium ${labelColor} mb-1.5`}>
              Full Name
            </Text>
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className={`${inputBg} border rounded-xl px-4 py-3.5 text-base ${inputText} ${
                    errors.fullName ? "border-red-500" : inputBorder
                  }`}
                  placeholder="John Doe"
                  placeholderTextColor={placeholderColor}
                  autoCapitalize="words"
                  autoComplete="name"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  editable={!isLoading}
                />
              )}
            />
            {errors.fullName && (
              <Text className="text-red-500 text-xs mt-1">
                {errors.fullName.message}
              </Text>
            )}
          </Animated.View>

          {/* Email */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(250)}
            className="mb-4"
          >
            <Text className={`text-sm font-medium ${labelColor} mb-1.5`}>
              Email
            </Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  ref={emailRef}
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

          {/* Password */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(300)}
            className="mb-2"
          >
            <Text className={`text-sm font-medium ${labelColor} mb-1.5`}>
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
                    placeholder="Min. 8 characters"
                    placeholderTextColor={placeholderColor}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
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

          {/* Password Strength Indicator */}
          {passwordValue.length > 0 && (
            <Animated.View
              entering={FadeInDown.duration(300)}
              className="mb-4"
            >
              {/* Strength Bar */}
              <View className="flex-row gap-1.5 mb-2 mt-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <View
                    key={level}
                    className="flex-1 h-1 rounded-full"
                    style={{
                      backgroundColor:
                        level <= passwordStrength.score
                          ? passwordStrength.color
                          : isDark
                            ? "#334155"
                            : "#E2E8F0",
                    }}
                  />
                ))}
              </View>
              <Text
                className="text-xs font-medium mb-2"
                style={{ color: passwordStrength.color }}
              >
                {passwordStrength.label}
              </Text>

              {/* Requirements */}
              <View className="gap-1">
                {passwordStrength.requirements.map((req) => (
                  <View key={req.label} className="flex-row items-center gap-2">
                    <Text
                      className="text-xs"
                      style={{
                        color: req.met
                          ? "#10B981"
                          : isDark
                            ? "#64748B"
                            : "#94A3B8",
                      }}
                    >
                      {req.met ? "✓" : "○"}
                    </Text>
                    <Text
                      className="text-xs"
                      style={{
                        color: req.met
                          ? "#10B981"
                          : isDark
                            ? "#64748B"
                            : "#94A3B8",
                      }}
                    >
                      {req.label}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Confirm Password */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(350)}
            className="mb-4"
          >
            <Text className={`text-sm font-medium ${labelColor} mb-1.5`}>
              Confirm Password
            </Text>
            <View className="relative">
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    ref={confirmPasswordRef}
                    className={`${inputBg} border rounded-xl px-4 py-3.5 pr-12 text-base ${inputText} ${
                      errors.confirmPassword ? "border-red-500" : inputBorder
                    }`}
                    placeholder="Re-enter your password"
                    placeholderTextColor={placeholderColor}
                    secureTextEntry={!showConfirmPassword}
                    autoComplete="new-password"
                    returnKeyType="done"
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
                  setShowConfirmPassword(!showConfirmPassword);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text className={`text-lg ${textTertiary}`}>
                  {showConfirmPassword ? "🙈" : "👁"}
                </Text>
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <Text className="text-red-500 text-xs mt-1">
                {errors.confirmPassword.message}
              </Text>
            )}
          </Animated.View>

          {/* Terms Checkbox */}
          <Animated.View entering={FadeInDown.duration(500).delay(400)}>
            <TouchableOpacity
              className="flex-row items-start mb-5"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setValue(
                  "acceptTerms",
                  !acceptTerms as unknown as true
                );
              }}
              activeOpacity={0.7}
            >
              <View
                className={`w-5 h-5 rounded border mr-3 mt-0.5 items-center justify-center ${
                  acceptTerms
                    ? "bg-primary-600 border-primary-600"
                    : checkboxBorder
                }`}
              >
                {acceptTerms && (
                  <Text className="text-white text-xs font-bold">✓</Text>
                )}
              </View>
              <Text className={`flex-1 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                I agree to the{" "}
                <Text
                  className="text-primary-600 font-medium"
                  onPress={() =>
                    Alert.alert(
                      "Terms of Service",
                      "Terms of Service will open in the browser."
                    )
                  }
                >
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text
                  className="text-primary-600 font-medium"
                  onPress={() =>
                    Alert.alert(
                      "Privacy Policy",
                      "Privacy Policy will open in the browser."
                    )
                  }
                >
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>
            {errors.acceptTerms && (
              <Text className="text-red-500 text-xs mb-4 -mt-3">
                {errors.acceptTerms.message}
              </Text>
            )}
          </Animated.View>

          {/* Register Button */}
          <Animated.View entering={FadeInDown.duration(500).delay(450)}>
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
                  Create Account
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Social Divider */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(500)}
            className="flex-row items-center my-5"
          >
            <View className={`flex-1 h-px ${dividerColor}`} />
            <Text className={`mx-4 text-sm ${textTertiary}`}>
              or sign up with
            </Text>
            <View className={`flex-1 h-px ${dividerColor}`} />
          </Animated.View>

          {/* Social Buttons */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(550)}
            className="flex-row gap-3 mb-6"
          >
            <TouchableOpacity
              className={`flex-1 border ${socialBorder} rounded-xl py-3.5 flex-row items-center justify-center gap-2`}
              onPress={() => handleSocialSignup("google")}
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
                onPress={() => handleSocialSignup("apple")}
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

          {/* Login Link */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(600)}
            className="flex-row justify-center mb-4"
          >
            <Text className={`${textSecondary} text-sm`}>
              Already have an account?{" "}
            </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text className="text-primary-600 text-sm font-semibold">
                  Sign In
                </Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
