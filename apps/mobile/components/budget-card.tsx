import { View, Text, TouchableOpacity, useColorScheme } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";

export interface BudgetCardProps {
  id: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  spent: number;
  budget: number;
  period: string;
  index?: number;
}

export default function BudgetCard({
  id,
  categoryName,
  categoryIcon,
  categoryColor,
  spent,
  budget,
  period,
  index = 0,
}: BudgetCardProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const actualPercentage = budget > 0 ? (spent / budget) * 100 : 0;
  const isOverBudget = spent > budget;
  const isNearLimit = !isOverBudget && actualPercentage >= 80;
  const remaining = budget - spent;

  const progressWidth = useSharedValue(0);

  useEffect(() => {
    progressWidth.value = withDelay(
      index * 80 + 200,
      withTiming(percentage, { duration: 800, easing: Easing.out(Easing.cubic) })
    );
  }, [percentage]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const statusColor = isOverBudget
    ? "#EF4444"
    : isNearLimit
      ? "#F59E0B"
      : "#10B981";

  const statusBg = isOverBudget
    ? isDark ? "bg-red-900/30" : "bg-red-50"
    : isNearLimit
      ? isDark ? "bg-amber-900/30" : "bg-amber-50"
      : isDark ? "bg-green-900/30" : "bg-green-50";

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 80)}>
      <TouchableOpacity
        className={`${isDark ? "bg-slate-800" : "bg-white"} rounded-2xl p-4 mb-3`}
        style={{
          shadowColor: isOverBudget ? "#EF4444" : isDark ? "#000" : "#64748B",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isOverBudget ? 0.25 : isDark ? 0.2 : 0.08,
          shadowRadius: isOverBudget ? 8 : 4,
          elevation: isOverBudget ? 6 : 2,
        }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/budgets/${id}`);
        }}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center mb-3">
          {/* Category icon */}
          <View
            className="w-10 h-10 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: categoryColor + "20" }}
          >
            <Text className="text-lg">{categoryIcon}</Text>
          </View>

          {/* Name and period */}
          <View className="flex-1">
            <Text
              className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
              numberOfLines={1}
            >
              {categoryName}
            </Text>
            <Text className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"} mt-0.5`}>
              {period}
            </Text>
          </View>

          {/* Percentage badge */}
          <View
            className={`${statusBg} rounded-full px-2.5 py-1`}
          >
            <Text
              className="text-xs font-bold"
              style={{ color: statusColor }}
            >
              {Math.round(actualPercentage)}%
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View
          className={`h-2.5 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-slate-100"}`}
        >
          <Animated.View
            className="h-full rounded-full"
            style={[
              progressStyle,
              { backgroundColor: statusColor },
            ]}
          />
        </View>

        {/* Amounts row */}
        <View className="flex-row items-center justify-between mt-2.5">
          <Text className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            <Text className="font-semibold" style={{ color: statusColor }}>
              {"\u20B9"}{spent.toLocaleString("en-IN")}
            </Text>
            {" / \u20B9"}{budget.toLocaleString("en-IN")}
          </Text>

          {isOverBudget ? (
            <Text className="text-xs font-bold text-red-500">
              Over by {"\u20B9"}{Math.abs(remaining).toLocaleString("en-IN")}
            </Text>
          ) : (
            <Text className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              {"\u20B9"}{remaining.toLocaleString("en-IN")} left
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
