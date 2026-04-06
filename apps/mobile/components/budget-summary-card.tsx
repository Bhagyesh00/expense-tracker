import { View, Text, useColorScheme } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface BudgetSummaryCardProps {
  totalBudget: number;
  totalSpent: number;
  periodLabel: string;
}

export default function BudgetSummaryCard({
  totalBudget,
  totalSpent,
  periodLabel,
}: BudgetSummaryCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const remaining = totalBudget - totalSpent;
  const percentage = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const actualPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const isOverBudget = totalSpent > totalBudget;

  // Circular progress animation
  const SIZE = 120;
  const STROKE_WIDTH = 10;
  const RADIUS = (SIZE - STROKE_WIDTH) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      300,
      withTiming(percentage / 100, { duration: 1200, easing: Easing.out(Easing.cubic) })
    );
  }, [percentage]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  const progressColor = isOverBudget
    ? "#EF4444"
    : actualPercentage >= 80
      ? "#F59E0B"
      : "#10B981";

  return (
    <Animated.View entering={FadeInDown.duration(500).delay(100)}>
      <View
        className={`${isDark ? "bg-slate-800" : "bg-white"} rounded-3xl p-5`}
        style={{
          shadowColor: isDark ? "#000" : "#64748B",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.25 : 0.1,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        <View className="flex-row items-center">
          {/* Circular Progress */}
          <View className="items-center justify-center mr-5">
            <Svg width={SIZE} height={SIZE}>
              {/* Background circle */}
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                stroke={isDark ? "#1E293B" : "#F1F5F9"}
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              {/* Progress circle */}
              <AnimatedCircle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                stroke={progressColor}
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                animatedProps={animatedProps}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              />
            </Svg>
            {/* Center text */}
            <View className="absolute items-center justify-center">
              <Text
                className="text-xl font-bold"
                style={{ color: progressColor }}
              >
                {Math.round(actualPercentage)}%
              </Text>
              <Text className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                used
              </Text>
            </View>
          </View>

          {/* Right side details */}
          <View className="flex-1">
            <View className="mb-3">
              <Text className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"} mb-0.5`}>
                Total Budget
              </Text>
              <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                {"\u20B9"}{totalBudget.toLocaleString("en-IN")}
              </Text>
            </View>

            <View className="flex-row gap-4">
              <View>
                <Text className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"} mb-0.5`}>
                  Spent
                </Text>
                <Text
                  className="text-sm font-bold"
                  style={{ color: isOverBudget ? "#EF4444" : isDark ? "#CBD5E1" : "#475569" }}
                >
                  {"\u20B9"}{totalSpent.toLocaleString("en-IN")}
                </Text>
              </View>
              <View>
                <Text className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"} mb-0.5`}>
                  Remaining
                </Text>
                <Text
                  className="text-sm font-bold"
                  style={{ color: isOverBudget ? "#EF4444" : "#10B981" }}
                >
                  {isOverBudget ? "-" : ""}{"\u20B9"}{Math.abs(remaining).toLocaleString("en-IN")}
                </Text>
              </View>
            </View>

            <View
              className={`mt-3 self-start rounded-full px-2.5 py-1 ${
                isDark ? "bg-slate-700" : "bg-slate-100"
              }`}
            >
              <Text className={`text-[10px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {periodLabel}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
