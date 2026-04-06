import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

export interface TopCategoryItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  totalAmount: number;
  percentage: number;
}

interface TopCategoriesListProps {
  data: TopCategoryItem[];
  isLoading?: boolean;
  currency?: string;
}

const DEFAULT_COLORS = [
  "#EF4444",
  "#F59E0B",
  "#6366F1",
  "#22C55E",
  "#EC4899",
  "#8B5CF6",
  "#14B8A6",
  "#F97316",
  "#06B6D4",
  "#94A3B8",
];

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
  return `${symbol}${amount.toLocaleString("en-IN")}`;
}

function SkeletonList() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <View className="py-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} className="flex-row items-center mb-4">
          <View
            className={`w-6 h-4 rounded mr-3 ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
          />
          <View
            className={`w-8 h-8 rounded-xl mr-3 ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
          />
          <View className="flex-1">
            <View
              className={`w-20 h-3 rounded mb-2 ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
            />
            <View
              className={`w-full h-2 rounded-full ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function TopCategoriesList({
  data,
  isLoading,
  currency = "INR",
}: TopCategoriesListProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return <SkeletonList />;
  }

  if (!data || data.length === 0) {
    return (
      <View className="items-center py-10">
        <Text className="text-4xl mb-3">🏷</Text>
        <Text
          className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}
        >
          No spending data
        </Text>
        <Text
          className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}
        >
          Your top categories will appear here
        </Text>
      </View>
    );
  }

  const sorted = [...data].sort((a, b) => b.totalAmount - a.totalAmount);
  const displayed = showAll ? sorted : sorted.slice(0, 5);
  const maxAmount = sorted[0]?.totalAmount ?? 1;

  return (
    <View>
      {displayed.map((item, index) => {
        const color =
          item.categoryColor ??
          DEFAULT_COLORS[index % DEFAULT_COLORS.length];
        const barWidth = Math.max(
          (item.totalAmount / maxAmount) * 100,
          3
        );

        return (
          <Animated.View
            key={item.categoryId}
            entering={FadeInDown.duration(400).delay(index * 60)}
            className="flex-row items-center mb-3.5"
          >
            {/* Rank */}
            <Text
              className={`w-6 text-sm font-bold ${
                index < 3
                  ? "text-primary-600"
                  : isDark
                    ? "text-slate-500"
                    : "text-slate-400"
              }`}
            >
              #{index + 1}
            </Text>

            {/* Icon */}
            <View
              className="w-9 h-9 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: color + "20" }}
            >
              <Text className="text-base">
                {item.categoryIcon ?? "📁"}
              </Text>
            </View>

            {/* Name, bar, amount */}
            <View className="flex-1">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text
                  className={`text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}
                  numberOfLines={1}
                >
                  {item.categoryName}
                </Text>
                <Text
                  className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
                >
                  {formatAmount(item.totalAmount, currency)}
                </Text>
              </View>

              {/* Progress bar */}
              <View className="flex-row items-center">
                <View
                  className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
                >
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: color,
                    }}
                  />
                </View>
                <Text
                  className={`ml-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"} w-10 text-right`}
                >
                  {item.percentage.toFixed(1)}%
                </Text>
              </View>
            </View>
          </Animated.View>
        );
      })}

      {/* Show All / Show Less */}
      {sorted.length > 5 && (
        <TouchableOpacity
          className={`mt-2 py-2.5 rounded-xl items-center ${isDark ? "bg-slate-700/50" : "bg-slate-100"}`}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAll(!showAll);
          }}
          activeOpacity={0.7}
        >
          <Text className="text-sm font-medium text-primary-600">
            {showAll
              ? "Show Less"
              : `Show All (${sorted.length} categories)`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
