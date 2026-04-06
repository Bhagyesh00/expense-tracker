import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";

import BalanceCard from "@/components/balance-card";
import QuickActions from "@/components/quick-actions";
import PrivateModeToggle from "@/components/private-mode-toggle";

// Mock unread count — replace with useUnreadCount hook when auth is wired
const MOCK_UNREAD_COUNT = 3;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ---- Expense Item ----
interface ExpenseItemProps {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  onPress: (id: string) => void;
}

const categoryConfig: Record<
  string,
  { icon: string; bgColor: string }
> = {
  Food: { icon: "🍔", bgColor: "bg-orange-100" },
  Transport: { icon: "🚗", bgColor: "bg-blue-100" },
  Shopping: { icon: "🛍", bgColor: "bg-pink-100" },
  Entertainment: { icon: "🎬", bgColor: "bg-purple-100" },
  Bills: { icon: "📄", bgColor: "bg-yellow-100" },
  Health: { icon: "💊", bgColor: "bg-green-100" },
  Other: { icon: "📌", bgColor: "bg-slate-100" },
};

function ExpenseItem({
  id,
  category,
  description,
  amount,
  date,
  onPress,
}: ExpenseItemProps) {
  const config = categoryConfig[category] ?? categoryConfig.Other;

  return (
    <TouchableOpacity
      className="flex-row items-center py-3.5 px-1"
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(id);
      }}
      activeOpacity={0.7}
    >
      <View
        className={`w-11 h-11 rounded-2xl ${config.bgColor} items-center justify-center mr-3`}
      >
        <Text className="text-lg">{config.icon}</Text>
      </View>
      <View className="flex-1 mr-3">
        <Text
          className="text-sm font-semibold text-slate-900 dark:text-white"
          numberOfLines={1}
        >
          {description}
        </Text>
        <Text className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          {category}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-sm font-bold text-slate-900 dark:text-white">
          -₹{amount.toLocaleString("en-IN")}
        </Text>
        <Text className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          {date}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ---- Budget Progress Circle ----
interface BudgetProgressProps {
  category: string;
  icon: string;
  spent: number;
  total: number;
  color: string;
}

function BudgetProgress({
  category,
  icon,
  spent,
  total,
  color,
}: BudgetProgressProps) {
  const percentage = Math.min((spent / total) * 100, 100);
  const isOverBudget = spent > total;

  return (
    <View className="items-center mr-5 w-20">
      <View
        className="w-16 h-16 rounded-full items-center justify-center mb-2"
        style={{
          borderWidth: 3,
          borderColor: isOverBudget ? "#EF4444" : color,
          backgroundColor: isOverBudget ? "#FEF2F2" : color + "15",
        }}
      >
        <Text className="text-xl">{icon}</Text>
      </View>
      <Text
        className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-0.5"
        numberOfLines={1}
      >
        {category}
      </Text>
      <Text
        className="text-xs font-medium"
        style={{ color: isOverBudget ? "#EF4444" : color }}
      >
        {Math.round(percentage)}%
      </Text>
    </View>
  );
}

// ---- Mock Data ----
const MOCK_RECENT_EXPENSES = [
  {
    id: "1",
    category: "Food",
    description: "Swiggy order",
    amount: 450,
    date: "Today",
  },
  {
    id: "2",
    category: "Transport",
    description: "Uber ride",
    amount: 220,
    date: "Today",
  },
  {
    id: "3",
    category: "Shopping",
    description: "Amazon purchase",
    amount: 1299,
    date: "Yesterday",
  },
  {
    id: "4",
    category: "Bills",
    description: "Electricity bill",
    amount: 2100,
    date: "Yesterday",
  },
  {
    id: "5",
    category: "Entertainment",
    description: "Netflix",
    amount: 649,
    date: "Mar 23",
  },
];

