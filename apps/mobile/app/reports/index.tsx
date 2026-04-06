import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  useColorScheme,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import ReportSummaryCards from "@/components/report-summary-cards";
import type { SummaryData } from "@/components/report-summary-cards";
import CategoryBreakdownChart from "@/components/category-breakdown-chart";
import type { CategoryBreakdownItem } from "@/components/category-breakdown-chart";
import SpendTrendChart from "@/components/spend-trend-chart";
import type { SpendTrendPoint } from "@/components/spend-trend-chart";
import BudgetComparisonChart from "@/components/budget-comparison-chart";
import type { BudgetComparison } from "@/components/budget-comparison-chart";
import TopCategoriesList from "@/components/top-categories-list";
import type { TopCategoryItem } from "@/components/top-categories-list";
import MonthlyHeatmap from "@/components/monthly-heatmap";
import type { DailySpend } from "@/components/monthly-heatmap";

// ---- Period Types ----

type PeriodKey =
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "custom";

interface PeriodOption {
  key: PeriodKey;
  label: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "this_quarter", label: "This Quarter" },
  { key: "this_year", label: "This Year" },
  { key: "custom", label: "Custom" },
];

// ---- Date range helpers ----

function getDateRange(period: PeriodKey): { startDate: Date; endDate: Date } {
  const now = new Date();
  switch (period) {
    case "this_month":
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      };
    case "last_month":
      return {
        startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        endDate: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
      };
    case "this_quarter": {
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      return {
        startDate: new Date(now.getFullYear(), quarterStart, 1),
        endDate: new Date(now.getFullYear(), quarterStart + 3, 0, 23, 59, 59),
      };
    }
    case "this_year":
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
      };
    case "custom":
    default:
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      };
  }
}

function getDaysInRange(startDate: Date, endDate: Date): number {
  return Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
}

// ---- Mock Data Generators ----
// These will be replaced by real hooks (useMonthlySummary, useCategoryBreakdown, etc.)

function generateMockSummary(period: PeriodKey): SummaryData {
  const multipliers: Record<PeriodKey, number> = {
    this_month: 1,
    last_month: 1,
    this_quarter: 3,
    this_year: 12,
    custom: 1,
  };
  const m = multipliers[period];
  const totalSpent = 24500 * m + Math.random() * 5000 * m;
  const totalIncome = 85000 * m + Math.random() * 10000 * m;
  const netSavings = totalIncome - totalSpent;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
  const { startDate, endDate } = getDateRange(period);
  const days = getDaysInRange(startDate, endDate);
  const avgDailySpend = totalSpent / days;

  return {
    totalSpent,
    totalIncome,
    netSavings,
    savingsRate,
    avgDailySpend,
    previousTotalSpent: 22000 * m,
    previousTotalIncome: 80000 * m,
    previousNetSavings: 58000 * m,
    previousSavingsRate: 72.5,
    previousAvgDailySpend: 733 * m,
  };
}

function generateMockCategoryBreakdown(): CategoryBreakdownItem[] {
  const categories = [
    { id: "1", name: "Food & Dining", icon: "🍔", color: "#EF4444", amount: 8500 },
    { id: "2", name: "Transport", icon: "🚗", color: "#F59E0B", amount: 4200 },
    { id: "3", name: "Shopping", icon: "🛍", color: "#6366F1", amount: 6300 },
    { id: "4", name: "Bills & Utilities", icon: "📄", color: "#22C55E", amount: 5000 },
    { id: "5", name: "Entertainment", icon: "🎬", color: "#EC4899", amount: 3200 },
    { id: "6", name: "Health", icon: "💊", color: "#14B8A6", amount: 1800 },
    { id: "7", name: "Other", icon: "📌", color: "#94A3B8", amount: 2500 },
  ];
  const total = categories.reduce((sum, c) => sum + c.amount, 0);
  return categories.map((c) => ({
    categoryId: c.id,
    categoryName: c.name,
    categoryIcon: c.icon,
    categoryColor: c.color,
    totalAmount: c.amount,
    transactionCount: Math.floor(Math.random() * 20) + 3,
    percentage: (c.amount / total) * 100,
  }));
}

function generateMockSpendTrend(): SpendTrendPoint[] {
  const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const expenseBase = [22000, 28000, 32000, 25000, 27000, 24500];
  const incomeBase = [80000, 82000, 85000, 83000, 85000, 85000];
  return months.map((month, i) => ({
    month,
    year: i < 3 ? 2025 : 2026,
    monthNum: i < 3 ? 10 + i : i - 2,
    totalExpenses: expenseBase[i]!,
    totalIncome: incomeBase[i]!,
  }));
}

