import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import CategoryGrid, {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from "@/components/category-grid";
import DatePickerSheet from "@/components/date-picker-sheet";
import ReceiptPreview from "@/components/receipt-preview";
import { useExpenseForm, type ExpenseType, type RecurrenceInterval } from "@/hooks/use-expense-form";

// ---------------------------------------------------------------------------
// Recurrence intervals
// ---------------------------------------------------------------------------

const RECURRENCE_OPTIONS: { key: RecurrenceInterval; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "biweekly", label: "Bi-Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "yearly", label: "Yearly" },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function NewExpenseScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const amountInputRef = useRef<TextInput>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const {
    formData,
    errors,
    isSubmitting,
    isUploading,
    uploadProgress,
    ocrResult,
    isScanning,
    aiSuggestion,
    setAmount,
    setType,
    setCategoryId,
    setDescription,
    setDate,
    setNotes,
    setIsRecurring,
    setRecurrenceInterval,
    addTag,
    removeTag,
    pickReceiptFromGallery,
    pickReceiptFromCamera,
    removeReceipt,
    applyOCRResult,
    fetchAISuggestion,
    save,
  } = useExpenseForm({
    onSaveSuccess: () => router.back(),
  });

  // Auto-focus amount on mount
  useEffect(() => {
    const timer = setTimeout(() => amountInputRef.current?.focus(), 400);
    return () => clearTimeout(timer);
  }, []);

  // AI suggestion debounce
  const descDebounceRef = useRef<NodeJS.Timeout>();
  const handleDescriptionChange = useCallback(
    (text: string) => {
      setDescription(text);
      clearTimeout(descDebounceRef.current);
      descDebounceRef.current = setTimeout(() => {
        fetchAISuggestion(text);
      }, 600);
    },
    [setDescription, fetchAISuggestion],
  );

  const handleAddTag = useCallback(() => {
    if (tagInput.trim()) {
      addTag(tagInput.trim());
      setTagInput("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [tagInput, addTag]);

  const categories =
    formData.type === "expense" ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES;

  // Animation values
  const saveButtonScale = useSharedValue(1);
  const saveButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveButtonScale.value }],
  }));

  const handleSave = useCallback(async () => {
    saveButtonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1),
    );
    await save();
  }, [save, saveButtonScale]);

  const bgColor = isDark ? "bg-slate-900" : "bg-white";
  const cardBg = isDark ? "bg-slate-800" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const borderColor = isDark ? "border-slate-700" : "border-slate-200";
  const inputBg = isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200";

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          className={`flex-row items-center justify-between px-5 py-3 border-b ${borderColor}`}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className={`w-9 h-9 rounded-xl items-center justify-center ${
              isDark ? "bg-slate-800" : "bg-slate-100"
            }`}
          >
            <Text className={textPrimary}>←</Text>
          </TouchableOpacity>
          <Text className={`text-lg font-bold ${textPrimary}`}>New Expense</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#4F46E5" />
            ) : (
              <Text className="text-primary-600 text-base font-semibold">Save</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Amount Input */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(100)}
            className="items-center mb-8"
          >
            <Text className={`text-sm font-medium ${textSecondary} mb-3`}>
              Enter Amount
            </Text>
            <View className="flex-row items-baseline">
              <Text
                className={`text-5xl font-bold mr-1 ${
                  formData.amount ? (isDark ? "text-white" : "text-slate-900") : "text-slate-300"
                }`}
              >
                ₹
              </Text>
              <TextInput
                ref={amountInputRef}
                className={`text-5xl font-bold min-w-[100px] text-center ${textPrimary}`}
                value={formData.amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={isDark ? "#475569" : "#CBD5E1"}
                style={{ fontVariant: ["tabular-nums"] }}
              />
            </View>
            {errors.amount && (
              <Animated.Text
                entering={FadeIn.duration(200)}
                className="text-red-500 text-xs mt-2"
              >
                {errors.amount}
              </Animated.Text>
            )}
          </Animated.View>

          {/* Type Toggle */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(150)}
            className="mb-6"
          >
            <View className={`flex-row rounded-2xl ${cardBg} p-1`}>
              <TouchableOpacity
                className={`flex-1 py-3 rounded-xl items-center ${
                  formData.type === "expense"
                    ? "bg-red-500"
                    : ""
                }`}
                onPress={() => {
                  setType("expense");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-sm font-bold ${
                    formData.type === "expense" ? "text-white" : textSecondary
                  }`}
                >
                  Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-3 rounded-xl items-center ${
                  formData.type === "income"
                    ? "bg-green-500"
                    : ""
                }`}
                onPress={() => {
                  setType("income");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-sm font-bold ${
                    formData.type === "income" ? "text-white" : textSecondary
                  }`}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Category Grid */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(200)}
            className="mb-6"
          >
            <Text className={`text-sm font-semibold ${textPrimary} mb-3`}>
              Category
            </Text>
            <CategoryGrid
              categories={categories}
              selectedId={formData.categoryId}
              onSelect={(id) => {
                setCategoryId(id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              searchable
              showAddButton
              onAddNew={() => router.push("/categories/")}
            />
            {errors.categoryId && (
              <Animated.Text entering={FadeIn.duration(200)} className="text-red-500 text-xs mt-2">
                {errors.categoryId}
              </Animated.Text>
            )}
          </Animated.View>

          {/* Description */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(250)}
            className="mb-4"
          >
            <Text className={`text-sm font-semibold ${textPrimary} mb-1.5`}>
              Description
            </Text>
            <TextInput
              className={`border rounded-2xl px-4 py-3.5 text-sm ${textPrimary} ${inputBg} ${
                errors.description ? "border-red-500" : ""
              }`}
              placeholder="What was this expense for?"
              placeholderTextColor="#94A3B8"
              value={formData.description}
              onChangeText={handleDescriptionChange}
            />
            {errors.description && (
              <Animated.Text entering={FadeIn.duration(200)} className="text-red-500 text-xs mt-1">
                {errors.description}
              </Animated.Text>
            )}

            {/* AI suggestion chip */}
            {aiSuggestion && aiSuggestion.confidence > 0.6 && (
              <Animated.View entering={FadeIn.duration(300)} className="mt-2">
                <TouchableOpacity
                  onPress={() => {
                    setCategoryId(aiSuggestion.categoryId);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  className="flex-row items-center self-start bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full"
                  activeOpacity={0.7}
                >
                  <Text className="text-xs mr-1">✨</Text>
                  <Text className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                    AI suggests: {aiSuggestion.categoryName}
                  </Text>
                  <Text className="text-[10px] text-indigo-400 ml-1">
                    {Math.round(aiSuggestion.confidence * 100)}%
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>

          {/* Date */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(300)}
            className="mb-4"
          >
            <Text className={`text-sm font-semibold ${textPrimary} mb-1.5`}>
              Date
            </Text>
            <TouchableOpacity
              className={`border rounded-2xl px-4 py-3.5 flex-row items-center justify-between ${inputBg}`}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text className={`text-sm ${textPrimary}`}>
                {formData.date.toLocaleDateString("en-IN", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </Text>
              <Text className={textSecondary}>📅</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Tags */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(350)}
            className="mb-4"
          >
            <Text className={`text-sm font-semibold ${textPrimary} mb-1.5`}>
              Tags
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
              className="mb-2"
            >
              {formData.tags.map((tag) => (
                <Animated.View
                  key={tag}
                  entering={FadeIn.duration(200)}
                  className="flex-row items-center bg-primary-100 dark:bg-primary-900/30 px-3 py-1.5 rounded-full"
                >
                  <Text className="text-xs font-medium text-primary-700 dark:text-primary-300 mr-1">
                    {tag}
                  </Text>
                  <TouchableOpacity onPress={() => removeTag(tag)}>
                    <Text className="text-primary-400 text-xs font-bold">✕</Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </ScrollView>
            <View className="flex-row gap-2">
              <TextInput
                className={`flex-1 border rounded-2xl px-4 py-3 text-sm ${textPrimary} ${inputBg}`}
                placeholder="Add a tag..."
                placeholderTextColor="#94A3B8"
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={handleAddTag}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={handleAddTag}
                className="bg-primary-600 rounded-2xl px-4 items-center justify-center"
                activeOpacity={0.7}
              >
                <Text className="text-white font-bold text-sm">+ Add</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Receipt */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(400)}
            className="mb-4"
          >
            <Text className={`text-sm font-semibold ${textPrimary} mb-1.5`}>
              Receipt
            </Text>
            {formData.receiptUri ? (
              <ReceiptPreview
                uri={formData.receiptUri}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                ocrResult={ocrResult}
                isScanning={isScanning}
                onRemove={removeReceipt}
                onApplyOCR={applyOCRResult}
              />
            ) : (
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className={`flex-1 border ${borderColor} rounded-2xl py-4 items-center ${cardBg}`}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    pickReceiptFromCamera();
                  }}
                  activeOpacity={0.7}
                >
                  <Text className="text-lg mb-1">📷</Text>
                  <Text className={`text-xs font-medium ${textSecondary}`}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 border ${borderColor} rounded-2xl py-4 items-center ${cardBg}`}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    pickReceiptFromGallery();
                  }}
                  activeOpacity={0.7}
                >
                  <Text className="text-lg mb-1">🖼</Text>
                  <Text className={`text-xs font-medium ${textSecondary}`}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          {/* Recurring */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(450)}
            className={`mb-4 ${cardBg} rounded-2xl px-4 py-4`}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text className={`text-sm font-semibold ${textPrimary}`}>
                  Recurring Expense
                </Text>
                <Text className={`text-xs ${textSecondary} mt-0.5`}>
                  Automatically repeat this expense
                </Text>
              </View>
              <Switch
                value={formData.isRecurring}
                onValueChange={(v) => {
                  setIsRecurring(v);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ false: isDark ? "#475569" : "#CBD5E1", true: "#A5B4FC" }}
                thumbColor={formData.isRecurring ? "#4F46E5" : isDark ? "#64748B" : "#F1F5F9"}
              />
            </View>

            {/* Interval picker */}
            {formData.isRecurring && (
              <Animated.View entering={FadeInDown.duration(300)} className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <View className="flex-row flex-wrap gap-2">
                  {RECURRENCE_OPTIONS.map(({ key, label }) => (
                    <TouchableOpacity
                      key={key}
                      onPress={() => {
                        setRecurrenceInterval(key);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      className={`px-3.5 py-2 rounded-xl ${
                        formData.recurrenceInterval === key
                          ? "bg-primary-600"
                          : isDark
                            ? "bg-slate-700"
                            : "bg-slate-200"
                      }`}
                      activeOpacity={0.7}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          formData.recurrenceInterval === key
                            ? "text-white"
                            : textSecondary
                        }`}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.recurrenceInterval && (
                  <Text className="text-red-500 text-xs mt-2">{errors.recurrenceInterval}</Text>
                )}
              </Animated.View>
            )}
          </Animated.View>

          {/* Notes */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(500)}
            className="mb-8"
          >
            <Text className={`text-sm font-semibold ${textPrimary} mb-1.5`}>
              Notes
            </Text>
            <TextInput
              className={`border rounded-2xl px-4 py-3.5 text-sm ${textPrimary} ${inputBg} min-h-[90px]`}
              placeholder="Additional notes..."
              placeholderTextColor="#94A3B8"
              multiline
              textAlignVertical="top"
              value={formData.notes}
              onChangeText={setNotes}
            />
          </Animated.View>

          {/* Save Button */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(550)}
            style={saveButtonStyle}
          >
            <TouchableOpacity
              className={`rounded-2xl py-4.5 items-center ${
                isSubmitting ? "bg-primary-400" : "bg-primary-600"
              }`}
              onPress={handleSave}
              disabled={isSubmitting}
              activeOpacity={0.8}
              style={{
                shadowColor: "#4F46E5",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 6,
                paddingVertical: 18,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-base font-bold">
                  Save {formData.type === "income" ? "Income" : "Expense"}
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Sheet */}
      <DatePickerSheet
        visible={showDatePicker}
        selectedDate={formData.date}
        onSelect={setDate}
        onClose={() => setShowDatePicker(false)}
      />
    </SafeAreaView>
  );
}
