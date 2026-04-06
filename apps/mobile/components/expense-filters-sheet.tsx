import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  useColorScheme,
} from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import CategoryGrid, {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  type CategoryItem,
} from "./category-grid";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DatePreset = "today" | "yesterday" | "this_week" | "this_month" | "custom";
export type TypeFilter = "all" | "expense" | "income";

export interface ExpenseFilters {
  datePreset: DatePreset;
  customStartDate: Date | null;
  customEndDate: Date | null;
  categoryIds: string[];
  type: TypeFilter;
  amountMin: string;
  amountMax: string;
}

interface ExpenseFiltersSheetProps {
  visible: boolean;
  filters: ExpenseFilters;
  onApply: (filters: ExpenseFilters) => void;
  onClose: () => void;
  categories?: CategoryItem[];
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_FILTERS: ExpenseFilters = {
  datePreset: "this_month",
  customStartDate: null,
  customEndDate: null,
  categoryIds: [],
  type: "all",
  amountMin: "",
  amountMax: "",
};

export function getActiveFilterCount(filters: ExpenseFilters): number {
  let count = 0;
  if (filters.datePreset !== "this_month") count++;
  if (filters.categoryIds.length > 0) count++;
  if (filters.type !== "all") count++;
  if (filters.amountMin || filters.amountMax) count++;
  return count;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExpenseFiltersSheet({
  visible,
  filters,
  onApply,
  onClose,
  categories,
}: ExpenseFiltersSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [localFilters, setLocalFilters] = useState<ExpenseFilters>(filters);

  // Reset local state when sheet opens
  const handleOpen = useCallback(() => {
    setLocalFilters(filters);
  }, [filters]);

  const allCategories = useMemo(
    () => categories ?? [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES],
    [categories],
  );

  const toggleCategory = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalFilters((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id)
        ? prev.categoryIds.filter((c) => c !== id)
        : [...prev.categoryIds, id],
    }));
  }, []);

  const handleApply = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onApply(localFilters);
    onClose();
  }, [localFilters, onApply, onClose]);

  const handleClearAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalFilters(DEFAULT_FILTERS);
  }, []);

  const activeCount = getActiveFilterCount(localFilters);

  const bgColor = isDark ? "bg-slate-900" : "bg-white";
  const cardBg = isDark ? "bg-slate-800" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";

  const datePresets: { key: DatePreset; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "this_week", label: "This Week" },
    { key: "this_month", label: "This Month" },
  ];

  const typeOptions: { key: TypeFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "expense", label: "Expense" },
    { key: "income", label: "Income" },
  ];

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(200)} className="flex-1 justify-end bg-black/50">
        <TouchableOpacity className="flex-1" onPress={onClose} activeOpacity={1} />

        <Animated.View
          entering={SlideInDown.duration(300).springify().damping(18)}
          className={`${bgColor} rounded-t-3xl max-h-[85%]`}
        >
          {/* Handle */}
          <View className="items-center pt-3 pb-1">
            <View className={`w-10 h-1 rounded-full ${isDark ? "bg-slate-700" : "bg-slate-300"}`} />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-3">
            <Text className={`text-lg font-bold ${textPrimary}`}>Filters</Text>
            <View className="flex-row items-center gap-3">
              {activeCount > 0 && (
                <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7}>
                  <Text className="text-red-500 text-sm font-medium">Clear All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose}>
                <Text className="text-primary-600 font-medium">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            className="px-5"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 30 }}
          >
            {/* Date Range */}
            <View className="mb-5">
              <Text className={`text-sm font-semibold ${textPrimary} mb-2.5`}>Date Range</Text>
              <View className="flex-row flex-wrap gap-2">
                {datePresets.map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setLocalFilters((prev) => ({ ...prev, datePreset: key }));
                    }}
                    className={`px-4 py-2.5 rounded-xl ${
                      localFilters.datePreset === key
                        ? "bg-primary-600"
                        : cardBg
                    }`}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        localFilters.datePreset === key ? "text-white" : textSecondary
                      }`}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Type */}
            <View className="mb-5">
              <Text className={`text-sm font-semibold ${textPrimary} mb-2.5`}>Type</Text>
              <View className={`flex-row rounded-xl ${cardBg} p-1`}>
                {typeOptions.map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setLocalFilters((prev) => ({ ...prev, type: key }));
                    }}
                    className={`flex-1 py-2.5 rounded-lg items-center ${
                      localFilters.type === key
                        ? isDark
                          ? "bg-slate-700"
                          : "bg-white shadow-sm"
                        : ""
                    }`}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        localFilters.type === key
                          ? "text-primary-600"
                          : textSecondary
                      }`}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Amount Range */}
            <View className="mb-5">
              <Text className={`text-sm font-semibold ${textPrimary} mb-2.5`}>Amount Range</Text>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <TextInput
                    className={`${cardBg} rounded-xl px-4 py-3 text-sm ${textPrimary} border ${
                      isDark ? "border-slate-700" : "border-slate-200"
                    }`}
                    placeholder="Min ₹"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                    value={localFilters.amountMin}
                    onChangeText={(v) =>
                      setLocalFilters((prev) => ({ ...prev, amountMin: v }))
                    }
                  />
                </View>
                <View className="items-center justify-center">
                  <Text className={textSecondary}>to</Text>
                </View>
                <View className="flex-1">
                  <TextInput
                    className={`${cardBg} rounded-xl px-4 py-3 text-sm ${textPrimary} border ${
                      isDark ? "border-slate-700" : "border-slate-200"
                    }`}
                    placeholder="Max ₹"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                    value={localFilters.amountMax}
                    onChangeText={(v) =>
                      setLocalFilters((prev) => ({ ...prev, amountMax: v }))
                    }
                  />
                </View>
              </View>
            </View>

            {/* Category Multi-select */}
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2.5">
                <Text className={`text-sm font-semibold ${textPrimary}`}>Categories</Text>
                {localFilters.categoryIds.length > 0 && (
                  <TouchableOpacity
                    onPress={() =>
                      setLocalFilters((prev) => ({ ...prev, categoryIds: [] }))
                    }
                  >
                    <Text className="text-xs text-primary-600 font-medium">
                      Clear ({localFilters.categoryIds.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View className="flex-row flex-wrap gap-2">
                {allCategories.map((cat) => {
                  const isSelected = localFilters.categoryIds.includes(cat.id);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => toggleCategory(cat.id)}
                      className={`flex-row items-center px-3 py-2 rounded-xl border ${
                        isSelected
                          ? "bg-primary-50 border-primary-300 dark:bg-primary-900/30 dark:border-primary-700"
                          : isDark
                            ? "bg-slate-800 border-slate-700"
                            : "bg-slate-50 border-slate-200"
                      }`}
                      activeOpacity={0.7}
                    >
                      <Text className="text-sm mr-1.5">{cat.icon}</Text>
                      <Text
                        className={`text-xs font-medium ${
                          isSelected
                            ? "text-primary-700 dark:text-primary-300"
                            : textSecondary
                        }`}
                      >
                        {cat.name}
                      </Text>
                      {isSelected && (
                        <Text className="text-primary-600 text-xs ml-1.5 font-bold">✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Apply button */}
          <View className="px-5 pb-8 pt-3">
            <TouchableOpacity
              onPress={handleApply}
              className="bg-primary-600 rounded-2xl py-4 items-center flex-row justify-center gap-2"
              activeOpacity={0.8}
            >
              <Text className="text-white text-base font-bold">Apply Filters</Text>
              {activeCount > 0 && (
                <View className="bg-white/20 rounded-full px-2 py-0.5">
                  <Text className="text-white text-xs font-bold">{activeCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