function generateMockBudgetComparison(): BudgetComparison[] {
  return [
    {
      budgetId: "b1",
      categoryId: "1",
      categoryName: "Food & Dining",
      categoryIcon: "🍔",
      categoryColor: "#EF4444",
      budgetAmount: 10000,
      actualAmount: 8500,
      percentage: 85,
    },
    {
      budgetId: "b2",
      categoryId: "2",
      categoryName: "Transport",
      categoryIcon: "🚗",
      categoryColor: "#F59E0B",
      budgetAmount: 5000,
      actualAmount: 4200,
      percentage: 84,
    },
    {
      budgetId: "b3",
      categoryId: "3",
      categoryName: "Shopping",
      categoryIcon: "🛍",
      categoryColor: "#6366F1",
      budgetAmount: 5000,
      actualAmount: 6300,
      percentage: 126,
    },
    {
      budgetId: "b4",
      categoryId: "4",
      categoryName: "Bills & Utilities",
      categoryIcon: "📄",
      categoryColor: "#22C55E",
      budgetAmount: 8000,
      actualAmount: 5000,
      percentage: 62.5,
    },
    {
      budgetId: "b5",
      categoryId: "5",
      categoryName: "Entertainment",
      categoryIcon: "🎬",
      categoryColor: "#EC4899",
      budgetAmount: 4000,
      actualAmount: 3200,
      percentage: 80,
    },
  ];
}

function generateMockDailySpend(): DailySpend[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const result: DailySpend[] = [];

  for (let day = 1; day <= Math.min(daysInMonth, now.getDate()); day++) {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    const amount = Math.random() > 0.15 ? Math.floor(Math.random() * 4000) + 100 : 0;
    result.push({ date: `${year}-${m}-${d}`, amount });
  }
  return result;
}

// ---- Section Wrapper ----

interface SectionProps {
  title: string;
  icon: string;
  delay?: number;
  children: React.ReactNode;
}

