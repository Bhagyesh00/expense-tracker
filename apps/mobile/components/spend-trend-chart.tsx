import { useState } from "react";
import {
  View,
  Text,
  Dimensions,
  useColorScheme,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import Animated, { FadeIn } from "react-native-reanimated";

const screenWidth = Dimensions.get("window").width;

export interface SpendTrendPoint {
  month: string;
  year: number;
  monthNum: number;
  totalExpenses: number;
  totalIncome: number;
}

interface SpendTrendChartProps {
  data: SpendTrendPoint[];
  isLoading?: boolean;
  currency?: string;
}

function formatShortAmount(amount: number, currency: string = "INR"): string {
  const symbols: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };
  const symbol = symbols[currency] ?? "";
  if (amount >= 100000) return `${symbol}${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(0)}K`;
  return `${symbol}${Math.round(amount)}`;
}

function SkeletonChart() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <View className="items-center py-6">
      <View
        className={`w-full h-48 rounded-2xl ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
      />
    </View>
  );
}

export default function SpendTrendChart({
  data,
  isLoading,
  currency = "INR",
}: SpendTrendChartProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    value: number;
    index: number;
    datasetIndex: number;
  } | null>(null);

  if (isLoading) {
    return <SkeletonChart />;
  }

  if (!data || data.length === 0) {
    return (
      <View className="items-center py-10">
        <Text className="text-4xl mb-3">📈</Text>
        <Text
          className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}
        >
          No trend data available
        </Text>
        <Text
          className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}
        >
          Spend across months to see your trend
        </Text>
      </View>
    );
  }

  const labels = data.map((p) => p.month);
  const expenseData = data.map((p) => p.totalExpenses || 0);
  const incomeData = data.map((p) => p.totalIncome || 0);

  // Ensure we have at least some non-zero data for the chart
  const hasExpenses = expenseData.some((v) => v > 0);
  const hasIncome = incomeData.some((v) => v > 0);

  const datasets = [];
  if (hasExpenses || !hasIncome) {
    datasets.push({
      data: expenseData.length > 0 ? expenseData : [0],
      color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
      strokeWidth: 2,
    });
  }
  if (hasIncome) {
    datasets.push({
      data: incomeData,
      color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
      strokeWidth: 2,
    });
  }

  const chartConfig = {
    backgroundColor: "transparent",
    backgroundGradientFrom: isDark ? "#1E293B" : "#FFFFFF",
    backgroundGradientTo: isDark ? "#1E293B" : "#FFFFFF",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: () => (isDark ? "#94A3B8" : "#64748B"),
    style: { borderRadius: 16 },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: isDark ? "#334155" : "#E2E8F0",
    },
    propsForBackgroundLines: {
      stroke: isDark ? "#334155" : "#F1F5F9",
      strokeDasharray: "4 4",
    },
    fillShadowGradientFrom: isDark ? "#1E293B" : "#FFFFFF",
    fillShadowGradientTo: isDark ? "#1E293B" : "#FFFFFF",
    fillShadowGradientOpacity: 0,
  };

  const chartWidth = screenWidth - 60;

  return (
    <Animated.View entering={FadeIn.duration(500)}>
      {/* Legend */}
      <View className="flex-row items-center justify-center mb-3 gap-5">
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-red-500 mr-1.5" />
          <Text
            className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            Expenses
          </Text>
        </View>
        {hasIncome && (
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-green-500 mr-1.5" />
            <Text
              className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
            >
              Income
            </Text>
          </View>
        )}
      </View>

      {/* Chart */}
      <View className="items-center relative">
        <LineChart
          data={{
            labels,
            datasets,
          }}
          width={chartWidth}
          height={220}
          chartConfig={chartConfig as any}
          bezier
          style={{ borderRadius: 16 }}
          withInnerLines={true}
          withOuterLines={false}
          yAxisLabel=""
          yAxisSuffix=""
          fromZero
          onDataPointClick={(pointData) => {
            setTooltip({
              x: pointData.x,
              y: pointData.y,
              value: pointData.value,
              index: pointData.index,
              datasetIndex: pointData.dataset ? datasets.indexOf(pointData.dataset) : 0,
            });
            setTimeout(() => setTooltip(null), 2500);
          }}
          formatYLabel={(val) => {
            const num = parseFloat(val);
            if (num >= 100000) return `${(num / 100000).toFixed(0)}L`;
            if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
            return val;
          }}
        />

        {/* Tooltip */}
        {tooltip && (
          <View
            className={`absolute px-3 py-1.5 rounded-lg ${isDark ? "bg-slate-700" : "bg-slate-800"}`}
            style={{
              left: Math.min(
                Math.max(tooltip.x - 40, 10),
                chartWidth - 90
              ),
              top: Math.max(tooltip.y - 40, 5),
            }}
          >
            <Text className="text-white text-xs font-semibold">
              {formatShortAmount(tooltip.value, currency)}
            </Text>
            <Text className="text-white/60 text-xs">
              {tooltip.datasetIndex === 0 ? "Expense" : "Income"}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
