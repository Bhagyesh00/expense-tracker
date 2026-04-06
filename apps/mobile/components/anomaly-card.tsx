import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, useColorScheme } from "react-native";
import Animated, {
  FadeInDown,
  FadeOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import type { Anomaly } from "@/lib/ai-service";

// ---------------------------------------------------------------------------
// Severity config
// ---------------------------------------------------------------------------

const severityConfig = {
  high: {
    color: "#EF4444",
    bgLight: "#FEF2F2",
    bgDark: "rgba(239, 68, 68, 0.12)",
    barColor: "#EF4444",
    label: "High",
    icon: "🔴",
  },
  medium: {
    color: "#F59E0B",
    bgLight: "#FFFBEB",
    bgDark: "rgba(245, 158, 11, 0.12)",
    barColor: "#F59E0B",
    label: "Medium",
    icon: "🟡",
  },
  low: {
    color: "#3B82F6",
    bgLight: "#EFF6FF",
    bgDark: "rgba(59, 130, 246, 0.12)",
    barColor: "#3B82F6",
    label: "Low",
    icon: "🔵",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AnomalyCardProps {
  anomaly: Anomaly;
  onDismiss?: (id: string) => void;
  onView?: (id: string) => void;
  index?: number;
}

const SWIPE_THRESHOLD = -80;

export default function AnomalyCard({
  anomaly,
  onDismiss,
  onView,
  index = 0,
}: AnomalyCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [visible, setVisible] = useState(true);

  const config = severityConfig[anomaly.severity] ?? severityConfig.low;
  const translateX = useSharedValue(0);
  const cardOpacity = useSharedValue(1);

  const bgColor = isDark ? config.bgDark : config.bgLight;
  const textPrimary = isDark ? "#F1F5F9" : "#0F172A";
  const textSecondary = isDark ? "#94A3B8" : "#64748B";
  const cardBorderColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const dismissCard = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    cardOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(setVisible)(false);
        if (onDismiss) runOnJS(onDismiss)(anomaly.id);
      }
    });
  }, [anomaly.id, onDismiss]);

  const swipeGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationX < 0) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (event.translationX < SWIPE_THRESHOLD) {
        translateX.value = withTiming(-400, { duration: 300 });
        runOnJS(dismissCard)();
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: cardOpacity.value,
  }));

  const deleteRevealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-80, -20],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  if (!visible) return null;

  const pct =
    anomaly.avgAmount > 0
      ? ((anomaly.amount - anomaly.avgAmount) / anomaly.avgAmount) * 100
      : 0;
  const pctStr = pct >= 0 ? `+${Math.round(pct)}%` : `${Math.round(pct)}%`;

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(index * 80).springify()}
      exiting={FadeOutLeft.duration(300)}
      style={{ marginBottom: 10, position: "relative" }}
    >
      {/* Delete background revealed on swipe */}
      <Animated.View
        style={[
          deleteRevealStyle,
          {
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 80,
            backgroundColor: "#EF4444",
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <Text style={{ fontSize: 20 }}>🗑️</Text>
        <Text style={{ color: "#fff", fontSize: 10, marginTop: 2 }}>Dismiss</Text>
      </Animated.View>

      <GestureDetector gesture={swipeGesture}>
        <Animated.View
          style={[
            cardAnimStyle,
            {
              backgroundColor: bgColor,
              borderWidth: 1,
              borderColor: cardBorderColor,
              borderRadius: 16,
              flexDirection: "row",
              overflow: "hidden",
            },
          ]}
        >
          {/* Left severity bar */}
          <View
            style={{
              width: 4,
              backgroundColor: config.barColor,
              borderTopLeftRadius: 16,
              borderBottomLeftRadius: 16,
            }}
          />

          {/* Content */}
          <View style={{ flex: 1, padding: 14 }}>
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                marginBottom: 6,
              }}
            >
              <Text style={{ fontSize: 18, marginRight: 10 }}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: textPrimary,
                    lineHeight: 18,
                  }}
                >
                  {anomaly.title}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: textSecondary,
                    marginTop: 2,
                    lineHeight: 16,
                  }}
                >
                  {anomaly.description}
                </Text>
              </View>
              {/* Severity badge */}
              <View
                style={{
                  backgroundColor: config.color + "20",
                  borderRadius: 20,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  marginLeft: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: config.color,
                  }}
                >
                  {config.label}
                </Text>
              </View>
            </View>

            {/* Amount row */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 10,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.03)",
                borderRadius: 10,
                padding: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: textSecondary,
                    marginBottom: 2,
                  }}
                >
                  Amount
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: config.barColor,
                  }}
                >
                  ₹{anomaly.amount.toLocaleString("en-IN")}
                </Text>
              </View>
              <View
                style={{
                  alignItems: "flex-end",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: textSecondary,
                    marginBottom: 2,
                  }}
                >
                  vs avg ₹{anomaly.avgAmount.toLocaleString("en-IN")}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: config.barColor,
                  }}
                >
                  {pctStr}
                </Text>
              </View>
            </View>

            {/* Date + Category */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 11, color: textSecondary }}>
                📅 {anomaly.date}
              </Text>
              {anomaly.category && (
                <>
                  <Text style={{ fontSize: 11, color: textSecondary, marginHorizontal: 6 }}>
                    ·
                  </Text>
                  <Text style={{ fontSize: 11, color: textSecondary }}>
                    🏷 {anomaly.category}
                  </Text>
                </>
              )}
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              {onView && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onView(anomaly.id);
                  }}
                  activeOpacity={0.7}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: config.barColor,
                    borderRadius: 10,
                    paddingVertical: 8,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: config.barColor,
                    }}
                  >
                    View
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={dismissCard}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.05)",
                  borderRadius: 10,
                  paddingVertical: 8,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: textSecondary,
                  }}
                >
                  Dismiss
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
