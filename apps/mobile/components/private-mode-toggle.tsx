import { useCallback } from "react";
import {
  TouchableOpacity,
  View,
  Text,
  useColorScheme,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useAppStore } from "@/stores/app-store";

interface PrivateModeToggleProps {
  /** Size of the button (default: 40) */
  size?: number;
  /** Show label next to icon (default: false) */
  showLabel?: boolean;
}

export default function PrivateModeToggle({
  size = 40,
  showLabel = false,
}: PrivateModeToggleProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const { isPrivateMode, setIsPrivateMode } = useAppStore();

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Bounce animation
    scale.value = withSequence(
      withSpring(1.3, { damping: 5, stiffness: 300 }),
      withSpring(1, { damping: 8 })
    );

    setIsPrivateMode(!isPrivateMode);
  }, [isPrivateMode, setIsPrivateMode]);

  const eyeIcon = isPrivateMode ? "🙈" : "👁️";

  return (
    <TouchableOpacity
      onPress={handleToggle}
      activeOpacity={0.7}
      accessibilityLabel={isPrivateMode ? "Disable private mode" : "Enable private mode"}
      accessibilityRole="button"
    >
      <Animated.View
        style={[
          animatedStyle,
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          },
        ]}
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: isPrivateMode
              ? isDark
                ? "#312E81"
                : "#EEF2FF"
              : isDark
              ? "#1E293B"
              : "#F1F5F9",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: isPrivateMode ? 1.5 : 0,
            borderColor: isPrivateMode ? "#4F46E5" : "transparent",
          }}
        >
          <Text style={{ fontSize: size * 0.45 }}>{eyeIcon}</Text>
        </View>

        {showLabel && (
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: isPrivateMode
                ? "#4F46E5"
                : isDark
                ? "#64748B"
                : "#94A3B8",
            }}
          >
            {isPrivateMode ? "Private" : "Public"}
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

/**
 * Helper hook to get masked value based on private mode.
 * Usage: const { mask } = usePrivacyMask()
 *        mask("₹1,234") → "•••" when private mode is on
 */
export function usePrivacyMask() {
  const { isPrivateMode } = useAppStore();

  const mask = useCallback(
    (value: string, placeholder = "•••") => {
      return isPrivateMode ? placeholder : value;
    },
    [isPrivateMode]
  );

  const maskNumber = useCallback(
    (value: number, formatter: (n: number) => string, placeholder = "•••") => {
      return isPrivateMode ? placeholder : formatter(value);
    },
    [isPrivateMode]
  );

  return { mask, maskNumber, isPrivateMode };
}