const MOCK_BUDGETS: BudgetProgressProps[] = [
  {
    category: "Food",
    icon: "🍔",
    spent: 7800,
    total: 10000,
    color: "#F59E0B",
  },
  {
    category: "Transport",
    icon: "🚗",
    spent: 3200,
    total: 5000,
    color: "#3B82F6",
  },
  {
    category: "Shopping",
    icon: "🛍",
    spent: 5500,
    total: 5000,
    color: "#EC4899",
  },
  {
    category: "Bills",
    icon: "📄",
    spent: 4200,
    total: 8000,
    color: "#8B5CF6",
  },
  {
    category: "Health",
    icon: "💊",
    spent: 1200,
    total: 3000,
    color: "#10B981",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [refreshing, setRefreshing] = useState(false);

  // TODO: Replace with real data from useQuery
  const userName = "User";

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // TODO: Refetch queries
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  function navigateToExpense(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/expense/${id}`);
  }

  const bgColor = isDark ? "bg-slate-900" : "bg-white";
  const cardBg = isDark ? "bg-slate-800" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`} edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
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
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(100)}
          className="px-5 pt-4 pb-4 flex-row items-center justify-between"
        >
          <View>
            <Text className={`text-sm ${textSecondary}`}>
              {getGreeting()} 👋
            </Text>
            <Text className={`text-2xl font-bold ${textPrimary}`}>
              {userName}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Text className={`text-xs ${textSecondary}`}>
              {format(new Date(), "EEE, MMM d")}
            </Text>

            {/* Private Mode Toggle */}
            <PrivateModeToggle size={40} />

            {/* Notification Bell */}
            <TouchableOpacity
              className={`w-10 h-10 rounded-full ${isDark ? "bg-slate-800" : "bg-slate-100"} items-center justify-center`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/notifications/");
              }}
              activeOpacity={0.7}
            >
              <Text className="text-lg">🔔</Text>
              {MOCK_UNREAD_COUNT > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: "#EF4444",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1.5,
                    borderColor: isDark ? "#0F172A" : "#FFFFFF",
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: "800",
                    }}
                  >
                    {MOCK_UNREAD_COUNT > 9 ? "9+" : MOCK_UNREAD_COUNT}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Profile */}
            <TouchableOpacity
              className={`w-10 h-10 rounded-full ${isDark ? "bg-slate-800" : "bg-slate-100"} items-center justify-center`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/settings/profile");
              }}
              activeOpacity={0.7}
            >
              <Text className="text-lg">👤</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Balance Card */}
        <BalanceCard
          totalBalance={60500}
          income={85000}
          expenses={24500}
          currency="INR"
        />

        {/* Quick Actions */}
        <QuickActions />

        {/* Pending Payments Summary */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(500)}
          className="px-5 mt-6"
        >
          <View className="flex-row gap-3">
            <TouchableOpacity
              className={`flex-1 ${isDark ? "bg-red-900/30" : "bg-red-50"} rounded-2xl p-4`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(tabs)/pending");
              }}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-sm">↗️</Text>
                <Text className={`text-xs font-medium ${isDark ? "text-red-300" : "text-red-600"}`}>
                  You Owe
                </Text>
              </View>
              <Text className={`text-lg font-bold ${isDark ? "text-red-200" : "text-red-700"}`}>
                ₹4,500
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 ${isDark ? "bg-green-900/30" : "bg-green-50"} rounded-2xl p-4`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(tabs)/pending");
              }}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-sm">↙️</Text>
                <Text className={`text-xs font-medium ${isDark ? "text-green-300" : "text-green-600"}`}>
                  Owed to You
                </Text>
              </View>
              <Text className={`text-lg font-bold ${isDark ? "text-green-200" : "text-green-700"}`}>
                ₹12,000
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Budget Overview */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(600)}
          className="mt-6"
        >
          <View className="flex-row items-center justify-between px-5 mb-3">
            <Text className={`text-lg font-bold ${textPrimary}`}>
              Budget Overview
            </Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/reports/");
              }}
              activeOpacity={0.7}
            >
              <Text className="text-sm text-primary-600 font-medium">
                See All
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20, paddingRight: 12 }}
          >
            {MOCK_BUDGETS.map((budget) => (
              <BudgetProgress key={budget.category} {...budget} />
            ))}
          </ScrollView>
        </Animated.View>

        {/* AI Insights Widget */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(700)}
          className="mx-5 mt-6"
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/insights/");
            }}
            className={`${isDark ? "bg-indigo-900/30 border-indigo-800" : "bg-indigo-50 border-indigo-100"} border rounded-2xl p-4`}
          >
            <View className="flex-row items-center mb-2">
              <Text className="text-base mr-2">✨</Text>
              <Text
                className={`text-sm font-semibold ${isDark ? "text-indigo-300" : "text-indigo-800"}`}
              >
                AI Insights
              </Text>
              <View className="ml-auto bg-indigo-200/50 rounded-full px-2.5 py-0.5">
                <Text className="text-xs font-medium text-indigo-600">New</Text>
              </View>
            </View>
            <Text
              className={`text-xs ${isDark ? "text-indigo-300/70" : "text-indigo-700"} leading-4 mb-3`}
            >
              Your food spending rose 23% this month. You're projected to spend
              ₹28,000 — consider reducing dining to stay within budget.
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                className="flex-1 bg-indigo-600 rounded-xl py-2.5 items-center"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/insights/");
                }}
                activeOpacity={0.8}
              >
                <Text className="text-white text-xs font-semibold">
                  View Insights
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 ${isDark ? "bg-indigo-800/50 border-indigo-700" : "bg-white border-indigo-200"} border rounded-xl py-2.5 items-center`}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/insights/");
                }}
                activeOpacity={0.8}
              >
                <Text
                  className={`text-xs font-semibold ${isDark ? "text-indigo-300" : "text-indigo-600"}`}
                >
                  Ask AI ✨
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Recent Expenses */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(800)}
          className="px-5 mt-6"
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text className={`text-lg font-bold ${textPrimary}`}>
              Recent Expenses
            </Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(tabs)/expenses");
              }}
              activeOpacity={0.7}
            >
              <Text className="text-sm text-primary-600 font-medium">
                See All
              </Text>
            </TouchableOpacity>
          </View>

          {MOCK_RECENT_EXPENSES.length > 0 ? (
            <View className={`${cardBg} rounded-2xl px-4 py-1`}>
              {MOCK_RECENT_EXPENSES.map((expense, index) => (
                <View key={expense.id}>
                  <ExpenseItem {...expense} onPress={navigateToExpense} />
                  {index < MOCK_RECENT_EXPENSES.length - 1 && (
                    <View
                      className={`h-px ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
                    />
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View className={`${cardBg} rounded-2xl p-8 items-center`}>
              <Text className="text-4xl mb-3">📝</Text>
              <Text className={`text-base font-semibold ${textPrimary} mb-1`}>
                No expenses yet
              </Text>
              <Text className={`text-sm ${textSecondary} text-center`}>
                Start tracking your spending by adding your first expense.
              </Text>
              <TouchableOpacity
                className="bg-primary-600 rounded-xl px-6 py-3 mt-4"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push("/expense/new");
                }}
                activeOpacity={0.8}
              >
                <Text className="text-white text-sm font-semibold">
                  Add Expense
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Budget Alert */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(900)}
          className="mx-5 mt-5"
        >
          <View
            className={`${isDark ? "bg-amber-900/30 border-amber-800" : "bg-amber-50 border-amber-200"} border rounded-2xl p-4`}
          >
            <View className="flex-row items-center mb-1">
              <Text className="text-base mr-2">⚠️</Text>
              <Text
                className={`text-sm font-semibold ${isDark ? "text-amber-300" : "text-amber-800"}`}
              >
                Budget Alert
              </Text>
            </View>
            <Text
              className={`text-xs ${isDark ? "text-amber-300/70" : "text-amber-700"}`}
            >
              You've used 78% of your Food budget this month. ₹2,200 remaining.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
