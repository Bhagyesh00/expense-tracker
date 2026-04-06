import { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn, Layout } from "react-native-reanimated";

import BudgetCard from "@/components/budget-card";
import SavingsGoalCard from "@/components/savings-goal-card";
import BudgetSummaryCard from "@/components/budget-summary-card";
import AddFundsSheet, { type AddFundsSheetRef } from "@/components/add-funds-sheet";

// ---- Types ----

interface BudgetItem {
  id: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  spent: number;
  budget: number;
  period: string;
}

interface SavingsGoalItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  currentAmount: number;
  targetAmount: number;
  targetDate: string | null;
  isCompleted: boolean;
}

// ---- Period config ----

const PERIODS = [
  { key: "weekly", label: "This Week" },
  { key: "monthly", label: "This Month" },
  { key: "quarterly", label: "This Quarter" },
  { key: "yearly", label: "This Year" },
] as const;

type PeriodKey = (typeof PERIODS)[number]["key"];

// ---- Mock Data ----

const MOCK_BUDGETS: BudgetItem[] = [
  { id: "b1", categoryName: "Food", categoryIcon: "\uD83C\uDF54", categoryColor: "#F59E0B", spent: 8200, budget: 10000, period: "Monthly" },
  { id: "b2", categoryName: "Transport", categoryIcon: "\uD83D\uDE97", categoryColor: "#3B82F6", spent: 3200, budget: 5000, period: "Monthly" },
  { id: "b3", categoryName: "Shopping", categoryIcon: "\uD83D\uDECD", categoryColor: "#EC4899", spent: 5800, budget: 5000, period: "Monthly" },
  { id: "b4", categoryName: "Entertainment", categoryIcon: "\uD83C\uDFAC", categoryColor: "#8B5CF6", spent: 2400, budget: 3000, period: "Monthly" },
  { id: "b5", categoryName: "Bills", categoryIcon: "\uD83D\uDCC4", categoryColor: "#6366F1", spent: 4200, budget: 8000, period: "Monthly" },
  { id: "b6", categoryName: "Health", categoryIcon: "\uD83D\uDC8A", categoryColor: "#10B981", spent: 1200, budget: 3000, period: "Monthly" },
];

const MOCK_UNBUDGETED = [
  { category: "Subscriptions", icon: "\uD83D\uDD14", spent: 1200 },
  { category: "Gifts", icon: "\uD83C\uDF81", spent: 3500 },
];

const MOCK_GOALS: SavingsGoalItem[] = [
  { id: "g1", name: "Emergency Fund", icon: "\uD83D\uDEE1\uFE0F", color: "#3B82F6", currentAmount: 45000, targetAmount: 100000, targetDate: "2026-12-31", isCompleted: false },
  { id: "g2", name: "Vacation to Goa", icon: "\u2708\uFE0F", color: "#F59E0B", currentAmount: 18000, targetAmount: 25000, targetDate: "2026-06-15", isCompleted: false },
  { id: "g3", name: "New Laptop", icon: "\uD83D\uDCBB", color: "#8B5CF6", currentAmount: 60000, targetAmount: 60000, targetDate: "2026-03-01", isCompleted: true },
  { id: "g4", name: "Home Down Payment", icon: "\uD83C\uDFE0", color: "#10B981", currentAmount: 200000, targetAmount: 500000, targetDate: "2027-06-01", isCompleted: false },
];

// ---- Skeleton components ----

function BudgetCardSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <View
      className={`${isDark ? "bg-slate-800" : "bg-white"} rounded-2xl p-4 mb-3`}
    >
      <View className="flex-row items-center mb-3">
        <View className={`w-10 h-10 rounded-xl ${isDark ? "bg-slate-700" : "bg-slate-200"} mr-3`} />
        <View className="flex-1">
          <View className={`h-3.5 w-24 rounded ${isDark ? "bg-slate-700" : "bg-slate-200"}`} />
          <View className={`h-2.5 w-16 rounded mt-1.5 ${isDark ? "bg-slate-700" : "bg-slate-200"}`} />
        </View>
        <View className={`h-6 w-12 rounded-full ${isDark ? "bg-slate-700" : "bg-slate-200"}`} />
      </View>
      <View className={`h-2.5 rounded-full ${isDark ? "bg-slate-700" : "bg-slate-200"}`} />
      <View className="flex-row justify-between mt-2.5">
        <View className={`h-3 w-28 rounded ${isDark ? "bg-slate-700" : "bg-slate-200"}`} />
        <View className={`h-3 w-20 rounded ${isDark ? "bg-slate-700" : "bg-slate-200"}`} />
      </View>
    </View>
  );
}

// ---- Main screen ----

