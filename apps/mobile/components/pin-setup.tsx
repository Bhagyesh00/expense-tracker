import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

// ---- Types ----

export interface PinSetupProps {
  /**
   * Called when the PIN is successfully set.
   * Receives the confirmed PIN as a string.
   */
  onComplete: (pin: string) => void;
  /** Called when the user cancels the setup (optional). */
  onCancel?: () => void;
  /** Title shown above the dots — defaults vary by step */
  title?: string;
}

// ---- Constants ----

const PIN_LENGTH = 4;

const KEYPAD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "delete"],
] as const;

// ---- Sub-components ----

interface PinDotsProps {
  length: number;
  filled: number;
  error: boolean;
  shakeX: ReturnType<typeof useSharedValue<number>>;
  isDark: boolean;
}

function PinDots({ length, filled, error, shakeX, isDark }: PinDotsProps) {
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  return (
    <Animated.View style={[styles.dotsRow, shakeStyle]}>
      {Array.from({ length }).map((_, i) => {
        const isFilled = i < filled;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: error
                  ? "#EF4444"
                  : isFilled
                  ? "#4F46E5"
                  : isDark
                  ? "#334155"
                  : "#E2E8F0",
                transform: [{ scale: isFilled && !error ? 1.15 : 1 }],
              },
            ]}
          />
        );
      })}
    </Animated.View>
  );
}

interface KeypadButtonProps {
  label: string;
  onPress: (key: string) => void;
  isDark: boolean;
}

function KeypadButton({ label, onPress, isDark }: KeypadButtonProps) {
  const isDelete = label === "delete";
  const isEmpty = label === "";

  if (isEmpty) {
    return <View style={styles.keyEmpty} />;
  }

  return (
    <TouchableOpacity
      style={[
        styles.key,
        {
          backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
        },
      ]}
      onPress={() => onPress(label)}
      activeOpacity={0.6}
    >
      {isDelete ? (
        <Text style={[styles.keyDelete, { color: isDark ? "#94A3B8" : "#64748B" }]}>
          ⌫
        </Text>
      ) : (
        <Text style={[styles.keyText, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ---- Main Component ----

type Step = "enter" | "confirm";

export default function PinSetup({ onComplete, onCancel, title }: PinSetupProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [step, setStep] = useState<Step>("enter");
  const [firstPin, setFirstPin] = useState("");
  const [currentDigits, setCurrentDigits] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const shakeX = useSharedValue(0);

  const doShake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(-14, { duration: 50 }),
      withTiming(14, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-5, { duration: 50 }),
      withSpring(0)
    );
  }, []);

  const handleKey = useCallback(
    (key: string) => {
      if (key === "delete") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentDigits((prev) => prev.slice(0, -1));
        setError(false);
        setErrorMessage("");
        return;
      }

      if (currentDigits.length >= PIN_LENGTH) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const newDigits = [...currentDigits, key];
      setCurrentDigits(newDigits);
      setError(false);
      setErrorMessage("");

      if (newDigits.length === PIN_LENGTH) {
        const pinStr = newDigits.join("");

        if (step === "enter") {
          // Move to confirm step
          setTimeout(() => {
            setFirstPin(pinStr);
            setStep("confirm");
            setCurrentDigits([]);
          }, 200);
        } else {
          // Confirm step
          if (pinStr === firstPin) {
            // Match!
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => {
              onComplete(pinStr);
            }, 150);
          } else {
            // Mismatch
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setError(true);
            setErrorMessage("PINs don't match, try again");
            doShake();
            setTimeout(() => {
              setStep("enter");
              setFirstPin("");
              setCurrentDigits([]);
              setError(false);
              setErrorMessage("");
            }, 700);
          }
        }
      }
    },
    [currentDigits, step, firstPin, onComplete, doShake]
  );

  const textPrimary = isDark ? "#F8FAFC" : "#0F172A";
  const textSecondary = isDark ? "#64748B" : "#94A3B8";

  const stepTitle =
    title ??
    (step === "enter" ? "Enter new PIN" : "Confirm PIN");
  const stepSubtitle =
    step === "enter"
      ? "Choose a 4-digit PIN to secure the app"
      : "Re-enter your PIN to confirm";

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View
        key={step}
        entering={SlideInRight.duration(250)}
        exiting={SlideOutLeft.duration(200)}
        style={styles.header}
      >
        <Text style={[styles.stepTitle, { color: textPrimary }]}>
          {stepTitle}
        </Text>
        <Text style={[styles.stepSubtitle, { color: textSecondary }]}>
          {stepSubtitle}
        </Text>
      </Animated.View>

      {/* Step indicator */}
      <View style={styles.stepDots}>
        {(["enter", "confirm"] as Step[]).map((s) => (
          <View
            key={s}
            style={[
              styles.stepDot,
              {
                backgroundColor:
                  step === s
                    ? "#4F46E5"
                    : isDark
                    ? "#334155"
                    : "#E2E8F0",
                width: step === s ? 20 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* PIN Dots */}
      <PinDots
        length={PIN_LENGTH}
        filled={currentDigits.length}
        error={error}
        shakeX={shakeX}
        isDark={isDark}
      />

      {/* Error message */}
      <View style={styles.errorContainer}>
        {errorMessage ? (
          <Animated.Text
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={styles.errorText}
          >
            {errorMessage}
          </Animated.Text>
        ) : null}
      </View>

      {/* Keypad */}
      <View style={styles.keypad}>
        {KEYPAD_ROWS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keyRow}>
            {row.map((key, keyIndex) => (
              <KeypadButton
                key={`${rowIndex}-${keyIndex}`}
                label={key}
                onPress={handleKey}
                isDark={isDark}
              />
            ))}
          </View>
        ))}
      </View>

      {/* Cancel */}
      {onCancel ? (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onCancel();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ---- Styles ----

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: "center",
  },
  stepSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  stepDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 32,
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
    transition: "width 200ms",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 12,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  errorContainer: {
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  keypad: {
    width: 300,
    gap: 12,
  },
  keyRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  key: {
    width: 80,
    height: 68,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  keyEmpty: {
    width: 80,
    height: 68,
  },
  keyText: {
    fontSize: 24,
    fontWeight: "600",
  },
  keyDelete: {
    fontSize: 22,
  },
  cancelButton: {
    marginTop: 28,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  cancelText: {
    color: "#4F46E5",
    fontSize: 15,
    fontWeight: "600",
  },
});
