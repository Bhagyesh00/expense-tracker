import { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  useColorScheme,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeOut,
  SlideInRight,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Layout,
} from "react-native-reanimated";
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import ExpenseFiltersSheet, {
  type ExpenseFilters,
  DEFAULT_FILTERS,
  getActiveFilterCount,
} from "@/components/expense-filters-sheet";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  categoryIcon: string;
  categoryColor: string;
  date: string;
  type: "expense" | "income";
}

type TimeFilter = "all" | "today" | "week" | "month" | "custom";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_EXPENSES: Expense[] = Array.from({ length: 30 }, (_, i) => {
  const cats = [
    { name: "Food & Dining", icon: "🍔", color: "#FF6B6B" },
    { name: "Transport", icon: "🚗", color: "#4ECDC4" },
    { name: "Shopping", icon: "🛍", color: "#FF9F43" },
    { name: "Bills", icon: "📄", color: "#54A0FF" },
    { name: "Entertainment", icon: "🎬", color: "#A55EEA" },
    { name: "Health", icon: "💊", color: "#EE5A6F" },
    { name: "Groceries", icon: "🛒", color: "#10AC84" },
  ];
  const descriptions = [
    "Swiggy order", "Uber ride", "Amazon purchase", "Electricity bill",
    "Netflix subscription", "Gym membership", "BigBasket groceries", "Petrol",
    "Movie tickets", "Phone recharge",
  ];
  const cat = cats[i % cats.length];
  const dayOffset = i;
  const d = new Date();
  d.setDate(d.getDate() - dayOffset);

  return {
    id: String(i + 1),
    description: descriptions[i % descriptions.length],
    amount: Math.floor(Math.random() * 5000) + 100,
    category: cat.name,
    categoryIcon: cat.icon,
    categoryColor: cat.color,
    date: d.toISOString().split("T")[0],
    type: i % 7 === 0 ? ("income" as const) : ("expense" as const),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function getSectionTitle(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return "This Week";
  return "Earlier";
}

interface SectionedExpense {
  type: "header" | "item";
  title?: string;
  expense?: Expense;
  key: string;
}

function sectionExpenses(expenses: Expense[]): SectionedExpense[] {
  const result: SectionedExpense[] = [];
  let lastSection = "";

  for (const expense of expenses) {
    const section = getSectionTitle(expense.date);
    if (section !== lastSection) {
      result.push({ type: "header", title: section, key: `header-${section}` });
      lastSection = section;
    }
    result.push({ type: "item", expense, key: expense.id });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function ExpenseSkeleton() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const shimmer = isDark ? "bg-slate-700" : "bg-slate-200";

  return (
    <View className="mb-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Animated.View
          key={i}
          entering={FadeIn.duration(300).delay(i * 80)}
          className={`flex-row items-center p-4 mb-2 rounded-2xl ${
            isDark ? "bg-slate-800" : "bg-white"
          }`}
        >
          <View className={`w-11 h-11 rounded-xl ${shimmer}`} />
          <View className="flex-1 ml-3">
            <View className={`w-32 h-3.5 rounded ${shimmer} mb-2`} />
            <View className={`w-20 h-2.5 rounded ${shimmer}`} />
          </View>
          <View className={`w-16 h-4 rounded ${shimmer}`} />
        </Animated.View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Swipeable expense row
// ---------------------------------------------------------------------------

const SWIPE_THRESHOLD = -80;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

function SwipeableExpenseRow({
  expense,
  onPress,
  onDelete,
  index,
}: {
  expense: Expense;
  onPress: () => void;
  onDelete: () => void;
  index: number;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const translateX = useSharedValue(0);
  const rowHeight = useSharedValue(72);
  const rowOpacity = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      if (e.translationX < 0) {
        translateX.value = Math.max(e.translationX, -120);
      }
    })
    .onEnd((e) => {
      if (translateX.value < SWIPE_THRESHOLD) {
        translateX.value = withSpring(-120);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, -60, -120], [0, 0.5, 1]),
    width: Math.abs(Math.min(translateX.value, 0)),
  }));

  const containerStyle = useAnimatedStyle(() => ({
    height: rowHeight.value,
    opacity: rowOpacity.value,
  }));

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Delete Expense",
      `Delete "${expense.description}"?`,
      [
        {
          text: "Cancel",
          onPress: () => {
            translateX.value = withSpring(0);
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            rowHeight.value = withTiming(0, { duration: 300 });
            rowOpacity.value = withTiming(0, { duration: 300 });
            setTimeout(onDelete, 300);
          },
        },
      ],
    );
  }, [expense.description, onDelete, translateX, rowHeight, rowOpacity]);

  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(index * 40)}
      style={containerStyle}
      className="mb-2 overflow-hidden"
    >
      <View className="flex-row">
        {/* Delete button behind */}
        <Animated.View
          style={deleteStyle}
          className="absolute right-0 top-0 bottom-0 bg-red-500 rounded-2xl items-center justify-center"
        >
          <TouchableOpacity
            onPress={handleDelete}
            className="flex-1 items-center justify-center px-4"
            activeOpacity={0.8}
          >
            <Text className="text-white text-xs font-bold">Delete</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Main row */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[rowStyle, { width: "100%" }]}
            className={`flex-row items-center rounded-2xl p-4 border ${
              isDark
                ? "bg-slate-800 border-slate-700"
                : "bg-white border-slate-100"
            }`}
          >
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress();
              }}
              activeOpacity={0.7}
              className="flex-row items-center flex-1"
            >
              {/* Category icon */}
              <View
                className="w-11 h-11 rounded-xl items-center justify-center mr-3"
                style={{ backgroundColor: expense.categoryColor + "20" }}
              >
                <Text className="text-lg">{expense.categoryIcon}</Text>
              </View>

              {/* Description + category */}
              <View className="flex-1 mr-3">
                <Text
                  className={`text-sm font-semibold ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                  numberOfLines={1}
                >
                  {expense.description}
                </Text>
                <Text
                  className={`text-xs mt-0.5 ${
                    isDark ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  {expense.category} {" "} {getRelativeDate(expense.date)}
                </Text>
              </View>

              {/* Amount */}
              <Text
                className={`text-sm font-bold ${
                  expense.type === "income"
                    ? "text-green-600"
                    : isDark
                      ? "text-white"
                      : "text-slate-900"
                }`}
              >
                {expense.type === "income" ? "+" : "-"}₹
                {expense.amount.toLocaleString("en-IN")}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "custom", label: "Filters" },
];

