import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  useColorScheme,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeIn,
  ZoomIn,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import AddFundsSheet, { type AddFundsSheetRef } from "@/components/add-funds-sheet";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ---- Mock data ----

interface BudgetDetail {
  id: string;
  type: "budget";
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  spent: number;
  budget: number;
  period: string;
  recentExpenses: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
  }>;
}

interface GoalDetail {
  id: string;
  type: "goal";
  name: string;
  icon: string;
  color: string;
  currentAmount: number;
  targetAmount: number;
  targetDate: string | null;
  isCompleted: boolean;
  fundHistory: Array<{
    id: string;
    amount: number;
    notes: string;
    date: string;
  }>;
}

type DetailData = BudgetDetail | GoalDetail;

const MOCK_BUDGET_DETAIL: BudgetDetail = {
  id: "b1",
  type: "budget",
  categoryName: "Food",
  categoryIcon: "\uD83C\uDF54",
  categoryColor: "#F59E0B",
  spent: 8200,
  budget: 10000,
  period: "Monthly",
  recentExpenses: [
    { id: "e1", description: "Swiggy order", amount: 450, date: "Today" },
    { id: "e2", description: "Zomato delivery", amount: 380, date: "Today" },
    { id: "e3", description: "Groceries - BigBasket", amount: 1200, date: "Yesterday" },
    { id: "e4", description: "Coffee - Starbucks", amount: 350, date: "Yesterday" },
    { id: "e5", description: "Lunch - Office canteen", amount: 180, date: "Mar 25" },
    { id: "e6", description: "Dinner - Restaurant", amount: 1500, date: "Mar 24" },
    { id: "e7", description: "Snacks", amount: 120, date: "Mar 24" },
    { id: "e8", description: "Grocery store", amount: 890, date: "Mar 23" },
    { id: "e9", description: "Swiggy order", amount: 520, date: "Mar 22" },
    { id: "e10", description: "Breakfast - Cafe", amount: 280, date: "Mar 21" },
  ],
};

const MOCK_GOAL_DETAIL: GoalDetail = {
  id: "g1",
  type: "goal",
  name: "Emergency Fund",
  icon: "\uD83D\uDEE1\uFE0F",
  color: "#3B82F6",
  currentAmount: 45000,
  targetAmount: 100000,
  targetDate: "2026-12-31",
  isCompleted: false,
  fundHistory: [
    { id: "f1", amount: 5000, notes: "Monthly savings", date: "Mar 1, 2026" },
    { id: "f2", amount: 5000, notes: "Monthly savings", date: "Feb 1, 2026" },
    { id: "f3", amount: 10000, notes: "Bonus deposit", date: "Jan 15, 2026" },
    { id: "f4", amount: 5000, notes: "Monthly savings", date: "Jan 1, 2026" },
    { id: "f5", amount: 5000, notes: "Monthly savings", date: "Dec 1, 2025" },
    { id: "f6", amount: 15000, notes: "Initial deposit", date: "Nov 15, 2025" },
  ],
};

// ---- Budget Detail View ----

