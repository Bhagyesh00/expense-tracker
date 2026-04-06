import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideInLeft,
} from "react-native-reanimated";
import DateTimePicker from "@react-native-community/datetimepicker";

import ThresholdSlider from "@/components/threshold-slider";

// ---- Category config for selection ----

const CATEGORIES = [
  { id: "c1", name: "Food", icon: "\uD83C\uDF54", color: "#F59E0B" },
  { id: "c2", name: "Transport", icon: "\uD83D\uDE97", color: "#3B82F6" },
  { id: "c3", name: "Shopping", icon: "\uD83D\uDECD", color: "#EC4899" },
  { id: "c4", name: "Entertainment", icon: "\uD83C\uDFAC", color: "#8B5CF6" },
  { id: "c5", name: "Bills", icon: "\uD83D\uDCC4", color: "#6366F1" },
  { id: "c6", name: "Health", icon: "\uD83D\uDC8A", color: "#10B981" },
  { id: "c7", name: "Education", icon: "\uD83D\uDCDA", color: "#0891B2" },
  { id: "c8", name: "Subscriptions", icon: "\uD83D\uDD14", color: "#D946EF" },
  { id: "c9", name: "Gifts", icon: "\uD83C\uDF81", color: "#F43F5E" },
  { id: "c10", name: "Other", icon: "\uD83D\uDCCC", color: "#64748B" },
];

const PERIOD_OPTIONS = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "yearly", label: "Yearly" },
] as const;

// ---- Icon picker options ----

const GOAL_ICONS = [
  "\uD83C\uDFAF", "\u2708\uFE0F", "\uD83C\uDFE0", "\uD83D\uDE97", "\uD83D\uDCBB",
  "\uD83D\uDCF1", "\uD83C\uDF93", "\uD83D\uDC8D", "\uD83C\uDFD6\uFE0F", "\uD83C\uDFAE",
  "\uD83D\uDEE1\uFE0F", "\uD83C\uDFC6", "\uD83D\uDCB0", "\uD83C\uDFA8", "\uD83C\uDFCB\uFE0F",
  "\uD83D\uDE80", "\uD83C\uDF1F", "\uD83C\uDF0D", "\uD83D\uDC8E", "\uD83C\uDF89",
];

const GOAL_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#6366F1", "#0891B2", "#D946EF", "#F43F5E",
  "#14B8A6", "#F97316",
];

