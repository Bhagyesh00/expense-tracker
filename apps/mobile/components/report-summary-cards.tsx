import { View, Text, ScrollView, useColorScheme } from "react-native";
import Animated, { FadeIn, FadeInRight } from "react-native-reanimated";

export interface SummaryData {
  totalSpent: number;
  totalIncome: number;
  netSavings: number;
  savingsRate: number;
  avgDailySpend: number;
  previousTotalSpent?: number;
  previousTotalIncome?: number;
  previousNetSavings?: number;
  previousSavingsRate?: number;
  previousAvgDailySpend?: number;
}

interface ReportSummaryCardsProps {
  data: SummaryData | null;
  isLoading?: boolean;
  currency?: string;
}

function formatAmount(amount: number, currency: string = "INR"): string {
  const symbols: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };
  const symbol = symbols[currency] ?? currency + " ";
  if (Math.abs(amount) >= 100000) {
    return `${symbol}${(amount / 100000).toFixed(1)}L`;
  }
  if (Math.abs(amount) >= 1000) {
    return `${symbol}${(amount / 1000).toFixed(1)}K`;
  }
  return `${symbol}${Math.round(amount).toLocaleString("en-IN")}`;
}

function getTrendArrow(
  current: number,
  previous: number | undefined
): { arrow: string; color: string; percentage: string } | null {
  if (previous == null || previous === 0) return null;
  const diff = ((current - previous) / previous) * 100;
  if (Math.abs(diff) < 0.5) return null;
  return {
    arrow: diff > 0 ? "↑" : "↓",
    color: diff > 0 ? "text-red-500" : "text-green-500",
    percentage: `${Math.abs(diff).toFixed(1)}%`,
  };
}

function getTrendArrowIncome(
  current: number,
  previous: number | undefined
): { arrow: string; color: string; percentage: string } | null {
  if (previous == null || previous === 0) return null;
  const diff = ((current - previous) / previous) * 100;
  if (Math.abs(diff) < 0.5) return null;
  return {
    arrow: diff > 0 ? "↑" : "↓",
    color: diff > 0 ? "text-green-500" : "text-red-500",
    percentage: `${Math.abs(diff).toFixed(1)}%`,
  };
}

interface CardData {
  label: string;
  value: string;
  accentColor: string;
  accentBg: string;
  icon: string;
  trend: { arrow: string; color: string; percentage: string } | null;
}

function SkeletonCard({ index }: { index: number }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <Animated.View
      entering={FadeInRight.duration(400).delay(index * 80)}
      className={`w-40 mr-3 rounded-2xl p-4 ${isDark ? "bg-slate-800" : "bg-white"}`}
      style={{
        shadowColor: isDark ? "#000" : "#64748B",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.2 : 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <View
        className={`w-8 h-8 rounded-xl mb-3 ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
      />
      <View
        className={`w-20 h-5 rounded mb-2 ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
      />
      <View
        className={`w-16 h-3 rounded ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
      />
    </Animated.View>
  );
}

export default function ReportSummaryCards({
  data,
  isLoading,
  currency = "INR",
}: ReportSummaryCardsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  if (isLoading || !data) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 4 }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} index={i} />
        ))}
      </ScrollView>
    );
  }

  const cards: CardData[] = [
    {
      label: "Total Spent",
      value: formatAmount(data.totalSpent, currency),
      accentColor: "text-red-500",
      accentBg: isDark ? "bg-red-900/30" : "bg-red-50",
      icon: "💸",
      trend: getTrendArrow(data.totalSpent, data.previousTotalSpent),
    },
    {
      label: "Total Income",
      value: formatAmount(data.totalIncome, currency),
      accentColor: "text-green-500",
      accentBg: isDark ? "bg-green-900/30" : "bg-green-50",
      icon: "💰",
      trend: getTrendArrowIncome(data.totalIncome, data.previousTotalIncome),
    },
    {
      label: "Net Savings",
      value: formatAmount(data.netSavings, currency),
      accentColor: data.netSavings >= 0 ? "text-emerald-500" : "text-red-500",
      accentBg:
        data.netSavings >= 0
          ? isDark
            ? "bg-emerald-900/30"
            : "bg-emerald-50"
          : isDark
            ? "bg-red-900/30"
            : "bg-red-50",
      icon: "🏦",
      trend: getTrendArrowIncome(data.netSavings, data.previousNetSavings),
    },
    {
      label: "Savings Rate",
      value: `${data.savingsRate.toFixed(1)}%`,
      accentColor: "text-indigo-500",
      accentBg: isDark ? "bg-indigo-900/30" : "bg-indigo-50",
      icon: "📊",
      trend: getTrendArrowIncome(data.savingsRate, data.previousSavingsRate),
    },
    {
      label: "Avg Daily Spend",
      value: formatAmount(data.avgDailySpend, currency),
      accentColor: "text-amber-500",
      accentBg: isDark ? "bg-amber-900/30" : "bg-amber-50",
      icon: "📅",
      trend: getTrendArrow(data.avgDailySpend, data.previousAvgDailySpend),
    },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 4 }}
    >
      {cards.map((card, index) => (
        <Animated.View
          key={card.label}
          entering={FadeInRight.duration(400).delay(index * 80)}
          className={`w-40 mr-3 rounded-2xl p-4 ${isDark ? "bg-slate-800" : "bg-white"}`}
          style={{
            shadowColor: isDark ? "#000" : "#64748B",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.2 : 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          {/* Icon */}
          <View
            className={`w-9 h-9 rounded-xl ${card.accentBg} items-center justify-center mb-3`}
          >
            <Text className="text-base">{card.icon}</Text>
          </View>

          {/* Value */}
          <Text
            className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"} mb-0.5`}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {card.value}
          </Text>

          {/* Label & Trend */}
          <View className="flex-row items-center justify-between">
            <Text
              className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
              numberOfLines={1}
            >
              {card.label}
            </Text>
            {card.trend && (
              <View className="flex-row items-center ml-1">
                <Text className={`text-xs font-semibold ${card.trend.color}`}>
                  {card.trend.arrow}
                  {card.trend.percentage}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      ))}
    </ScrollView>
  );
}