function BudgetDetailView({ data, isDark }: { data: BudgetDetail; isDark: boolean }) {
  const router = useRouter();
  const percentage = data.budget > 0 ? Math.min((data.spent / data.budget) * 100, 100) : 0;
  const actualPercentage = data.budget > 0 ? (data.spent / data.budget) * 100 : 0;
  const isOverBudget = data.spent > data.budget;
  const remaining = data.budget - data.spent;

  const SIZE = 160;
  const STROKE_WIDTH = 14;
  const RADIUS = (SIZE - STROKE_WIDTH) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      400,
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

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardBg = isDark ? "bg-slate-800" : "bg-white";

  return (
    <>
      {/* Large circular progress */}
      <Animated.View
        entering={FadeInDown.duration(500).delay(100)}
        className="items-center mb-6"
      >
        <View
          className={`${cardBg} rounded-3xl p-6 items-center`}
          style={{
            shadowColor: isDark ? "#000" : "#64748B",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.25 : 0.1,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          {/* Category icon and name */}
          <View className="flex-row items-center mb-4">
            <View
              className="w-10 h-10 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: data.categoryColor + "20" }}
            >
              <Text className="text-lg">{data.categoryIcon}</Text>
            </View>
            <Text className={`text-lg font-bold ${textPrimary}`}>
              {data.categoryName}
            </Text>
            <View
              className={`ml-3 rounded-full px-2.5 py-1 ${isDark ? "bg-slate-700" : "bg-slate-100"}`}
            >
              <Text className={`text-[10px] font-medium ${textSecondary}`}>
                {data.period}
              </Text>
            </View>
          </View>

          {/* Ring */}
          <View className="items-center justify-center mb-4">
            <Svg width={SIZE} height={SIZE}>
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                stroke={isDark ? "#1E293B" : "#F1F5F9"}
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
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
            <View className="absolute items-center justify-center">
              <Text
                className="text-3xl font-bold"
                style={{ color: progressColor }}
              >
                {Math.round(actualPercentage)}%
              </Text>
              <Text className={`text-xs ${textSecondary}`}>
                {isOverBudget ? "over budget" : "used"}
              </Text>
            </View>
          </View>

          {/* Amount row */}
          <View className="flex-row gap-6">
            <View className="items-center">
              <Text className={`text-[10px] ${textSecondary} mb-0.5`}>Spent</Text>
              <Text
                className="text-base font-bold"
                style={{ color: isOverBudget ? "#EF4444" : isDark ? "#CBD5E1" : "#1E293B" }}
              >
                {"\u20B9"}{data.spent.toLocaleString("en-IN")}
              </Text>
            </View>
            <View className="items-center">
              <Text className={`text-[10px] ${textSecondary} mb-0.5`}>Budget</Text>
              <Text className={`text-base font-bold ${textPrimary}`}>
                {"\u20B9"}{data.budget.toLocaleString("en-IN")}
              </Text>
            </View>
            <View className="items-center">
              <Text className={`text-[10px] ${textSecondary} mb-0.5`}>Remaining</Text>
              <Text
                className="text-base font-bold"
                style={{ color: isOverBudget ? "#EF4444" : "#10B981" }}
              >
                {isOverBudget ? "-" : ""}{"\u20B9"}{Math.abs(remaining).toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Recent expenses */}
      <Animated.View entering={FadeInDown.duration(500).delay(300)}>
        <View className="flex-row items-center justify-between mb-3">
          <Text className={`text-sm font-semibold ${textSecondary} uppercase tracking-wider`}>
            Recent Expenses
          </Text>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/expenses");
            }}
            activeOpacity={0.7}
          >
            <Text className="text-xs text-primary-600 font-medium">
              View All
            </Text>
          </TouchableOpacity>
        </View>

        <View
          className={`${cardBg} rounded-2xl px-4`}
          style={{
            shadowColor: isDark ? "#000" : "#64748B",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.15 : 0.05,
            shadowRadius: 3,
            elevation: 1,
          }}
        >
          {data.recentExpenses.map((expense, index) => (
            <View key={expense.id}>
              <TouchableOpacity
                className="flex-row items-center py-3.5"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/expense/${expense.id}`);
                }}
                activeOpacity={0.7}
              >
                <View className="flex-1 mr-3">
                  <Text
                    className={`text-sm font-medium ${textPrimary}`}
                    numberOfLines={1}
                  >
                    {expense.description}
                  </Text>
                  <Text className={`text-xs ${textSecondary} mt-0.5`}>
                    {expense.date}
                  </Text>
                </View>
                <Text className={`text-sm font-bold ${textPrimary}`}>
                  -{"\u20B9"}{expense.amount.toLocaleString("en-IN")}
                </Text>
              </TouchableOpacity>
              {index < data.recentExpenses.length - 1 && (
                <View className={`h-px ${isDark ? "bg-slate-700" : "bg-slate-100"}`} />
              )}
            </View>
          ))}
        </View>
      </Animated.View>
    </>
  );
}

// ---- Goal Detail View ----

function GoalDetailView({
  data,
  isDark,
  onAddFunds,
}: {
  data: GoalDetail;
  isDark: boolean;
  onAddFunds: () => void;
}) {
  const percentage = data.targetAmount > 0
    ? Math.min((data.currentAmount / data.targetAmount) * 100, 100)
    : 0;
  const remaining = data.targetAmount - data.currentAmount;

  const progressWidth = useSharedValue(0);

  useEffect(() => {
    progressWidth.value = withDelay(
      400,
      withTiming(percentage, { duration: 1200, easing: Easing.out(Easing.cubic) })
    );
  }, [percentage]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  // Calculate days remaining
  let daysRemaining: number | null = null;
  if (data.targetDate && !data.isCompleted) {
    const now = new Date();
    const target = new Date(data.targetDate);
    const diff = target.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardBg = isDark ? "bg-slate-800" : "bg-white";
  const themeColor = data.isCompleted ? "#10B981" : data.color;

  return (
    <>
      {/* Completed banner */}
      {data.isCompleted && (
        <Animated.View
          entering={ZoomIn.duration(500)}
          className="bg-green-50 dark:bg-green-900/30 rounded-2xl p-4 mb-4 items-center"
        >
          <Text className="text-3xl mb-2">{"\uD83C\uDF89"}</Text>
          <Text className="text-lg font-bold text-green-600">Goal Achieved!</Text>
          <Text className={`text-sm ${textSecondary} text-center mt-1`}>
            Congratulations on reaching your savings goal!
          </Text>
        </Animated.View>
      )}

      {/* Main card */}
      <Animated.View entering={FadeInDown.duration(500).delay(data.isCompleted ? 200 : 100)}>
        <View
          className={`${cardBg} rounded-3xl p-6 mb-6`}
          style={{
            shadowColor: isDark ? "#000" : "#64748B",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.25 : 0.1,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          {/* Icon and name */}
          <View className="flex-row items-center mb-5">
            <View
              className="w-12 h-12 rounded-2xl items-center justify-center mr-3"
              style={{ backgroundColor: themeColor + "20" }}
            >
              <Text className="text-2xl">{data.isCompleted ? "\u2705" : data.icon}</Text>
            </View>
            <View className="flex-1">
              <Text className={`text-lg font-bold ${textPrimary}`}>
                {data.name}
              </Text>
              {daysRemaining !== null && (
                <Text className={`text-xs ${textSecondary} mt-0.5`}>
                  {daysRemaining === 0 ? "Due today" : `${daysRemaining} days remaining`}
                </Text>
              )}
              {data.isCompleted && (
                <Text className="text-xs text-green-500 mt-0.5 font-medium">Completed</Text>
              )}
            </View>
            {data.targetDate && (
              <View
                className={`rounded-full px-3 py-1.5 ${
                  daysRemaining !== null && daysRemaining <= 7
                    ? isDark ? "bg-red-900/30" : "bg-red-50"
                    : isDark ? "bg-slate-700" : "bg-slate-100"
                }`}
              >
                <Text
                  className="text-[10px] font-medium"
                  style={{
                    color:
                      daysRemaining !== null && daysRemaining <= 7
                        ? "#EF4444"
                        : isDark ? "#94A3B8" : "#64748B",
                  }}
                >
                  {new Date(data.targetDate).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
            )}
          </View>

          {/* Large progress bar */}
          <View
            className={`h-4 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-slate-100"} mb-3`}
          >
            <Animated.View
              className="h-full rounded-full"
              style={[progressStyle, { backgroundColor: themeColor }]}
            />
          </View>

          {/* Percentage label */}
          <Text className={`text-xs ${textSecondary} text-center mb-4`}>
            <Text className="font-bold" style={{ color: themeColor }}>
              {Math.round(percentage)}%
            </Text>
            {" completed"}
          </Text>

          {/* Amount row */}
          <View className="flex-row gap-4">
            <View className="flex-1 items-center">
              <Text className={`text-[10px] ${textSecondary} mb-0.5`}>Current</Text>
              <Text className={`text-base font-bold`} style={{ color: themeColor }}>
                {"\u20B9"}{data.currentAmount.toLocaleString("en-IN")}
              </Text>
            </View>
            <View className="flex-1 items-center">
              <Text className={`text-[10px] ${textSecondary} mb-0.5`}>Target</Text>
              <Text className={`text-base font-bold ${textPrimary}`}>
                {"\u20B9"}{data.targetAmount.toLocaleString("en-IN")}
              </Text>
            </View>
            <View className="flex-1 items-center">
              <Text className={`text-[10px] ${textSecondary} mb-0.5`}>
                {data.isCompleted ? "Saved" : "Remaining"}
              </Text>
              <Text
                className="text-base font-bold"
                style={{ color: data.isCompleted ? "#10B981" : isDark ? "#CBD5E1" : "#64748B" }}
              >
                {"\u20B9"}{Math.abs(remaining).toLocaleString("en-IN")}
              </Text>
            </View>
          </View>

          {/* Add Funds button */}
          {!data.isCompleted && (
            <TouchableOpacity
              className="mt-5 py-3.5 rounded-2xl items-center"
              style={{ backgroundColor: themeColor }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onAddFunds();
              }}
              activeOpacity={0.8}
            >
              <Text className="text-white text-sm font-bold">
                + Add Funds
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Fund history */}
      <Animated.View entering={FadeInDown.duration(500).delay(400)}>
        <Text className={`text-sm font-semibold ${textSecondary} uppercase tracking-wider mb-3`}>
          Fund History
        </Text>
        <View
          className={`${cardBg} rounded-2xl px-4`}
          style={{
            shadowColor: isDark ? "#000" : "#64748B",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.15 : 0.05,
            shadowRadius: 3,
            elevation: 1,
          }}
        >
          {data.fundHistory.map((entry, index) => (
            <View key={entry.id}>
              <View className="flex-row items-center py-3.5">
                <View
                  className="w-8 h-8 rounded-lg items-center justify-center mr-3"
                  style={{ backgroundColor: themeColor + "15" }}
                >
                  <Text className="text-xs" style={{ color: themeColor }}>
                    {"\u2191"}
                  </Text>
                </View>
                <View className="flex-1 mr-3">
                  <Text
                    className={`text-sm font-medium ${textPrimary}`}
                    numberOfLines={1}
                  >
                    {entry.notes || "Deposit"}
                  </Text>
                  <Text className={`text-xs ${textSecondary} mt-0.5`}>
                    {entry.date}
                  </Text>
                </View>
                <Text className="text-sm font-bold text-green-500">
                  +{"\u20B9"}{entry.amount.toLocaleString("en-IN")}
                </Text>
              </View>
              {index < data.fundHistory.length - 1 && (
                <View className={`h-px ${isDark ? "bg-slate-700" : "bg-slate-100"}`} />
              )}
            </View>
          ))}
        </View>
      </Animated.View>
    </>
  );
}

// ---- Main Screen ----

export default function BudgetDetailScreen() {
  const router = useRouter();
  const { id, type } = useLocalSearchParams<{ id: string; type?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [refreshing, setRefreshing] = useState(false);

  const addFundsRef = useRef<AddFundsSheetRef>(null);

  // TODO: Replace with real data fetching based on id
  const isGoal = type === "goal" || id?.startsWith("g");
  const data: DetailData = isGoal
    ? { ...MOCK_GOAL_DETAIL, id: id ?? "g1" }
    : { ...MOCK_BUDGET_DETAIL, id: id ?? "b1" };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const handleDelete = useCallback(() => {
    const label = isGoal ? "goal" : "budget";
    Alert.alert(
      `Delete ${label}?`,
      `Are you sure you want to delete this ${label}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            // TODO: Call delete mutation
            router.back();
          },
        },
      ]
    );
  }, [isGoal]);

  const handleAddFunds = useCallback((goalId: string, amount: number, notes: string) => {
    // TODO: Call add funds mutation
    console.log("Add funds:", { goalId, amount, notes });
  }, []);

  const openAddFunds = useCallback(() => {
    if (isGoal && data.type === "goal") {
      addFundsRef.current?.open({
        id: data.id,
        name: data.name,
        currentAmount: data.currentAmount,
        targetAmount: data.targetAmount,
        icon: data.icon,
        color: data.color,
      });
    }
  }, [isGoal, data]);

  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`} edges={["top"]}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        className="px-5 pt-4 pb-2 flex-row items-center justify-between"
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          activeOpacity={0.7}
          className="mr-3"
        >
          <Text className={`text-2xl ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {"\u2039"}
          </Text>
        </TouchableOpacity>
        <Text className={`text-xl font-bold ${textPrimary} flex-1`}>
          {isGoal ? "Goal Details" : "Budget Details"}
        </Text>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            className={`w-9 h-9 rounded-xl ${isDark ? "bg-slate-800" : "bg-slate-100"} items-center justify-center`}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // TODO: Navigate to edit
              Alert.alert("Edit", "Edit functionality coming soon.");
            }}
            activeOpacity={0.7}
          >
            <Text className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {"\u270F\uFE0F"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`w-9 h-9 rounded-xl ${isDark ? "bg-red-900/30" : "bg-red-50"} items-center justify-center`}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Text className="text-sm">{"\uD83D\uDDD1\uFE0F"}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8 pt-2"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4F46E5"
            colors={["#4F46E5"]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isGoal && data.type === "goal" ? (
          <GoalDetailView data={data} isDark={isDark} onAddFunds={openAddFunds} />
        ) : data.type === "budget" ? (
          <BudgetDetailView data={data} isDark={isDark} />
        ) : null}
      </ScrollView>

      {/* Add Funds Bottom Sheet for goals */}
      {isGoal && <AddFundsSheet ref={addFundsRef} onAddFunds={handleAddFunds} />}
    </SafeAreaView>
  );
}
