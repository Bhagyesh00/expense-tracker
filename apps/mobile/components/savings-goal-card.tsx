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

export interface SavingsGoalCardProps {
  id: string;
  name: string;
  icon: string;
  color: string;
  currentAmount: number;
  targetAmount: number;
  targetDate: string | null;
  isCompleted: boolean;
  index?: number;
  onAddFunds?: (id: string) => void;
}

export default function SavingsGoalCard({
  id,
  name,
  icon,
  color,
  currentAmount,
  targetAmount,
  targetDate,
  isCompleted,
  index = 0,
  onAddFunds,
}: SavingsGoalCardProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const percentage = targetAmount > 0
    ? Math.min((currentAmount / targetAmount) * 100, 100)
    : 0;

  const progressWidth = useSharedValue(0);

  useEffect(() => {
    progressWidth.value = withDelay(
      index * 80 + 200,
      withTiming(percentage, { duration: 900, easing: Easing.out(Easing.cubic) })
    );
  }, [percentage]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  // Calculate days remaining
  let daysRemaining: number | null = null;
  if (targetDate && !isCompleted) {
    const now = new Date();
    const target = new Date(targetDate);
    const diff = target.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const remaining = targetAmount - currentAmount;
  const themeColor = isCompleted ? "#10B981" : color;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 80)}>
      <TouchableOpacity
        className={`${isDark ? "bg-slate-800" : "bg-white"} rounded-2xl p-4 mb-3`}
        style={{
          shadowColor: isDark ? "#000" : "#64748B",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.2 : 0.08,
          shadowRadius: 4,
          elevation: 2,
          ...(isCompleted
            ? {
                borderWidth: 1.5,
                borderColor: "#10B98140",
              }
            : {}),
        }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/budgets/${id}?type=goal`);
        }}
        activeOpacity={0.7}
      >
        {/* Header row */}
        <View className="flex-row items-center mb-3">
          <View
            className="w-10 h-10 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: themeColor + "20" }}
          >
            <Text className="text-lg">{isCompleted ? "\u2705" : icon}</Text>
          </View>

          <View className="flex-1">
            <Text
              className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
              numberOfLines={1}
            >
              {name}
            </Text>
            {isCompleted ? (
              <Text className="text-xs font-medium text-green-500 mt-0.5">
                Goal Achieved!
              </Text>
            ) : daysRemaining !== null ? (
              <Text className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"} mt-0.5`}>
                {daysRemaining === 0
                  ? "Due today"
                  : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`}
              </Text>
            ) : null}
          </View>

          {/* Days badge or completed badge */}
          {isCompleted ? (
            <View className="bg-green-100 dark:bg-green-900/30 rounded-full px-2.5 py-1">
              <Text className="text-xs font-bold text-green-600">Done</Text>
            </View>
          ) : daysRemaining !== null && daysRemaining <= 30 ? (
            <View
              className={`rounded-full px-2.5 py-1 ${
                daysRemaining <= 7
                  ? isDark ? "bg-red-900/30" : "bg-red-50"
                  : isDark ? "bg-amber-900/30" : "bg-amber-50"
              }`}
            >
              <Text
                className="text-xs font-bold"
                style={{ color: daysRemaining <= 7 ? "#EF4444" : "#F59E0B" }}
              >
                {daysRemaining}d
              </Text>
            </View>
          ) : null}
        </View>

        {/* Progress bar */}
        <View
          className={`h-2.5 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-slate-100"}`}
        >
          <Animated.View
            className="h-full rounded-full"
            style={[
              progressStyle,
              { backgroundColor: themeColor },
            ]}
          />
        </View>

        {/* Amounts and quick add row */}
        <View className="flex-row items-center justify-between mt-2.5">
          <Text className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            <Text className="font-semibold" style={{ color: themeColor }}>
              {"\u20B9"}{currentAmount.toLocaleString("en-IN")}
            </Text>
            {" / \u20B9"}{targetAmount.toLocaleString("en-IN")}
          </Text>

          {!isCompleted && onAddFunds && (
            <TouchableOpacity
              className="rounded-lg px-3 py-1.5"
              style={{ backgroundColor: themeColor + "15" }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onAddFunds(id);
              }}
              activeOpacity={0.7}
            >
              <Text className="text-xs font-semibold" style={{ color: themeColor }}>
                + Add {"\u20B9"}
              </Text>
            </TouchableOpacity>
          )}

          {!isCompleted && !onAddFunds && (
            <Text className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              {"\u20B9"}{remaining.toLocaleString("en-IN")} to go
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
