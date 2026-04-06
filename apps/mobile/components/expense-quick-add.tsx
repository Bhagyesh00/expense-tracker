import { useState, useRef, useCallback, forwardRef, useImperativeHandle, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const QUICK_CATEGORIES = [
  { id: "food", icon: "🍔", label: "Food", color: "#FF6B6B" },
  { id: "transport", icon: "🚗", label: "Transport", color: "#4ECDC4" },
  { id: "shopping", icon: "🛍", label: "Shopping", color: "#FF9F43" },
  { id: "bills", icon: "📄", label: "Bills", color: "#54A0FF" },
  { id: "entertainment", icon: "🎬", label: "Fun", color: "#A55EEA" },
  { id: "health", icon: "💊", label: "Health", color: "#EE5A6F" },
  { id: "groceries", icon: "🛒", label: "Grocery", color: "#10AC84" },
  { id: "other", icon: "📌", label: "Other", color: "#8395A7" },
] as const;

interface ExpenseQuickAddProps {
  onSave?: (data: {
    amount: number;
    category: string;
    description: string;
  }) => Promise<void>;
}

export interface ExpenseQuickAddRef {
  open: () => void;
  close: () => void;
}

// ---------------------------------------------------------------------------
// AI suggestion based on time of day
// ---------------------------------------------------------------------------

function getTimeSuggestion(): { categoryId: string; label: string } | null {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 10) return { categoryId: "food", label: "Breakfast?" };
  if (hour >= 12 && hour < 14) return { categoryId: "food", label: "Lunch?" };
  if (hour >= 18 && hour < 21) return { categoryId: "food", label: "Dinner?" };
  if (hour >= 8 && hour < 10) return { categoryId: "transport", label: "Commute?" };
  if (hour >= 17 && hour < 19) return { categoryId: "transport", label: "Going home?" };
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ExpenseQuickAdd = forwardRef<ExpenseQuickAddRef, ExpenseQuickAddProps>(
  ({ onSave }, ref) => {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    const bottomSheetRef = useRef<BottomSheet>(null);
    const amountInputRef = useRef<TextInput>(null);

    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const timeSuggestion = useMemo(() => getTimeSuggestion(), []);

    // Animation
    const successScale = useSharedValue(0);
    const successStyle = useAnimatedStyle(() => ({
      transform: [{ scale: successScale.value }],
      opacity: successScale.value,
    }));

    const open = useCallback(() => {
      setAmount("");
      setCategory("");
      setDescription("");
      setShowSuccess(false);
      bottomSheetRef.current?.expand();
      setTimeout(() => amountInputRef.current?.focus(), 300);
    }, []);

    const close = useCallback(() => {
      bottomSheetRef.current?.close();
    }, []);

    useImperativeHandle(ref, () => ({ open, close }), [open, close]);

    const handleSave = useCallback(async () => {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Invalid Amount", "Please enter a valid amount.");
        return;
      }

      if (!category) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert("Select Category", "Please select a category.");
        return;
      }

      setIsSaving(true);
      try {
        const catLabel = QUICK_CATEGORIES.find((c) => c.id === category)?.label ?? "Expense";
        await onSave?.({
          amount: numAmount,
          category,
          description: description || `${catLabel} expense`,
        });

        // Success animation
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowSuccess(true);
        successScale.value = withSequence(
          withSpring(1.2, { damping: 8 }),
          withSpring(1, { damping: 12 }),
        );

        // Close after brief delay
        setTimeout(() => {
          setShowSuccess(false);
          successScale.value = 0;
          close();
        }, 1200);
      } catch {
        Alert.alert("Error", "Failed to save expense. Please try again.");
      } finally {
        setIsSaving(false);
      }
    }, [amount, category, description, onSave, close, successScale]);

    const bgColor = isDark ? "#0F172A" : "#FFFFFF";
    const textPrimary = isDark ? "text-white" : "text-slate-900";
    const textSecondary = isDark ? "text-slate-400" : "text-slate-500";

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={[460]}
        enablePanDownToClose
        backgroundStyle={{
          borderRadius: 28,
          backgroundColor: bgColor,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 16,
          elevation: 16,
        }}
        handleIndicatorStyle={{
          backgroundColor: isDark ? "#475569" : "#CBD5E1",
          width: 40,
          height: 4,
          borderRadius: 2,
        }}
      >
        <BottomSheetView className="px-5 pt-2 pb-6">
          {showSuccess ? (
            <Animated.View
              style={successStyle}
              className="items-center justify-center py-16"
            >
              <View className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center mb-4">
                <Text className="text-4xl">✓</Text>
              </View>
              <Text className={`text-lg font-bold ${textPrimary}`}>Saved!</Text>
              <Text className={`text-sm ${textSecondary} mt-1`}>
                ₹{Number(amount).toLocaleString("en-IN")} added
              </Text>
            </Animated.View>
          ) : (
            <>
              <Text className={`text-lg font-bold ${textPrimary} mb-1 text-center`}>
                Quick Add
              </Text>
              <Text className={`text-xs ${textSecondary} mb-4 text-center`}>
                Add an expense in seconds
              </Text>

              {/* Amount */}
              <Animated.View entering={FadeInDown.duration(300)} className="items-center mb-5">
                <View className="flex-row items-baseline">
                  <Text
                    className={`text-4xl font-bold mr-1 ${
                      amount ? textPrimary : "text-slate-300 dark:text-slate-600"
                    }`}
                  >
                    ₹
                  </Text>
                  <TextInput
                    ref={amountInputRef}
                    className={`text-4xl font-bold min-w-[80px] text-center ${textPrimary}`}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={isDark ? "#334155" : "#CBD5E1"}
                    style={{ fontVariant: ["tabular-nums"] }}
                  />
                </View>
              </Animated.View>

              {/* AI time suggestion */}
              {timeSuggestion && !category && (
                <Animated.View entering={FadeIn.duration(300)} className="mb-3">
                  <TouchableOpacity
                    onPress={() => {
                      setCategory(timeSuggestion.categoryId);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    className="flex-row items-center self-center bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full"
                    activeOpacity={0.7}
                  >
                    <Text className="text-xs mr-1">✨</Text>
                    <Text className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                      {timeSuggestion.label}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              )}

              {/* Category Quick Select */}
              <View className="mb-4">
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={QUICK_CATEGORIES}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ gap: 8 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      className={`items-center px-3 py-2.5 rounded-2xl border-2 ${
                        category === item.id
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30"
                          : isDark
                            ? "border-slate-700 bg-slate-800"
                            : "border-slate-100 bg-slate-50"
                      }`}
                      onPress={() => {
                        setCategory(item.id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text className="text-xl mb-0.5">{item.icon}</Text>
                      <Text
                        className={`text-[10px] font-semibold ${
                          category === item.id
                            ? "text-primary-700 dark:text-primary-300"
                            : textSecondary
                        }`}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>

              {/* Description */}
              <View className="mb-5">
                <TextInput
                  className={`border rounded-2xl px-4 py-3.5 text-sm ${textPrimary} ${
                    isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                  }`}
                  placeholder="What was this for? (optional)"
                  placeholderTextColor="#94A3B8"
                  value={description}
                  onChangeText={setDescription}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                />
              </View>

              {/* Actions */}
              <View className="flex-row gap-3">
                {/* Save Button */}
                <TouchableOpacity
                  className={`flex-1 rounded-2xl py-4 items-center ${
                    isSaving ? "bg-primary-400" : "bg-primary-600"
                  }`}
                  onPress={handleSave}
                  disabled={isSaving}
                  activeOpacity={0.8}
                  style={{
                    shadowColor: "#4F46E5",
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.2,
                    shadowRadius: 6,
                    elevation: 4,
                  }}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-white text-base font-bold">Save</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Add Details link */}
              <TouchableOpacity
                onPress={() => {
                  close();
                  setTimeout(() => router.push("/expense/new"), 300);
                }}
                className="mt-3 items-center py-2"
                activeOpacity={0.7}
              >
                <Text className="text-primary-600 text-sm font-medium">
                  + Add More Details
                </Text>
              </TouchableOpacity>
            </>
          )}
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

ExpenseQuickAdd.displayName = "ExpenseQuickAdd";

export default ExpenseQuickAdd;