export default function ExpensesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeTimeFilter, setActiveTimeFilter] = useState<TimeFilter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [expenses, setExpenses] = useState(MOCK_EXPENSES);

  // Filters sheet
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<ExpenseFilters>(DEFAULT_FILTERS);

  const searchBarWidth = useSharedValue(0);

  const filteredExpenses = useMemo(() => {
    let result = expenses;

    // Time filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (activeTimeFilter === "today") {
      result = result.filter((e) => {
        const d = new Date(e.date);
        return d >= today;
      });
    } else if (activeTimeFilter === "week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      result = result.filter((e) => new Date(e.date) >= weekAgo);
    } else if (activeTimeFilter === "month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      result = result.filter((e) => new Date(e.date) >= monthStart);
    }

    // Advanced filters
    if (advancedFilters.type !== "all") {
      result = result.filter((e) => e.type === advancedFilters.type);
    }
    if (advancedFilters.categoryIds.length > 0) {
      result = result.filter((e) =>
        advancedFilters.categoryIds.some(
          (cid) => e.category.toLowerCase().includes(cid),
        ),
      );
    }
    if (advancedFilters.amountMin) {
      const min = Number(advancedFilters.amountMin);
      if (!isNaN(min)) result = result.filter((e) => e.amount >= min);
    }
    if (advancedFilters.amountMax) {
      const max = Number(advancedFilters.amountMax);
      if (!isNaN(max)) result = result.filter((e) => e.amount <= max);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q),
      );
    }

    return result;
  }, [expenses, searchQuery, activeTimeFilter, advancedFilters]);

  const sectionedData = useMemo(() => sectionExpenses(filteredExpenses), [filteredExpenses]);

  const filterCount = getActiveFilterCount(advancedFilters);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: refetch from API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const onEndReached = useCallback(async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    // TODO: Fetch next page
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsLoadingMore(false);
  }, [isLoadingMore]);

  const handleDeleteExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const headerBg = isDark ? "bg-slate-900" : "bg-white";
  const textPrimary = isDark ? "text-white" : "text-slate-900";

  function renderItem({ item, index }: { item: SectionedExpense; index: number }) {
    if (item.type === "header") {
      return (
        <Animated.View
          entering={FadeIn.duration(300)}
          className="pt-3 pb-1.5 px-1"
        >
          <Text
            className={`text-xs font-bold uppercase tracking-wider ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            {item.title}
          </Text>
        </Animated.View>
      );
    }

    if (!item.expense) return null;

    return (
      <GestureHandlerRootView>
        <SwipeableExpenseRow
          expense={item.expense}
          onPress={() => router.push(`/expense/${item.expense!.id}`)}
          onDelete={() => handleDeleteExpense(item.expense!.id)}
          index={index}
        />
      </GestureHandlerRootView>
    );
  }

  function renderEmptyState() {
    if (isLoading) return <ExpenseSkeleton />;

    return (
      <Animated.View
        entering={FadeInDown.duration(500).delay(200)}
        className="flex-1 items-center justify-center py-20"
      >
        <View
          className={`w-20 h-20 rounded-3xl items-center justify-center mb-4 ${
            isDark ? "bg-slate-800" : "bg-slate-100"
          }`}
        >
          <Text className="text-4xl">📭</Text>
        </View>
        <Text className={`text-lg font-bold ${textPrimary} mb-1`}>
          No expenses found
        </Text>
        <Text
          className={`text-sm text-center px-8 ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}
        >
          {searchQuery
            ? "Try a different search term or adjust filters"
            : "Start tracking by adding your first expense"}
        </Text>
        {!searchQuery && (
          <TouchableOpacity
            className="mt-5 bg-primary-600 rounded-2xl px-8 py-3.5"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/expense/new");
            }}
            activeOpacity={0.8}
          >
            <Text className="text-white font-bold text-sm">Add Your First Expense</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  }

  function renderFooter() {
    if (!isLoadingMore) return <View className="h-20" />;
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`} edges={["top"]}>
      {/* Header */}
      <View className={`${headerBg} px-5 pt-4 pb-3 border-b ${isDark ? "border-slate-800" : "border-slate-100"}`}>
        <View className="flex-row items-center justify-between mb-3">
          <Text className={`text-2xl font-bold ${textPrimary}`}>Expenses</Text>
          <View className="flex-row items-center gap-2">
            {/* Filter badge button */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFiltersVisible(true);
              }}
              className={`px-3 py-2 rounded-xl flex-row items-center ${
                filterCount > 0
                  ? "bg-primary-100 dark:bg-primary-900/30"
                  : isDark
                    ? "bg-slate-800"
                    : "bg-slate-100"
              }`}
              activeOpacity={0.7}
            >
              <Text
                className={`text-xs font-semibold ${
                  filterCount > 0
                    ? "text-primary-700 dark:text-primary-300"
                    : isDark
                      ? "text-slate-400"
                      : "text-slate-600"
                }`}
              >
                Filters
              </Text>
              {filterCount > 0 && (
                <View className="ml-1.5 bg-primary-600 w-5 h-5 rounded-full items-center justify-center">
                  <Text className="text-[10px] text-white font-bold">{filterCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <Animated.View
          className={`rounded-xl flex-row items-center px-4 py-2.5 mb-3 ${
            isDark ? "bg-slate-800" : "bg-slate-100"
          } ${isSearchFocused ? "border border-primary-400" : "border border-transparent"}`}
        >
          <Text className="text-slate-400 mr-2 text-sm">🔍</Text>
          <TextInput
            className={`flex-1 text-sm ${isDark ? "text-white" : "text-slate-900"}`}
            placeholder="Search expenses..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Animated.View entering={FadeIn.duration(200)}>
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text className="text-slate-400 text-lg">✕</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>

        {/* Time filter chips */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TIME_FILTERS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              className={`px-4 py-2 rounded-full ${
                activeTimeFilter === item.key
                  ? "bg-primary-600"
                  : isDark
                    ? "bg-slate-800"
                    : "bg-slate-100"
              }`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (item.key === "custom") {
                  setFiltersVisible(true);
                } else {
                  setActiveTimeFilter(item.key);
                }
              }}
              activeOpacity={0.7}
            >
              <Text
                className={`text-xs font-semibold ${
                  activeTimeFilter === item.key ? "text-white" : isDark ? "text-slate-400" : "text-slate-600"
                }`}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Expense List */}
      {isLoading ? (
        <View className="px-5 pt-3">
          <ExpenseSkeleton />
        </View>
      ) : (
        <FlatList
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}
          data={sectionedData}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4F46E5"
              colors={["#4F46E5"]}
            />
          }
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
        />
      )}

      {/* FAB */}
      <Animated.View
        entering={FadeIn.duration(500).delay(400)}
        className="absolute bottom-6 right-5"
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
            router.push("/expense/new");
          }}
          activeOpacity={0.8}
        >
          <Text className="text-white text-2xl font-light leading-none">+</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Filters Sheet */}
      <ExpenseFiltersSheet
        visible={filtersVisible}
        filters={advancedFilters}
        onApply={(f) => {
          setAdvancedFilters(f);
          setActiveTimeFilter("custom");
        }}
        onClose={() => setFiltersVisible(false)}
      />
    </SafeAreaView>
  );
}
