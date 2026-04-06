import { useState } from "react";
import { View, Text, TouchableOpacity, useColorScheme } from "react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import type { CashFlowForecast } from "@/lib/ai-service";

// ---------------------------------------------------------------------------
// Bar Visualization
// ---------------------------------------------------------------------------

interface BarItemProps {
  label: string;
  income: number;
  expense: number;
  maxValue: number;
  isDark: boolean;
}

function BarItem({ label, income, expense, maxValue, isDark }: BarItemProps) {
  const incomeHeight = maxValue > 0 ? (income / maxValue) * 60 : 0;
  const expenseHeight = maxValue > 0 ? (expense / maxValue) * 60 : 0;

  return (
    <View style={{ alignItems: "center", flex: 1, paddingHorizontal: 4 }}>
      {/* Bars */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          height: 64,
          gap: 2,
        }}
      >
        {/* Income bar */}
        <View
          style={{
            width: 10,
            height: Math.max(incomeHeight, 4),
            backgroundColor: "#10B981",
            borderRadius: 3,
          }}
        />
        {/* Expense bar */}
        <View
          style={{
            width: 10,
            height: Math.max(expenseHeight, 4),
            backgroundColor: "#EF4444",
            borderRadius: 3,
          }}
        />
      </View>
      <Text
        style={{
          fontSize: 9,
          color: isDark ? "#64748B" : "#94A3B8",
          marginTop: 4,
          textAlign: "center",
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Period Tab
// ---------------------------------------------------------------------------

interface PeriodTabProps {
  label: string;
  active: boolean;
  onPress: () => void;
  isDark: boolean;
}

function PeriodTab({ label, active, onPress, isDark }: PeriodTabProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flex: 1,
        paddingVertical: 8,
        alignItems: "center",
        borderRadius: 10,
        backgroundColor: active
          ? "#6366F1"
          : isDark
          ? "rgba(255,255,255,0.05)"
          : "rgba(0,0,0,0.04)",
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: active ? "#fff" : isDark ? "#64748B" : "#94A3B8",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Confidence Badge
// ---------------------------------------------------------------------------

function ConfidenceBadge({
  percent,
  isDark,
}: {
  percent: number;
  isDark: boolean;
}) {
  const color =
    percent >= 80 ? "#10B981" : percent >= 60 ? "#F59E0B" : "#EF4444";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: color + "20",
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text style={{ fontSize: 10 }}>
        {percent >= 80 ? "🟢" : percent >= 60 ? "🟡" : "🔴"}
      </Text>
      <Text
        style={{ fontSize: 11, fontWeight: "700", color }}
      >
        {percent}% confidence
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface ForecastCardProps {
  forecasts: Record<30 | 60 | 90, CashFlowForecast | null>;
  onPeriodChange?: (period: 30 | 60 | 90) => void;
  isLoading?: boolean;
}

export default function ForecastCard({
  forecasts,
  onPeriodChange,
  isLoading = false,
}: ForecastCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [activePeriod, setActivePeriod] = useState<30 | 60 | 90>(30);

  const forecast = forecasts[activePeriod];

  const cardBg = isDark ? "#1E293B" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const textPrimary = isDark ? "#F1F5F9" : "#0F172A";
  const textSecondary = isDark ? "#94A3B8" : "#64748B";
  const sectionBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";

  function selectPeriod(period: 30 | 60 | 90) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActivePeriod(period);
    onPeriodChange?.(period);
  }

  const maxBarValue = forecast
    ? Math.max(
        ...forecast.breakdown.map((b) => Math.max(b.income, b.expense))
      )
    : 100;

  return (
    <Animated.View
      entering={FadeInDown.duration(500).delay(200).springify()}
      style={{
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: cardBorder,
        borderRadius: 20,
        padding: 16,
        shadowColor: isDark ? "#000" : "#6366F1",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.25 : 0.08,
        shadowRadius: 12,
        elevation: 5,
      }}
    >
      {/* Title */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <Text style={{ fontSize: 18, marginRight: 8 }}>📊</Text>
        <Text
          style={{ fontSize: 15, fontWeight: "700", color: textPrimary, flex: 1 }}
        >
          Cash Flow Forecast
        </Text>
        {forecast && (
          <ConfidenceBadge
            percent={forecast.confidencePercent}
            isDark={isDark}
          />
        )}
      </View>

      {/* Period Tabs */}
      <View
        style={{
          flexDirection: "row",
          gap: 6,
          marginBottom: 16,
          backgroundColor: isDark
            ? "rgba(255,255,255,0.04)"
            : "rgba(0,0,0,0.04)",
          borderRadius: 12,
          padding: 4,
        }}
      >
        {([30, 60, 90] as const).map((p) => (
          <PeriodTab
            key={p}
            label={`${p}d`}
            active={activePeriod === p}
            onPress={() => selectPeriod(p)}
            isDark={isDark}
          />
        ))}
      </View>

      {isLoading || !forecast ? (
        <View style={{ alignItems: "center", paddingVertical: 32 }}>
          <Text style={{ fontSize: 24 }}>⏳</Text>
          <Text style={{ color: textSecondary, marginTop: 8, fontSize: 12 }}>
            Calculating forecast...
          </Text>
        </View>
      ) : (
        <>
          {/* Projected Balance */}
          <View
            style={{
              alignItems: "center",
              backgroundColor: sectionBg,
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 11, color: textSecondary, marginBottom: 4 }}>
              Projected Balance in {activePeriod} days
            </Text>
            <Text
              style={{
                fontSize: 32,
                fontWeight: "800",
                color:
                  forecast.projectedBalance >= 0 ? "#10B981" : "#EF4444",
              }}
            >
              ₹{Math.abs(forecast.projectedBalance).toLocaleString("en-IN")}
            </Text>
            <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
              {forecast.projectedBalance >= 0 ? "positive" : "deficit"}
            </Text>
          </View>

          {/* Income / Expense / Savings breakdown */}
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginBottom: 14,
            }}
          >
            {/* Income */}
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                borderRadius: 12,
                padding: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 10, color: "#10B981", fontWeight: "600", marginBottom: 2 }}>
                Income
              </Text>
              <Text
                style={{ fontSize: 14, fontWeight: "800", color: "#10B981" }}
              >
                ₹{(forecast.projectedIncome / 1000).toFixed(0)}k
              </Text>
            </View>

            {/* Expenses */}
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                borderRadius: 12,
                padding: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 10, color: "#EF4444", fontWeight: "600", marginBottom: 2 }}>
                Expenses
              </Text>
              <Text
                style={{ fontSize: 14, fontWeight: "800", color: "#EF4444" }}
              >
                ₹{(forecast.projectedExpenses / 1000).toFixed(0)}k
              </Text>
            </View>

            {/* Savings */}
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(99, 102, 241, 0.1)",
                borderRadius: 12,
                padding: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 10, color: "#6366F1", fontWeight: "600", marginBottom: 2 }}>
                Savings
              </Text>
              <Text
                style={{ fontSize: 14, fontWeight: "800", color: "#6366F1" }}
              >
                ₹{(forecast.projectedSavings / 1000).toFixed(0)}k
              </Text>
            </View>
          </View>

          {/* Bar visualization */}
          {forecast.breakdown.length > 0 && (
            <View style={{ marginBottom: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  marginBottom: 8,
                }}
              >
                {forecast.breakdown.map((item, i) => (
                  <BarItem
                    key={i}
                    label={item.label}
                    income={item.income}
                    expense={item.expense}
                    maxValue={maxBarValue}
                    isDark={isDark}
                  />
                ))}
              </View>
              {/* Legend */}
              <View
                style={{ flexDirection: "row", justifyContent: "center", gap: 16 }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      backgroundColor: "#10B981",
                    }}
                  />
                  <Text style={{ fontSize: 10, color: textSecondary }}>
                    Income
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      backgroundColor: "#EF4444",
                    }}
                  />
                  <Text style={{ fontSize: 10, color: textSecondary }}>
                    Expenses
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Caption */}
          <Text
            style={{
              fontSize: 10,
              color: textSecondary,
              textAlign: "center",
              marginTop: 4,
            }}
          >
            Based on {forecast.dataMonths} months of data
          </Text>
        </>
      )}
    </Animated.View>
  );
}
