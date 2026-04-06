import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useColorScheme,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  FadeIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";

import { useAppStore } from "@/stores/app-store";

const PIN_LENGTH = 4;

const KEYPAD_KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["bio", "0", "delete"],
] as const;

export default function PinLockScreen() {
  const { setIsPinLocked, isBiometricEnabled, storedPin } = useAppStore();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [pin, setPin] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const shakeX = useSharedValue(0);

  // Animated styles for each dot
  const dotScales = Array.from({ length: PIN_LENGTH }, () =>
    useSharedValue(1)
  );

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  // Try biometric on mount
  useEffect(() => {
    if (isBiometricEnabled) {
      authenticateWithBiometric();
    }
  }, []);

  async function authenticateWithBiometric() {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock ExpenseFlow",
        fallbackLabel: "Use PIN",
        disableDeviceFallback: true,
        cancelLabel: "Cancel",
      });

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsPinLocked(false);
      }
    } catch {
      // Biometric failed, user can enter PIN manually
    }
  }

  const handleKeyPress = useCallback(
    (key: string) => {
      if (key === "bio") {
        if (isBiometricEnabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          authenticateWithBiometric();
        }
        return;
      }

      if (key === "delete") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPin((prev) => prev.slice(0, -1));
        setError(false);
        return;
      }

      if (pin.length >= PIN_LENGTH) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Animate the dot
      const dotIndex = pin.length;
      if (dotIndex < PIN_LENGTH) {
        dotScales[dotIndex].value = withSequence(
          withSpring(1.4, { damping: 6 }),
          withSpring(1)
        );
      }

      const newPin = [...pin, key];
      setPin(newPin);
      setError(false);

      // Check PIN when complete
      if (newPin.length === PIN_LENGTH) {
        const enteredPin = newPin.join("");
        const correctPin = storedPin ?? "1234"; // Default for demo

        if (enteredPin === correctPin) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setIsPinLocked(false);
        } else {
          // Wrong PIN
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(true);
          setAttempts((prev) => prev + 1);

          // Shake animation
          shakeX.value = withSequence(
            withTiming(-15, { duration: 50 }),
            withTiming(15, { duration: 50 }),
            withTiming(-10, { duration: 50 }),
            withTiming(10, { duration: 50 }),
            withTiming(-5, { duration: 50 }),
            withSpring(0)
          );

          // Reset PIN after delay
          setTimeout(() => {
            setPin([]);
          }, 400);
        }
      }
    },
    [pin, storedPin, isBiometricEnabled]
  );

  const bgColor = isDark ? "bg-slate-900" : "bg-white";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const keyBg = isDark ? "bg-slate-800" : "bg-slate-100";
  const keyText = isDark ? "text-white" : "text-slate-900";

  return (
    <View style={StyleSheet.absoluteFillObject} className={`${bgColor} items-center justify-center`}>
      {/* Logo */}
      <Animated.View entering={FadeIn.duration(600)} className="mb-4">
        <View className="w-16 h-16 rounded-2xl bg-primary-600 items-center justify-center">
          <Text className="text-white text-2xl font-bold">E</Text>
        </View>
      </Animated.View>

      <Text className={`text-xl font-bold ${textPrimary} mb-1`}>
        Welcome Back
      </Text>
      <Text className={`text-sm ${textSecondary} mb-8`}>
        Enter your PIN to continue
      </Text>

      {/* PIN Dots */}
      <Animated.View style={shakeStyle} className="flex-row items-center gap-5 mb-8">
        {Array.from({ length: PIN_LENGTH }).map((_, index) => {
          const dotStyle = useAnimatedStyle(() => ({
            transform: [{ scale: dotScales[index].value }],
          }));

          return (
            <Animated.View
              key={index}
              style={dotStyle}
              className={`w-4 h-4 rounded-full ${
                error
                  ? "bg-red-500"
                  : index < pin.length
                    ? "bg-primary-600"
                    : isDark
                      ? "bg-slate-700"
                      : "bg-slate-200"
              }`}
            />
          );
        })}
      </Animated.View>

      {/* Error Message */}
      {error && (
        <Animated.View entering={FadeIn.duration(300)} className="mb-4">
          <Text className="text-red-500 text-sm font-medium">
            {attempts >= 3
              ? `Incorrect PIN. ${Math.max(5 - attempts, 0)} attempts remaining.`
              : "Incorrect PIN. Try again."}
          </Text>
        </Animated.View>
      )}

      {/* Keypad */}
      <View className="w-80">
        {KEYPAD_KEYS.map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row justify-center mb-3">
            {row.map((key) => {
              const isBio = key === "bio";
              const isDelete = key === "delete";
              const isEmpty = isBio && !isBiometricEnabled;

              return (
                <TouchableOpacity
                  key={key}
                  className={`w-20 h-16 mx-2 rounded-2xl items-center justify-center ${
                    isEmpty ? "" : keyBg
                  }`}
                  style={
                    !isEmpty
                      ? {
                          shadowColor: isDark ? "#000" : "#64748B",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.1,
                          shadowRadius: 3,
                          elevation: 2,
                        }
                      : undefined
                  }
                  onPress={() => handleKeyPress(key)}
                  disabled={isEmpty || (attempts >= 5 && !isDelete && !isBio)}
                  activeOpacity={isEmpty ? 1 : 0.6}
                >
                  {isDelete ? (
                    <Text className={`text-xl ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      ⌫
                    </Text>
                  ) : isBio && isBiometricEnabled ? (
                    <Text className="text-2xl">🔐</Text>
                  ) : isEmpty ? null : (
                    <Text className={`text-2xl font-semibold ${keyText}`}>
                      {key}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Forgot PIN */}
      <TouchableOpacity
        className="mt-6"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Alert.alert(
            "Forgot PIN?",
            "You can reset your PIN by signing out and signing back in.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Sign Out",
                style: "destructive",
                onPress: () => {
                  // Handle sign out from app store
                },
              },
            ]
          );
        }}
        activeOpacity={0.7}
      >
        <Text className="text-primary-600 font-medium text-sm">
          Forgot PIN?
        </Text>
      </TouchableOpacity>

      {/* Lockout */}
      {attempts >= 5 && (
        <Animated.View
          entering={FadeIn.duration(300)}
          className="mt-6 bg-red-50 dark:bg-red-900/30 rounded-xl px-6 py-3"
        >
          <Text className="text-red-600 dark:text-red-300 text-sm text-center font-medium">
            Too many attempts. Please wait or use biometric unlock.
          </Text>
        </Animated.View>
      )}
    </View>
  );
}