export default function NewBudgetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [activeTab, setActiveTab] = useState<"budget" | "goal">(
    params.tab === "goal" ? "goal" : "budget"
  );

  // ---- Budget form state ----
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("monthly");
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ---- Goal form state ----
  const [goalName, setGoalName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [initialDeposit, setInitialDeposit] = useState("");
  const [targetDate, setTargetDate] = useState(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
  const [showTargetDatePicker, setShowTargetDatePicker] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState(GOAL_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(GOAL_COLORS[0]);

  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const cardBg = isDark ? "bg-slate-800" : "bg-white";
  const inputBg = isDark ? "bg-slate-700" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const borderColor = isDark ? "border-slate-700" : "border-slate-200";

  // ---- Validation ----
  const isBudgetValid = selectedCategory !== null && parseFloat(budgetAmount) > 0;
  const isGoalValid =
    goalName.trim().length > 0 &&
    parseFloat(targetAmount) > 0 &&
    targetDate > new Date();

  const handleSaveBudget = useCallback(() => {
    if (!isBudgetValid) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // TODO: Call createBudget mutation
    Alert.alert("Budget Created", "Your budget has been created successfully.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  }, [isBudgetValid, selectedCategory, budgetAmount, selectedPeriod, alertThreshold, startDate]);

  const handleSaveGoal = useCallback(() => {
    if (!isGoalValid) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // TODO: Call createSavingsGoal mutation
    Alert.alert("Goal Created", "Your savings goal has been created successfully.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  }, [isGoalValid, goalName, targetAmount, initialDeposit, targetDate, selectedIcon, selectedColor]);

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`} edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
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
            {activeTab === "budget" ? "New Budget" : "New Goal"}
          </Text>
        </Animated.View>

        {/* Segmented control */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(50)}
          className="px-5 mb-4"
        >
          <View className={`flex-row ${isDark ? "bg-slate-800" : "bg-slate-200"} rounded-xl p-1`}>
            {(["budget", "goal"] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                className={`flex-1 py-2.5 rounded-lg items-center ${
                  activeTab === tab
                    ? isDark ? "bg-slate-700" : "bg-white"
                    : ""
                }`}
                style={
                  activeTab === tab
                    ? { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }
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
                  {tab === "budget" ? "Budget" : "Savings Goal"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-8"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {activeTab === "budget" ? (
            /* ======== BUDGET FORM ======== */
            <Animated.View entering={SlideInLeft.duration(300)} key="budget-form">
              {/* Category selector */}
              <Animated.View entering={FadeInDown.duration(400).delay(100)}>
                <Text className={`text-sm font-semibold ${textPrimary} mb-3`}>
                  Select Category
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-5">
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      className={`items-center px-3 py-2.5 rounded-xl ${
                        selectedCategory === cat.id
                          ? ""
                          : cardBg
                      }`}
                      style={
                        selectedCategory === cat.id
                          ? {
                              backgroundColor: cat.color + "20",
                              borderWidth: 2,
                              borderColor: cat.color,
                            }
                          : {
                              borderWidth: 2,
                              borderColor: "transparent",
                            }
                      }
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedCategory(cat.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text className="text-lg mb-0.5">{cat.icon}</Text>
                      <Text
                        className={`text-[10px] font-medium ${
                          selectedCategory === cat.id
                            ? textPrimary
                            : textSecondary
                        }`}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>

              {/* Amount input */}
              <Animated.View entering={FadeInDown.duration(400).delay(150)}>
                <Text className={`text-sm font-semibold ${textPrimary} mb-2`}>
                  Budget Amount
                </Text>
                <View
                  className={`flex-row items-center ${inputBg} rounded-2xl px-4 py-3 mb-5`}
                >
                  <Text className={`text-2xl font-bold mr-2 ${textSecondary}`}>
                    {"\u20B9"}
                  </Text>
                  <TextInput
                    className={`flex-1 text-2xl font-bold ${textPrimary}`}
                    value={budgetAmount}
                    onChangeText={setBudgetAmount}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={isDark ? "#475569" : "#CBD5E1"}
                  />
                </View>
              </Animated.View>

              {/* Period picker */}
              <Animated.View entering={FadeInDown.duration(400).delay(200)}>
                <Text className={`text-sm font-semibold ${textPrimary} mb-2`}>
                  Period
                </Text>
                <View className="flex-row gap-2 mb-5">
                  {PERIOD_OPTIONS.map((period) => (
                    <TouchableOpacity
                      key={period.key}
                      className={`flex-1 py-3 rounded-xl items-center ${
                        selectedPeriod === period.key
                          ? "bg-primary-600"
                          : cardBg
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
                            : isDark ? "text-slate-300" : "text-slate-600"
                        }`}
                      >
                        {period.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>

              {/* Alert threshold slider */}
              <Animated.View entering={FadeInDown.duration(400).delay(250)} className="mb-5">
                <ThresholdSlider
                  value={alertThreshold}
                  onValueChange={setAlertThreshold}
                />
              </Animated.View>

              {/* Start date */}
              <Animated.View entering={FadeInDown.duration(400).delay(300)}>
                <Text className={`text-sm font-semibold ${textPrimary} mb-2`}>
                  Start Date
                </Text>
                <TouchableOpacity
                  className={`${inputBg} rounded-2xl px-4 py-3.5 mb-6`}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Text className={`text-sm ${textPrimary}`}>
                    {startDate.toLocaleDateString("en-IN", {
                      weekday: "short",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(_, date) => {
                      setShowDatePicker(Platform.OS === "ios");
                      if (date) setStartDate(date);
                    }}
                    themeVariant={isDark ? "dark" : "light"}
                  />
                )}
              </Animated.View>

              {/* Save button */}
              <Animated.View entering={FadeInDown.duration(400).delay(350)}>
                <TouchableOpacity
                  className={`py-4 rounded-2xl items-center ${
                    isBudgetValid ? "bg-primary-600" : isDark ? "bg-slate-700" : "bg-slate-200"
                  }`}
                  onPress={handleSaveBudget}
                  disabled={!isBudgetValid}
                  activeOpacity={0.8}
                >
                  <Text
                    className={`text-base font-bold ${
                      isBudgetValid ? "text-white" : isDark ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Create Budget
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          ) : (
            /* ======== SAVINGS GOAL FORM ======== */
            <Animated.View entering={SlideInRight.duration(300)} key="goal-form">
              {/* Goal name */}
              <Animated.View entering={FadeInDown.duration(400).delay(100)}>
                <Text className={`text-sm font-semibold ${textPrimary} mb-2`}>
                  Goal Name
                </Text>
                <TextInput
                  className={`${inputBg} rounded-2xl px-4 py-3.5 text-sm ${textPrimary} mb-5`}
                  value={goalName}
                  onChangeText={setGoalName}
                  placeholder="e.g., Vacation to Goa"
                  placeholderTextColor={isDark ? "#475569" : "#CBD5E1"}
                  maxLength={100}
                />
              </Animated.View>

              {/* Target amount */}
              <Animated.View entering={FadeInDown.duration(400).delay(150)}>
                <Text className={`text-sm font-semibold ${textPrimary} mb-2`}>
                  Target Amount
                </Text>
                <View
                  className={`flex-row items-center ${inputBg} rounded-2xl px-4 py-3 mb-5`}
                >
                  <Text className={`text-2xl font-bold mr-2 ${textSecondary}`}>
                    {"\u20B9"}
                  </Text>
                  <TextInput
                    className={`flex-1 text-2xl font-bold ${textPrimary}`}
                    value={targetAmount}
                    onChangeText={setTargetAmount}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={isDark ? "#475569" : "#CBD5E1"}
                  />
                </View>
              </Animated.View>

              {/* Initial deposit */}
              <Animated.View entering={FadeInDown.duration(400).delay(200)}>
                <Text className={`text-sm font-semibold ${textPrimary} mb-2`}>
                  Initial Deposit (optional)
                </Text>
                <View
                  className={`flex-row items-center ${inputBg} rounded-2xl px-4 py-3 mb-5`}
                >
                  <Text className={`text-lg font-bold mr-2 ${textSecondary}`}>
                    {"\u20B9"}
                  </Text>
                  <TextInput
                    className={`flex-1 text-lg font-bold ${textPrimary}`}
                    value={initialDeposit}
                    onChangeText={setInitialDeposit}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={isDark ? "#475569" : "#CBD5E1"}
                  />
                </View>
              </Animated.View>

              {/* Target date */}
              <Animated.View entering={FadeInDown.duration(400).delay(250)}>
                <Text className={`text-sm font-semibold ${textPrimary} mb-2`}>
                  Target Date
                </Text>
                <TouchableOpacity
                  className={`${inputBg} rounded-2xl px-4 py-3.5 mb-5`}
                  onPress={() => setShowTargetDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Text className={`text-sm ${textPrimary}`}>
                    {targetDate.toLocaleDateString("en-IN", {
                      weekday: "short",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                </TouchableOpacity>
                {showTargetDatePicker && (
                  <DateTimePicker
                    value={targetDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    minimumDate={new Date()}
                    onChange={(_, date) => {
                      setShowTargetDatePicker(Platform.OS === "ios");
                      if (date) setTargetDate(date);
                    }}
                    themeVariant={isDark ? "dark" : "light"}
                  />
                )}
              </Animated.View>

              {/* Icon picker */}
              <Animated.View entering={FadeInDown.duration(400).delay(300)}>
                <Text className={`text-sm font-semibold ${textPrimary} mb-2`}>
                  Icon
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-5">
                  {GOAL_ICONS.map((icon) => (
                    <TouchableOpacity
                      key={icon}
                      className={`w-11 h-11 rounded-xl items-center justify-center ${
                        selectedIcon === icon ? "" : cardBg
                      }`}
                      style={
                        selectedIcon === icon
                          ? {
                              backgroundColor: selectedColor + "20",
                              borderWidth: 2,
                              borderColor: selectedColor,
                            }
                          : { borderWidth: 2, borderColor: "transparent" }
                      }
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedIcon(icon);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text className="text-lg">{icon}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>

              {/* Color picker */}
              <Animated.View entering={FadeInDown.duration(400).delay(350)}>
                <Text className={`text-sm font-semibold ${textPrimary} mb-2`}>
                  Color
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-6">
                  {GOAL_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{
                        backgroundColor: color,
                        borderWidth: selectedColor === color ? 3 : 0,
                        borderColor: isDark ? "#FFFFFF" : "#0F172A",
                      }}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedColor(color);
                      }}
                      activeOpacity={0.7}
                    >
                      {selectedColor === color && (
                        <Text className="text-white text-sm font-bold">{"\u2713"}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>

              {/* Save button */}
              <Animated.View entering={FadeInDown.duration(400).delay(400)}>
                <TouchableOpacity
                  className={`py-4 rounded-2xl items-center ${
                    isGoalValid ? "bg-primary-600" : isDark ? "bg-slate-700" : "bg-slate-200"
                  }`}
                  onPress={handleSaveGoal}
                  disabled={!isGoalValid}
                  activeOpacity={0.8}
                >
                  <Text
                    className={`text-base font-bold ${
                      isGoalValid ? "text-white" : isDark ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Create Goal
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
