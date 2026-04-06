import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  TextInput,
  useColorScheme,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

// ---- Types ----

type RolloverMode = "full" | "partial" | "capped";

interface BudgetRolloverSettingsProps {
  budgetAmount: number;
  unusedAmount: number;
  /** Current rollover settings persisted to budget */
  value?: {
    enabled: boolean;
    mode: RolloverMode;
    partialPercent: number; // 0-100
    cappedAmount: number;
  };
  onChange?: (settings: {
    enabled: boolean;
    mode: RolloverMode;
    partialPercent: number;
    cappedAmount: number;
  }) => void;
  currency?: string;
}

function formatCurrency(amount: number, currency = "INR"): string {
  const symbol = currency === "INR" ? "₹" : "$";
  return `${symbol}${amount.toLocaleString("en-IN")}`;
}

// ---- Percentage Slider ----

function PercentSlider({
  value,
  onChange,
  isDark,
}: {
  value: number;
  onChange: (v: number) => void;
  isDark: boolean;
}) {
  const STEPS = [10, 20, 25, 33, 40, 50, 60, 66, 75, 80, 90, 100];

  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={{ fontSize: 12, color: isDark ? "#64748B" : "#94A3B8", fontWeight: "500" }}>
          0%
        </Text>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "800",
            color: "#4F46E5",
          }}
        >
          {value}%
        </Text>
        <Text style={{ fontSize: 12, color: isDark ? "#64748B" : "#94A3B8", fontWeight: "500" }}>
          100%
        </Text>
      </View>

      {/* Step Buttons */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {STEPS.map((step) => {
          const active = step === value;
          return (
            <TouchableOpacity
              key={step}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                borderWidth: 1.5,
                borderColor: active ? "#4F46E5" : isDark ? "#334155" : "#E2E8F0",
                backgroundColor: active
                  ? isDark ? "#312E81" : "#EEF2FF"
                  : "transparent",
              }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange(step);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: active ? "#4F46E5" : isDark ? "#64748B" : "#94A3B8",
                }}
              >
                {step}%
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ---- Main Component ----

export default function BudgetRolloverSettings({
  budgetAmount,
  unusedAmount,
  value,
  onChange,
  currency = "INR",
}: BudgetRolloverSettingsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [enabled, setEnabled] = useState(value?.enabled ?? false);
  const [mode, setMode] = useState<RolloverMode>(value?.mode ?? "full");
  const [partialPercent, setPartialPercent] = useState(value?.partialPercent ?? 50);
  const [cappedAmountStr, setCappedAmountStr] = useState(
    value?.cappedAmount ? String(value.cappedAmount) : ""
  );

  const bg = isDark ? "#1E293B" : "#FFFFFF";
  const inputBg = isDark ? "#0F172A" : "#F8FAFC";
  const textPrimary = isDark ? "#F8FAFC" : "#0F172A";
  const textSecondary = isDark ? "#94A3B8" : "#64748B";
  const border = isDark ? "#334155" : "#E2E8F0";

  function computeRolloverPreview(): number {
    if (!enabled || unusedAmount <= 0) return 0;
    switch (mode) {
      case "full":
        return unusedAmount;
      case "partial":
        return Math.round(unusedAmount * (partialPercent / 100));
      case "capped": {
        const cap = parseFloat(cappedAmountStr) || 0;
        return Math.min(unusedAmount, cap);
      }
      default:
        return 0;
    }
  }

  const rolloverPreview = computeRolloverPreview();

  function emit() {
    onChange?.({
      enabled,
      mode,
      partialPercent,
      cappedAmount: parseFloat(cappedAmountStr) || 0,
    });
  }

  function handleToggle(val: boolean) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEnabled(val);
    onChange?.({ enabled: val, mode, partialPercent, cappedAmount: parseFloat(cappedAmountStr) || 0 });
  }

  function handleModeChange(newMode: RolloverMode) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(newMode);
    onChange?.({ enabled, mode: newMode, partialPercent, cappedAmount: parseFloat(cappedAmountStr) || 0 });
  }

  const MODES: { value: RolloverMode; label: string; icon: string; desc: string }[] = [
    { value: "full", label: "Full", icon: "💯", desc: "Carry forward 100% of unused budget" },
    { value: "partial", label: "Partial", icon: "📊", desc: "Carry a percentage of unused budget" },
    { value: "capped", label: "Capped", icon: "🔒", desc: "Carry up to a maximum amount" },
  ];

  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 20,
        padding: 20,
        shadowColor: isDark ? "#000" : "#64748B",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.2 : 0.07,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      {/* Toggle Row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: enabled ? 20 : 0,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: textPrimary,
              marginBottom: 3,
            }}
          >
            Rollover Unused Budget
          </Text>
          <Text style={{ fontSize: 12, color: textSecondary, lineHeight: 17 }}>
            Add leftover budget to next month's limit
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          trackColor={{ false: "#CBD5E1", true: "#A5B4FC" }}
          thumbColor={enabled ? "#4F46E5" : "#F1F5F9"}
        />
      </View>

      {enabled && (
        <Animated.View entering={FadeInDown.duration(350)}>
          {/* Current Unused Budget */}
          <View
            style={{
              backgroundColor: isDark ? "#0F172A" : "#F1F5F9",
              borderRadius: 12,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <View>
              <Text style={{ fontSize: 11, fontWeight: "600", color: textSecondary, marginBottom: 2 }}>
                Current Unused Amount
              </Text>
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#10B981" }}>
                {formatCurrency(unusedAmount, currency)}
              </Text>
            </View>
            <Text style={{ fontSize: 28 }}>💰</Text>
          </View>

          {/* Mode Selector */}
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              marginBottom: 10,
            }}
          >
            Rollover Mode
          </Text>

          <View style={{ gap: 8, marginBottom: 20 }}>
            {MODES.map((m) => {
              const active = m.value === mode;
              return (
                <TouchableOpacity
                  key={m.value}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 14,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: active ? "#4F46E5" : border,
                    backgroundColor: active
                      ? isDark ? "#1E1B4B" : "#EEF2FF"
                      : inputBg,
                  }}
                  onPress={() => handleModeChange(m.value)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>{m.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: active ? "#4F46E5" : textPrimary,
                        marginBottom: 2,
                      }}
                    >
                      {m.label}
                    </Text>
                    <Text style={{ fontSize: 11, color: textSecondary, lineHeight: 15 }}>
                      {m.desc}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: active ? "#4F46E5" : border,
                      backgroundColor: active ? "#4F46E5" : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {active && (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "#fff",
                        }}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Partial Percent Controls */}
          {mode === "partial" && (
            <Animated.View entering={FadeInDown.duration(300)} style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 10,
                }}
              >
                Rollover Percentage
              </Text>
              <PercentSlider
                value={partialPercent}
                onChange={(v) => {
                  setPartialPercent(v);
                  onChange?.({ enabled, mode, partialPercent: v, cappedAmount: parseFloat(cappedAmountStr) || 0 });
                }}
                isDark={isDark}
              />
            </Animated.View>
          )}

          {/* Capped Amount Input */}
          {mode === "capped" && (
            <Animated.View entering={FadeInDown.duration(300)} style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 8,
                }}
              >
                Maximum Rollover Amount
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: inputBg,
                  borderWidth: 1.5,
                  borderColor: border,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    paddingLeft: 14,
                    fontSize: 18,
                    fontWeight: "700",
                    color: textSecondary,
                  }}
                >
                  ₹
                </Text>
                <TextInput
                  style={{
                    flex: 1,
                    paddingHorizontal: 8,
                    paddingVertical: 12,
                    fontSize: 18,
                    fontWeight: "700",
                    color: textPrimary,
                  }}
                  value={cappedAmountStr}
                  onChangeText={(t) => {
                    const cleaned = t.replace(/[^0-9.]/g, "");
                    setCappedAmountStr(cleaned);
                    onChange?.({
                      enabled,
                      mode,
                      partialPercent,
                      cappedAmount: parseFloat(cleaned) || 0,
                    });
                  }}
                  placeholder="0"
                  placeholderTextColor={isDark ? "#475569" : "#CBD5E1"}
                  keyboardType="decimal-pad"
                />
              </View>
            </Animated.View>
          )}

          {/* Preview */}
          <View
            style={{
              backgroundColor: isDark ? "#14532D" : "#DCFCE7",
              borderRadius: 14,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text style={{ fontSize: 12, fontWeight: "600", color: isDark ? "#6EE7B7" : "#059669", marginBottom: 2 }}>
                Rollover Preview
              </Text>
              <Text style={{ fontSize: 11, color: isDark ? "#6EE7B7" : "#059669" }}>
                Will be added to next month's budget
              </Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: isDark ? "#6EE7B7" : "#059669" }}>
              {formatCurrency(rolloverPreview, currency)}
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}
