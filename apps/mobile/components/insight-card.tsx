import { useState } from "react";
import { View, Text, TouchableOpacity, useColorScheme } from "react-native";
import Animated, {
  FadeInRight,
  FadeOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import type { AIInsight } from "@/lib/ai-service";

// ---------------------------------------------------------------------------
// Color config per insight type
// ---------------------------------------------------------------------------

const typeConfig = {
  warning: {
    accentColor: "#F59E0B",
    bgLight: "#FFFBEB",
    bgDark: "rgba(245, 158, 11, 0.1)",
    borderLight: "#FDE68A",
    borderDark: "rgba(245, 158, 11, 0.3)",
    badgeText: "Warning",
    badgeBgLight: "#FEF3C7",
    badgeBgDark: "rgba(245, 158, 11, 0.15)",
    badgeTextColor: "#D97706",
    recBgLight: "#FFFBEB",
    recBgDark: "rgba(245, 158, 11, 0.08)",
  },
  positive: {
    accentColor: "#10B981",
    bgLight: "#F0FDF4",
    bgDark: "rgba(16, 185, 129, 0.1)",
    borderLight: "#BBF7D0",
    borderDark: "rgba(16, 185, 129, 0.3)",
    badgeText: "Positive",
    badgeBgLight: "#D1FAE5",
    badgeBgDark: "rgba(16, 185, 129, 0.15)",
    badgeTextColor: "#059669",
    recBgLight: "#F0FDF4",
    recBgDark: "rgba(16, 185, 129, 0.08)",
  },
  trend: {
    accentColor: "#6366F1",
    bgLight: "#EEF2FF",
    bgDark: "rgba(99, 102, 241, 0.1)",
    borderLight: "#C7D2FE",
    borderDark: "rgba(99, 102, 241, 0.3)",
    badgeText: "Trend",
    badgeBgLight: "#E0E7FF",
    badgeBgDark: "rgba(99, 102, 241, 0.15)",
    badgeTextColor: "#4F46E5",
    recBgLight: "#EEF2FF",
    recBgDark: "rgba(99, 102, 241, 0.08)",
  },
  neutral: {
    accentColor: "#64748B",
    bgLight: "#F8FAFC",
    bgDark: "rgba(100, 116, 139, 0.1)",
    borderLight: "#E2E8F0",
    borderDark: "rgba(100, 116, 139, 0.3)",
    badgeText: "Info",
    badgeBgLight: "#F1F5F9",
    badgeBgDark: "rgba(100, 116, 139, 0.15)",
    badgeTextColor: "#475569",
    recBgLight: "#F8FAFC",
    recBgDark: "rgba(100, 116, 139, 0.08)",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface InsightCardProps {
  insight: AIInsight;
  onDismiss?: (id: string) => void;
  index?: number;
}

export default function InsightCard({
  insight,
  onDismiss,
  index = 0,
}: InsightCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [visible, setVisible] = useState(true);

  const config = typeConfig[insight.type] ?? typeConfig.neutral;
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  function handleDismiss() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withTiming(0.95, { duration: 150 });
    opacity.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(setVisible)(false);
        if (onDismiss) runOnJS(onDismiss)(insight.id);
      }
    });
  }

  if (!visible) return null;

  const bg = isDark ? config.bgDark : config.bgLight;
  const border = isDark ? config.borderDark : config.borderLight;
  const textPrimary = isDark ? "#F1F5F9" : "#0F172A";
  const textSecondary = isDark ? "#94A3B8" : "#64748B";
  const recBg = isDark ? config.recBgDark : config.recBgLight;

  return (
    <Animated.View
      entering={FadeInRight.duration(400).delay(index * 80).springify()}
      exiting={FadeOutLeft.duration(300)}
      style={[
        cardStyle,
        {
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: border,
          borderRadius: 20,
          padding: 16,
          marginRight: 12,
          width: 260,
        },
      ]}
    >
      {/* Header row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            backgroundColor: config.accentColor + "20",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Text style={{ fontSize: 20 }}>{insight.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: textPrimary,
              marginBottom: 2,
            }}
            numberOfLines={2}
          >
            {insight.title}
          </Text>
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: isDark
                ? config.badgeBgDark
                : config.badgeBgLight,
              borderRadius: 20,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "600",
                color: config.badgeTextColor,
              }}
            >
              {config.badgeText}
            </Text>
          </View>
        </View>
        {/* Dismiss button */}
        <TouchableOpacity
          onPress={handleDismiss}
          activeOpacity={0.7}
          style={{ padding: 4, marginLeft: 4 }}
        >
          <Text style={{ color: textSecondary, fontSize: 16 }}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Description */}
      <Text
        style={{
          fontSize: 12,
          color: textSecondary,
          lineHeight: 18,
          marginBottom: 10,
        }}
      >
        {insight.description}
      </Text>

      {/* Key metric */}
      {insight.metric && (
        <View style={{ marginBottom: 10 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: config.accentColor,
            }}
          >
            {insight.metric}
          </Text>
          {insight.metricLabel && (
            <Text style={{ fontSize: 11, color: textSecondary, marginTop: 1 }}>
              {insight.metricLabel}
            </Text>
          )}
        </View>
      )}

      {/* Recommendation */}
      {insight.recommendation && (
        <View
          style={{
            backgroundColor: recBg,
            borderRadius: 12,
            padding: 10,
            borderLeftWidth: 3,
            borderLeftColor: config.accentColor,
          }}
        >
          <Text
            style={{ fontSize: 11, color: textSecondary, lineHeight: 16 }}
          >
            💡 {insight.recommendation}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}