function Section({ title, icon, delay = 0, children }: SectionProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Animated.View
      entering={FadeInDown.duration(500).delay(delay)}
      className={`${isDark ? "bg-slate-800" : "bg-white"} rounded-2xl p-5 mb-4`}
      style={{
        shadowColor: isDark ? "#000" : "#64748B",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.2 : 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <View className="flex-row items-center mb-4">
        <Text className="text-base mr-2">{icon}</Text>
        <Text
          className={`text-sm font-semibold ${isDark ? "text-slate-400" : "text-slate-500"} uppercase tracking-wider`}
        >
          {title}
        </Text>
      </View>
      {children}
    </Animated.View>
  );
}

// ---- Main Reports Screen ----

export default function ReportsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [period, setPeriod] = useState<PeriodKey>("this_month");
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // TODO: Replace mock data with real hooks:
  // const { data: summary } = useMonthlySummary({ ... });
  // const { data: categoryBreakdown } = useCategoryBreakdown({ ... });
  // const { data: spendTrend } = useSpendTrend({ ... });
  // const { data: budgetVsActual } = useBudgetVsActual({ ... });

  const summaryData = useMemo(() => generateMockSummary(period), [period]);
  const categoryData = useMemo(() => generateMockCategoryBreakdown(), [period]);
  const trendData = useMemo(() => generateMockSpendTrend(), [period]);
  const budgetData = useMemo(() => generateMockBudgetComparison(), [period]);
  const topCategories: TopCategoryItem[] = useMemo(
    () =>
      categoryData.map((c) => ({
        categoryId: c.categoryId,
        categoryName: c.categoryName,
        categoryIcon: c.categoryIcon,
        categoryColor: c.categoryColor,
        totalAmount: c.totalAmount,
        percentage: c.percentage,
      })),
    [categoryData]
  );
  const dailySpend = useMemo(() => generateMockDailySpend(), [period]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Invalidate queries
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  function handlePeriodChange(newPeriod: PeriodKey) {
    if (newPeriod === "custom") {
      // TODO: Show date picker bottom sheet
      Alert.alert(
        "Custom Period",
        "Custom date range picker coming soon. Using current month for now."
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPeriod(newPeriod);
  }

  async function handleExport() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Export Report", "Choose export format:", [
      { text: "Cancel", style: "cancel" },
      {
        text: "CSV",
        onPress: async () => {
          // TODO: Generate CSV from real data
          const csvContent = generateMockCSV();
          try {
            await Share.share({
              message: csvContent,
              title: "ExpenseFlow Report",
            });
          } catch {
            Alert.alert("Error", "Failed to export report.");
          }
        },
      },
      {
        text: "Share Summary",
        onPress: async () => {
          const { startDate, endDate } = getDateRange(period);
          const summary = [
            `ExpenseFlow Report`,
            `Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
            ``,
            `Total Spent: ${formatINR(summaryData.totalSpent)}`,
            `Total Income: ${formatINR(summaryData.totalIncome)}`,
            `Net Savings: ${formatINR(summaryData.netSavings)}`,
            `Savings Rate: ${summaryData.savingsRate.toFixed(1)}%`,
            `Avg Daily Spend: ${formatINR(summaryData.avgDailySpend)}`,
          ].join("\n");
          try {
            await Share.share({ message: summary, title: "ExpenseFlow Report" });
          } catch {
            Alert.alert("Error", "Failed to share report.");
          }
        },
      },
    ]);
  }

  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const headerBg = isDark ? "bg-slate-800" : "bg-white";

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`} edges={["top"]}>
      {/* Header */}
      <View
        className={`${headerBg} flex-row items-center justify-between px-5 py-3 border-b ${isDark ? "border-slate-700" : "border-slate-100"}`}
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          activeOpacity={0.7}
          className="flex-row items-center"
        >
          <Text className="text-primary-600 text-base font-medium">
            ← Back
          </Text>
        </TouchableOpacity>
        <Text
          className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}
        >
          Reports
        </Text>
        <TouchableOpacity onPress={handleExport} activeOpacity={0.7}>
          <Text className="text-primary-600 text-sm font-medium">Export</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-10"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4F46E5"
            colors={["#4F46E5"]}
          />
        }
      >
        {/* Period Selector (Horizontal Scroll Chips) */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(50)}
          className="mt-4 mb-4"
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {PERIOD_OPTIONS.map((option) => {
              const isActive = period === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  className={`mr-2 px-4 py-2 rounded-full ${
                    isActive
                      ? "bg-primary-600"
                      : isDark
                        ? "bg-slate-800"
                        : "bg-white"
                  }`}
                  style={
                    !isActive
                      ? {
                          shadowColor: isDark ? "#000" : "#64748B",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: isDark ? 0.15 : 0.05,
                          shadowRadius: 2,
                          elevation: 1,
                        }
                      : undefined
                  }
                  onPress={() => handlePeriodChange(option.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      isActive
                        ? "text-white"
                        : isDark
                          ? "text-slate-300"
                          : "text-slate-600"
                    }`}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Summary Cards */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} className="mb-4">
          <ReportSummaryCards
            data={summaryData}
            isLoading={isLoading}
            currency="INR"
          />
        </Animated.View>

        {/* Content Sections */}
        <View className="px-5">
          {/* Section 1: Category Breakdown */}
          <Section title="Category Breakdown" icon="🥧" delay={200}>
            <CategoryBreakdownChart
              data={categoryData}
              isLoading={isLoading}
              currency="INR"
            />
          </Section>

          {/* Section 2: Spend Trend */}
          <Section title="Spend Trend" icon="📈" delay={300}>
            <SpendTrendChart
              data={trendData}
              isLoading={isLoading}
              currency="INR"
            />
          </Section>

          {/* Section 3: Budget vs Actual */}
          <Section title="Budget vs Actual" icon="🎯" delay={400}>
            <BudgetComparisonChart
              data={budgetData}
              isLoading={isLoading}
              currency="INR"
            />
          </Section>

          {/* Section 4: Top Categories */}
          <Section title="Top Categories" icon="🏆" delay={500}>
            <TopCategoriesList
              data={topCategories}
              isLoading={isLoading}
              currency="INR"
            />
          </Section>

          {/* Section 5: Daily Heatmap */}
          <Section title="Daily Spending" icon="🗓" delay={600}>
            <MonthlyHeatmap
              data={dailySpend}
              isLoading={isLoading}
              currency="INR"
            />
          </Section>

          {/* Export Button */}
          <Animated.View entering={FadeInDown.duration(400).delay(700)}>
            <TouchableOpacity
              className="bg-primary-600 rounded-2xl py-4 items-center mb-4"
              onPress={handleExport}
              activeOpacity={0.8}
              style={{
                shadowColor: "#4F46E5",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <View className="flex-row items-center">
                <Text className="text-base mr-2">📤</Text>
                <Text className="text-white text-base font-semibold">
                  Export to CSV
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---- Helpers ----

function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function generateMockCSV(): string {
  const headers = "Category,Amount,Percentage\n";
  const rows = [
    "Food & Dining,8500,27.0",
    "Shopping,6300,20.0",
    "Bills & Utilities,5000,15.9",
    "Transport,4200,13.3",
    "Entertainment,3200,10.2",
    "Other,2500,7.9",
    "Health,1800,5.7",
  ].join("\n");
  return headers + rows;
}
