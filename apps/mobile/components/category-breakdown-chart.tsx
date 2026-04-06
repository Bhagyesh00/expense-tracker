import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  useColorScheme,
} from "react-native";
import { PieChart } from "react-native-chart-kit";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const screenWidth = Dimensions.get("window").width;

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}

interface CategoryBreakdownChartProps {
  data: CategoryBreakdownItem[];
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

function SkeletonChart() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <View className="items-center py-6">
      <View
        className={`w-40 h-40 rounded-full ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
      />
      <View className="mt-4 w-full px-4">
        {[0, 1, 2, 3].map((i) => (
          <View key={i} className="flex-row items-center mb-3">
            <View
              className={`w-3 h-3 rounded-full mr-2 ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
            />
            <View
              className={`flex-1 h-3 rounded ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

export default function CategoryBreakdownChart({
  data,
  isLoading,
  currency = "INR",
}: CategoryBreakdownChartProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (isLoading) {
    return <SkeletonChart />;
  }

  if (!data || data.length === 0) {
    return (
      <View className="items-center py-10">
        <Text className="text-4xl mb-3">📊</Text>
        <Text
          className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}
        >
          No category data available
        </Text>
        <Text
          className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}
        >
          Add expenses to see your breakdown
        </Text>
      </View>
    );
  }

  const totalAmount = data.reduce((sum, item) => sum + item.totalAmount, 0);

  const pieData = data.map((item, index) => ({
    name: item.categoryName,
    amount: item.totalAmount,
    color: item.categoryColor ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    legendFontColor: isDark ? "#94A3B8" : "#334155",
    legendFontSize: 12,
  }));

  const chartConfig = {
    backgroundColor: "transparent",
    backgroundGradientFrom: "transparent",
    backgroundGradientTo: "transparent",
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: () => (isDark ? "#CBD5E1" : "#64748B"),
  };

  return (
    <Animated.View entering={FadeIn.duration(500)}>
      {/* Pie Chart */}
      <View className="items-center relative">
        <PieChart
          data={pieData}
          width={screenWidth - 80}
          height={200}
          chartConfig={chartConfig}
          accessor="amount"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[0, 0]}
          hasLegend={false}
          absolute
        />
        {/* Center overlay: total amount */}
        <View
          className="absolute items-center justify-center"
          style={{ top: 70, left: "50%", marginLeft: -50, width: 100 }}
        >
          <Text
            className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            Total
          </Text>
          <Text
            className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatAmount(totalAmount, currency)}
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View className="mt-4 px-2">
        {data.map((item, index) => {
          const color =
            item.categoryColor ??
            DEFAULT_COLORS[index % DEFAULT_COLORS.length];
          const isSelected = selectedIndex === index;

          return (
            <TouchableOpacity
              key={item.categoryId}
              className={`flex-row items-center py-2.5 px-3 rounded-xl mb-1 ${
                isSelected
                  ? isDark
                    ? "bg-slate-700"
                    : "bg-slate-100"
                  : ""
              }`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedIndex(isSelected ? null : index);
              }}
              activeOpacity={0.7}
            >
              {/* Color dot */}
              <View
                className="w-3 h-3 rounded-full mr-3"
                style={{ backgroundColor: color }}
              />

              {/* Icon & Name */}
              <Text className="text-sm mr-1">
                {item.categoryIcon ?? "📁"}
              </Text>
              <Text
                className={`flex-1 text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}
                numberOfLines={1}
              >
                {item.categoryName}
              </Text>

              {/* Amount & Percentage */}
              <View className="items-end">
                <Text
                  className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
                >
                  {formatAmount(item.totalAmount, currency)}
                </Text>
                <Text
                  className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
                >
                  {item.percentage.toFixed(1)}%
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
}
