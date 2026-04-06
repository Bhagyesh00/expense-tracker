import { View, Text, TouchableOpacity, Alert, useColorScheme } from "react-native";
import * as Haptics from "expo-haptics";

// ---- Types ----

type ViolationSeverity = "critical" | "warning";

interface PolicyViolation {
  id: string;
  policyName: string;
  description: string;
  severity: ViolationSeverity;
}

interface PolicyViolationBadgeProps {
  violations: PolicyViolation[];
  compact?: boolean;
}

// ---- Helpers ----

function getSeverityConfig(severity: ViolationSeverity) {
  if (severity === "critical") {
    return {
      bgLight: "bg-red-50",
      bgDark: "bg-red-900/30",
      borderLight: "border-red-200",
      borderDark: "border-red-800",
      textLight: "text-red-700",
      textDark: "text-red-300",
      icon: "🔴",
      color: "#EF4444",
    };
  }
  return {
    bgLight: "bg-amber-50",
    bgDark: "bg-amber-900/30",
    borderLight: "border-amber-200",
    borderDark: "border-amber-800",
    textLight: "text-amber-700",
    textDark: "text-amber-300",
    icon: "🟡",
    color: "#F59E0B",
  };
}

// ---- Component ----

export default function PolicyViolationBadge({
  violations,
  compact = false,
}: PolicyViolationBadgeProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  if (violations.length === 0) return null;

  // Sort: critical first
  const sorted = [...violations].sort((a, b) =>
    a.severity === "critical" && b.severity !== "critical" ? -1 : 1
  );

  const highestSeverity = sorted[0].severity;
  const config = getSeverityConfig(highestSeverity);

  function handleTapViolation() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const details = sorted
      .map(
        (v) =>
          `${v.severity === "critical" ? "CRITICAL" : "Warning"}: ${v.policyName}\n${v.description}`
      )
      .join("\n\n");

    Alert.alert(
      `Policy Violation${violations.length > 1 ? "s" : ""}`,
      details,
      [{ text: "OK" }]
    );
  }

  // Compact mode: small badge for list items
  if (compact) {
    return (
      <TouchableOpacity
        onPress={handleTapViolation}
        activeOpacity={0.7}
        className="flex-row items-center"
      >
        <View
          className="rounded-full px-2 py-0.5 flex-row items-center gap-1"
          style={{ backgroundColor: config.color + "20" }}
        >
          <View
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          <Text
            className="text-[10px] font-semibold"
            style={{ color: config.color }}
          >
            {violations.length} violation{violations.length > 1 ? "s" : ""}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Full mode: banner for expense detail cards
  return (
    <TouchableOpacity
      onPress={handleTapViolation}
      activeOpacity={0.7}
    >
      <View
        className={`${isDark ? config.bgDark : config.bgLight} ${isDark ? config.borderDark : config.borderLight} border rounded-xl p-3 mb-3`}
      >
        <View className="flex-row items-center">
          <Text className="text-sm mr-2">{config.icon}</Text>
          <View className="flex-1">
            <Text
              className={`text-xs font-semibold ${isDark ? config.textDark : config.textLight}`}
            >
              {violations.length} Policy Violation{violations.length > 1 ? "s" : ""}
            </Text>
            <Text
              className={`text-[10px] ${isDark ? config.textDark : config.textLight} mt-0.5`}
              style={{ opacity: 0.8 }}
              numberOfLines={1}
            >
              {sorted[0].policyName}
              {violations.length > 1 ? ` +${violations.length - 1} more` : ""}
            </Text>
          </View>
          <Text className={`text-xs ${isDark ? config.textDark : config.textLight}`}>
            Tap for details
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
