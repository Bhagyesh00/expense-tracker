import { View, Text, useColorScheme } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

export interface BudgetComparison {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  budgetAmount: number;
  actualAmount: number;
  percentage: number;
}

interface BudgetComparisonChartProps {
  data: BudgetComparison[];
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

function SkeletonBars() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <View className="py-4">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} className="mb-5">
          <View
            className={`w-24 h-3 rounded mb-2 ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
          />
          <View
            className={`w-full h-6 rounded-lg ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
          />
        </View>
      ))}
    </View>
  );
}

export default function BudgetComparisonChart({
  data,
  isLoading,
  currency = "INR",
}: BudgetComparisonChartProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  if (isLoading) {
    return <SkeletonBars />;
  }

  if (!data || data.length === 0) {
    return (
      <View className="items-center py-10">
        <Text className="text-4xl mb-3">💰</Text>
        <Text
          className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}
        >
          No budgets to compare
        </Text>
        <Text
          className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}
        >
          Create budgets to track your spending limits
        </Text>
      </View>
    );
  }

  // Find max amount for scaling
  const maxAmount = Math.max(
    ...data.map((d) => Math.max(d.budgetAmount, d.actualAmount))
  );

  return (
    <Animated.View entering={FadeIn.duration(500)}>
      {/* Legend */}
      <View className="flex-row items-center justify-center mb-4 gap-5">
        <View className="flex-row items-center">
          <View
            className={`w-3 h-3 rounded-sm mr-1.5 ${isDark ? "bg-emerald-400" : "bg-emerald-500"}`}
          />
          <Text
            className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            Budget
          </Text>
        </View>
        <View className="flex-row items-center">
          <View
            className={`w-3 h-3 rounded-sm mr-1.5 ${isDark ? "bg-red-400" : "bg-red-500"}`}
          />
          <Text
            className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            Actual
          </Text>
        </View>
      </View>

      {/* Bars */}
      {data.map((item, index) => {
        const isOverBudget = item.actualAmount > item.budgetAmount;
        const budgetBarWidth =
          maxAmount > 0
            ? Math.max((item.budgetAmount / maxAmount) * 100, 2)
            : 0;
        const actualBarWidth =
          maxAmount > 0
            ? Math.max((item.actualAmount / maxAmount) * 100, 2)
            : 0;

        return (
          <Animated.View
            key={item.budgetId}
            entering={FadeInDown.duration(400).delay(index * 80)}
            className={`mb-4 px-1 py-3 rounded-xl ${
              isOverBudget
                ? isDark
                  ? "bg-red-900/15"
                  : "bg-red-50/80"
                : ""
            }`}
          >
            {/* Category header */}
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center flex-1">
                <Text className="text-sm mr-1.5">
                  {item.categoryIcon ?? "📁"}
                </Text>
                <Text
                  className={`text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}
                  numberOfLines={1}
                >
                  {item.categoryName}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text
                  className={`text-xs font-semibold ${
                    isOverBudget ? "text-red-500" : isDark ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  {Math.round(item.percentage)}%
                </Text>
                {isOverBudget && (
                  <View className="ml-1.5 bg-red-100 dark:bg-red-900/40 rounded px-1.5 py-0.5">
                    <Text className="text-red-600 dark:text-red-400 text-xs font-bold">
                      OVER
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Budget bar */}
            <View
              className={`h-3 rounded-full overflow-hidden mb-1.5 ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
            >
              <View
                className={`h-full rounded-full ${isDark ? "bg-emerald-400" : "bg-emerald-500"}`}
                style={{ width: `${budgetBarWidth}%` }}
              />
            </View>

            {/* Actual bar */}
            <View
              className={`h-3 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
            >
              <View
                className={`h-full rounded-full ${
                  isOverBudget
                    ? isDark
                      ? "bg-red-400"
                      : "bg-red-500"
                    : isDark
                      ? "bg-blue-400"
                      : "bg-blue-500"
                }`}
                style={{ width: `${actualBarWidth}%` }}
              />
            </View>

            {/* Amounts */}
            <View className="flex-row justify-between mt-1.5">
              <Text
                className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
              >
                Budget: {formatAmount(item.budgetAmount, currency)}
              </Text>
              <Text
                className={`text-xs font-medium ${
                  isOverBudget
                    ? "text-red-500"
                    : isDark
                      ? "text-slate-300"
                      : "text-slate-600"
                }`}
              >
                Spent: {formatAmount(item.actualAmount, currency)}
              </Text>
            </View>
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}