export default function BudgetsOverviewScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [activeTab, setActiveTab] = useState<"budgets" | "goals">("budgets");
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("monthly");
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const addFundsRef = useRef<AddFundsSheetRef>(null);

  // TODO: Replace with real hooks
  const budgets = MOCK_BUDGETS;
  const goals = MOCK_GOALS;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  // Sort budgets: over-budget first, then near-limit, then ok
  const sortedBudgets = useMemo(() => {
    return [...budgets].sort((a, b) => {
      const pctA = a.budget > 0 ? a.spent / a.budget : 0;
      const pctB = b.budget > 0 ? b.spent / b.budget : 0;
      // Over budget first
      if (pctA > 1 && pctB <= 1) return -1;
      if (pctB > 1 && pctA <= 1) return 1;
      // Then by percentage descending
      return pctB - pctA;
    });
  }, [budgets]);

  // Summary calculations
  const totalBudget = budgets.reduce((sum, b) => sum + b.budget, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const periodLabel = PERIODS.find((p) => p.key === selectedPeriod)?.label ?? "This Month";

  // Sort goals: in-progress first, completed last
  const sortedGoals = useMemo(() => {
    return [...goals].sort((a, b) => {
      if (a.isCompleted && !b.isCompleted) return 1;
      if (!a.isCompleted && b.isCompleted) return -1;
      return 0;
    });
  }, [goals]);

  const handleAddFunds = useCallback((goalId: string, amount: number, notes: string) => {
    // TODO: Call mutation
    console.log("Add funds:", { goalId, amount, notes });
  }, []);

  const handleOpenAddFunds = useCallback((goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (goal) {
      addFundsRef.current?.open({
        id: goal.id,
        name: goal.name,
        currentAmount: goal.currentAmount,
        targetAmount: goal.targetAmount,
        icon: goal.icon,
        color: goal.color,
      });
    }
  }, [goals]);

  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";

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
          Budgets & Goals
        </Text>
      </Animated.View>

      {/* Segmented control */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(50)}
        className="px-5 mb-4"
      >
        <View
          className={`flex-row ${isDark ? "bg-slate-800" : "bg-slate-200"} rounded-xl p-1`}
        >
          {(["budgets", "goals"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              className={`flex-1 py-2.5 rounded-lg items-center ${
                activeTab === tab
                  ? isDark ? "bg-slate-700" : "bg-white"
                  : ""
              }`}
              style={
                activeTab === tab
                  ? {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                      elevation: 2,
                    }
                  : undefined
              }
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab);
              }}
              activeOpacity={0.7}
            >
              <Text
                className={`text-sm font-semibold ${
                  activeTab === tab
                    ? isDark ? "text-white" : "text-slate-900"
                    : isDark ? "text-slate-500" : "text-slate-500"
                }`}
              >
                {tab === "budgets" ? "Budgets" : "Savings Goals"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-24"
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
        {activeTab === "budgets" ? (
          <>
            {/* Period selector */}
            <Animated.View entering={FadeInDown.duration(400).delay(100)}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
                contentContainerStyle={{ gap: 8 }}
              >
                {PERIODS.map((period) => (
                  <TouchableOpacity
                    key={period.key}
                    className={`px-4 py-2 rounded-xl ${
                      selectedPeriod === period.key
                        ? "bg-primary-600"
                        : isDark ? "bg-slate-800" : "bg-white"
                    }`}
                    style={
                      selectedPeriod !== period.key
                        ? {
                            shadowColor: isDark ? "#000" : "#64748B",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: isDark ? 0.15 : 0.05,
                            shadowRadius: 2,
                            elevation: 1,
                          }
                        : undefined
                    }
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedPeriod(period.key);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        selectedPeriod === period.key
                          ? "text-white"
                          : isDark ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      {period.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>

            {isLoading ? (
              <View className="mt-4">
                <View className={`${isDark ? "bg-slate-800" : "bg-white"} rounded-3xl p-5 mb-4`}>
                  <ActivityIndicator size="small" color="#4F46E5" />
                </View>
                {[0, 1, 2].map((i) => (
                  <BudgetCardSkeleton key={i} isDark={isDark} />
                ))}
              </View>
            ) : budgets.length === 0 ? (
              /* Empty state */
              <Animated.View
                entering={FadeIn.duration(500)}
                className={`${isDark ? "bg-slate-800" : "bg-white"} rounded-3xl p-8 items-center mt-4`}
              >
                <Text className="text-5xl mb-4">{"\uD83D\uDCB0"}</Text>
                <Text className={`text-lg font-bold ${textPrimary} mb-2`}>
                  No budgets yet
                </Text>
                <Text className={`text-sm ${textSecondary} text-center mb-5 leading-5`}>
                  Create your first budget to start tracking spending limits for each category.
                </Text>
                <TouchableOpacity
                  className="bg-primary-600 rounded-xl px-6 py-3.5"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push("/budgets/new");
                  }}
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-sm font-bold">
                    Create Budget
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <>
                {/* Summary card */}
                <BudgetSummaryCard
                  totalBudget={totalBudget}
                  totalSpent={totalSpent}
                  periodLabel={periodLabel}
                />

                {/* Budget cards */}
                <View className="mt-4">
                  <Text className={`text-sm font-semibold ${textSecondary} uppercase tracking-wider mb-3`}>
                    By Category
                  </Text>
                  {sortedBudgets.map((budget, index) => (
                    <BudgetCard
                      key={budget.id}
                      id={budget.id}
                      categoryName={budget.categoryName}
                      categoryIcon={budget.categoryIcon}
                      categoryColor={budget.categoryColor}
                      spent={budget.spent}
                      budget={budget.budget}
                      period={budget.period}
                      index={index}
                    />
                  ))}
                </View>

                {/* Unbudgeted section */}
                {MOCK_UNBUDGETED.length > 0 && (
                  <Animated.View entering={FadeInDown.duration(400).delay(400)}>
                    <View className="mt-4">
                      <Text className={`text-sm font-semibold ${textSecondary} uppercase tracking-wider mb-3`}>
                        Unbudgeted Spending
                      </Text>
                      <View
                        className={`${isDark ? "bg-slate-800" : "bg-white"} rounded-2xl px-4`}
                        style={{
                          shadowColor: isDark ? "#000" : "#64748B",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: isDark ? 0.15 : 0.05,
                          shadowRadius: 3,
                          elevation: 1,
                        }}
                      >
                        {MOCK_UNBUDGETED.map((item, index) => (
                          <View key={item.category}>
                            <TouchableOpacity
                              className="flex-row items-center py-3.5"
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push("/budgets/new");
                              }}
                              activeOpacity={0.7}
                            >
                              <View
                                className={`w-9 h-9 rounded-lg ${isDark ? "bg-slate-700" : "bg-slate-100"} items-center justify-center mr-3`}
                              >
                                <Text className="text-base">{item.icon}</Text>
                              </View>
                              <View className="flex-1">
                                <Text className={`text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>
                                  {item.category}
                                </Text>
                                <Text className={`text-xs ${textSecondary}`}>
                                  {"\u20B9"}{item.spent.toLocaleString("en-IN")} spent
                                </Text>
                              </View>
                              <View className={`${isDark ? "bg-slate-700" : "bg-slate-100"} rounded-lg px-3 py-1.5`}>
                                <Text className="text-xs font-medium text-primary-600">
                                  + Budget
                                </Text>
                              </View>
                            </TouchableOpacity>
                            {index < MOCK_UNBUDGETED.length - 1 && (
                              <View className={`h-px ${isDark ? "bg-slate-700" : "bg-slate-100"}`} />
                            )}
                          </View>
                        ))}
                      </View>
                    </View>
                  </Animated.View>
                )}
              </>
            )}
          </>
        ) : (
          /* ---- Savings Goals Tab ---- */
          <>
            {isLoading ? (
              <View className="mt-2">
                {[0, 1, 2].map((i) => (
                  <BudgetCardSkeleton key={i} isDark={isDark} />
                ))}
              </View>
            ) : goals.length === 0 ? (
              <Animated.View
                entering={FadeIn.duration(500)}
                className={`${isDark ? "bg-slate-800" : "bg-white"} rounded-3xl p-8 items-center mt-4`}
              >
                <Text className="text-5xl mb-4">{"\uD83C\uDFAF"}</Text>
                <Text className={`text-lg font-bold ${textPrimary} mb-2`}>
                  No savings goals yet
                </Text>
                <Text className={`text-sm ${textSecondary} text-center mb-5 leading-5`}>
                  Set savings goals to track your progress toward the things that matter most.
                </Text>
                <TouchableOpacity
                  className="bg-primary-600 rounded-xl px-6 py-3.5"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push("/budgets/new?tab=goal");
                  }}
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-sm font-bold">
                    Create Goal
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <View className="mt-2">
                {sortedGoals.map((goal, index) => (
                  <SavingsGoalCard
                    key={goal.id}
                    id={goal.id}
                    name={goal.name}
                    icon={goal.icon}
                    color={goal.color}
                    currentAmount={goal.currentAmount}
                    targetAmount={goal.targetAmount}
                    targetDate={goal.targetDate}
                    isCompleted={goal.isCompleted}
                    index={index}
                    onAddFunds={handleOpenAddFunds}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(500)}
        className="absolute bottom-8 right-5"
      >
        <TouchableOpacity
          className="w-14 h-14 rounded-full bg-primary-600 items-center justify-center"
          style={{
            shadowColor: "#4F46E5",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 10,
          }}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push(
              activeTab === "budgets" ? "/budgets/new" : "/budgets/new?tab=goal"
            );
          }}
          activeOpacity={0.8}
        >
          <Text className="text-white text-3xl font-light" style={{ marginTop: -2 }}>
            +
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Add Funds Bottom Sheet */}
      <AddFundsSheet ref={addFundsRef} onAddFunds={handleAddFunds} />
    </SafeAreaView>
  );
}
