import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Share,
  ActionSheetIOS,
  Platform,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
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
import ReceiptPreview from "@/components/receipt-preview";
import ExpenseComments from "@/components/expense-comments";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExpenseDetail {
  id: string;
  amount: number;
  type: "expense" | "income";
  category: string;
  categoryIcon: string;
  categoryColor: string;
  description: string;
  date: string;
  tags: string[];
  notes: string;
  receiptUrl: string | null;
  isRecurring: boolean;
  recurrenceInterval: string | null;
  createdAt: string;
  updatedAt: string;
  editHistory: EditEntry[];
}

interface EditEntry {
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Mock data hook
// ---------------------------------------------------------------------------

function useExpenseDetail(id: string): {
  expense: ExpenseDetail | null;
  isLoading: boolean;
} {
  return {
    expense: {
      id,
      amount: 1299,
      type: "expense",
      category: "Shopping",
      categoryIcon: "🛍",
      categoryColor: "#FF9F43",
      description: "Amazon purchase -- Wireless earbuds",
      date: "2026-03-24",
      tags: ["personal", "electronics"],
      notes: "Replacement for lost earbuds. Got a good deal during the sale.",
      receiptUrl: null,
      isRecurring: false,
      recurrenceInterval: null,
      createdAt: "2026-03-24T10:30:00Z",
      updatedAt: "2026-03-25T14:15:00Z",
      editHistory: [
        {
          id: "1",
          field: "amount",
          oldValue: "1499",
          newValue: "1299",
          timestamp: "2026-03-25T14:15:00Z",
        },
        {
          id: "2",
          field: "description",
          oldValue: "Amazon order",
          newValue: "Amazon purchase -- Wireless earbuds",
          timestamp: "2026-03-25T14:15:00Z",
        },
      ],
    },
    isLoading: false,
  };
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton({ isDark }: { isDark: boolean }) {
  const shimmer = isDark ? "bg-slate-700" : "bg-slate-200";
  return (
    <View className="px-5 py-6">
      <View className="items-center mb-6">
        <View className={`w-16 h-16 rounded-2xl ${shimmer} mb-3`} />
        <View className={`w-32 h-8 rounded-lg ${shimmer} mb-2`} />
        <View className={`w-20 h-4 rounded ${shimmer}`} />
      </View>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} className={`rounded-2xl p-4 mb-3 ${isDark ? "bg-slate-800" : "bg-slate-50"}`}>
          <View className={`w-16 h-3 rounded ${shimmer} mb-2`} />
          <View className={`w-40 h-4 rounded ${shimmer}`} />
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ExpenseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const { expense, isLoading } = useExpenseDetail(id ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDeleteUndo, setShowDeleteUndo] = useState(false);
  const [isVoided, setIsVoided] = useState(false);

  // Edit state
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const bgColor = isDark ? "bg-slate-900" : "bg-white";
  const cardBg = isDark ? "bg-slate-800" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const borderColor = isDark ? "border-slate-700" : "border-slate-100";

  if (isLoading) {
    return (
      <SafeAreaView className={`flex-1 ${bgColor}`}>
        <DetailSkeleton isDark={isDark} />
      </SafeAreaView>
    );
  }

  if (!expense) {
    return (
      <SafeAreaView className={`flex-1 ${bgColor} items-center justify-center`}>
        <View className={`w-20 h-20 rounded-3xl items-center justify-center mb-4 ${cardBg}`}>
          <Text className="text-4xl">🔍</Text>
        </View>
        <Text className={`text-lg font-bold ${textPrimary} mb-1`}>Expense not found</Text>
        <Text className={`text-sm ${textSecondary} mb-4`}>
          This expense may have been deleted
        </Text>
        <TouchableOpacity
          className="bg-primary-600 rounded-2xl px-6 py-3"
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  function startEditing() {
    setEditAmount(String(expense!.amount));
    setEditDescription(expense!.description);
    setEditNotes(expense!.notes);
    setIsEditing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function saveEdit() {
    // TODO: Call API to update expense
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsEditing(false);
  }

  function handleDelete() {
    Alert.alert(
      "Delete Expense",
      "Are you sure? This will be moved to trash and can be recovered within 30 days.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              // TODO: Call API to soft-delete
              await new Promise((resolve) => setTimeout(resolve, 500));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              // Show undo toast briefly
              setShowDeleteUndo(true);
              setTimeout(() => {
                setShowDeleteUndo(false);
                router.back();
              }, 2000);
            } catch {
              Alert.alert("Error", "Failed to delete expense.");
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  }

  async function handleShare() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const sign = expense!.type === "income" ? "+" : "-";
      await Share.share({
        message: `${expense!.description}\n${sign}₹${expense!.amount.toLocaleString("en-IN")}\n${expense!.category} | ${expense!.date}\n\nShared from ExpenseFlow`,
      });
    } catch {
      // User cancelled
    }
  }

  function handleVoidExpense() {
    Alert.prompt
      ? Alert.prompt(
          "Void Expense",
          "Enter a reason for voiding this expense:",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Void",
              style: "destructive",
              onPress: (reason) => {
                if (!reason?.trim()) {
                  Alert.alert("Reason Required", "Please enter a reason.");
                  return;
                }
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                setIsVoided(true);
                // TODO: Call API to void with reason
              },
            },
          ],
          "plain-text",
          "",
          "default",
        )
      : Alert.alert(
          "Void Expense",
          "Are you sure you want to void this expense? This marks it as invalid but keeps the record.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Void Expense",
              style: "destructive",
              onPress: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                setIsVoided(true);
                // TODO: Call API to void
              },
            },
          ],
        );
  }

  function handleDuplicate() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/expense/new",
      params: {
        amount: String(expense!.amount),
        categoryId: expense!.category.toLowerCase(),
        description: `${expense!.description} (copy)`,
        notes: expense!.notes,
        type: expense!.type,
      },
    });
  }

  function handleMoreActions() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Edit", "Duplicate", "Void Expense", "Delete"],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 4,
          title: expense!.description,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) startEditing();
          else if (buttonIndex === 2) handleDuplicate();
          else if (buttonIndex === 3) handleVoidExpense();
          else if (buttonIndex === 4) handleDelete();
        },
      );
    } else {
      Alert.alert(expense!.description, "Choose an action", [
        { text: "Cancel", style: "cancel" },
        { text: "Edit", onPress: startEditing },
        { text: "Duplicate", onPress: handleDuplicate },
        {
          text: "Void Expense",
          onPress: handleVoidExpense,
          style: "destructive",
        },
        { text: "Delete", onPress: handleDelete, style: "destructive" },
      ]);
    }
  }

  const isIncome = expense.type === "income";

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`}>
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
        <Text className={`text-lg font-bold ${textPrimary}`}>Details</Text>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={handleShare}
            className={`w-9 h-9 rounded-xl items-center justify-center ${
              isDark ? "bg-slate-800" : "bg-slate-100"
            }`}
            activeOpacity={0.7}
          >
            <Text className="text-sm">↗</Text>
          </TouchableOpacity>
          {isEditing ? (
            <TouchableOpacity onPress={saveEdit} activeOpacity={0.7}>
              <Text className="text-primary-600 font-bold">Save</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleMoreActions}
              className={`w-9 h-9 rounded-xl items-center justify-center ${
                isDark ? "bg-slate-800" : "bg-slate-100"
              }`}
              activeOpacity={0.7}
            >
              <Text className={`text-xl font-bold leading-none ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                ···
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount + Category header */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(100)}
          className="items-center mb-8"
        >
          <View
            className="w-18 h-18 rounded-3xl items-center justify-center mb-4"
            style={{
              backgroundColor: expense.categoryColor + "20",
              width: 72,
              height: 72,
              borderRadius: 24,
            }}
          >
            <Text className="text-4xl">{expense.categoryIcon}</Text>
          </View>

          {isEditing ? (
            <View className="flex-row items-baseline">
              <Text className={`text-4xl font-bold ${textSecondary} mr-1`}>₹</Text>
              <TextInput
                className={`text-4xl font-bold ${textPrimary} text-center min-w-[100px]`}
                value={editAmount}
                onChangeText={setEditAmount}
                keyboardType="decimal-pad"
                style={{ fontVariant: ["tabular-nums"] }}
              />
            </View>
          ) : (
            <Text
              className={`text-4xl font-bold ${
                isIncome ? "text-green-600" : textPrimary
              }`}
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {isIncome ? "+" : "-"}₹{expense.amount.toLocaleString("en-IN")}
            </Text>
          )}

          <View
            className="mt-2 px-3 py-1 rounded-full"
            style={{ backgroundColor: expense.categoryColor + "20" }}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: expense.categoryColor }}
            >
              {expense.categoryIcon} {expense.category}
            </Text>
          </View>

          {isIncome && (
            <View className="mt-1.5 px-2.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30">
              <Text className="text-[10px] font-bold text-green-700 dark:text-green-300 uppercase">
                Income
              </Text>
            </View>
          )}
          {isVoided && (
            <Animated.View
              entering={FadeIn.duration(300)}
              className="mt-1.5 px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30"
            >
              <Text className="text-[10px] font-bold text-red-700 dark:text-red-300 uppercase">
                Voided
              </Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* Details Card */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(200)}
          className={`${cardBg} rounded-2xl p-5 mb-4`}
        >
          <DetailRow label="Description" isDark={isDark}>
            {isEditing ? (
              <TextInput
                className={`text-sm ${textPrimary} border rounded-xl px-3 py-2.5 ${
                  isDark ? "bg-slate-700 border-slate-600" : "bg-white border-slate-200"
                }`}
                value={editDescription}
                onChangeText={setEditDescription}
              />
            ) : (
              <Text className={`text-sm font-medium ${textPrimary}`}>
                {expense.description}
              </Text>
            )}
          </DetailRow>

          <View className={`h-px my-3.5 ${isDark ? "bg-slate-700" : "bg-slate-200"}`} />

          <DetailRow label="Date" isDark={isDark}>
            <Text className={`text-sm font-medium ${textPrimary}`}>
              {new Date(expense.date).toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </DetailRow>

          <View className={`h-px my-3.5 ${isDark ? "bg-slate-700" : "bg-slate-200"}`} />

          <DetailRow label="Tags" isDark={isDark}>
            {expense.tags.length > 0 ? (
              <View className="flex-row flex-wrap gap-1.5">
                {expense.tags.map((tag) => (
                  <View
                    key={tag}
                    className="bg-primary-100 dark:bg-primary-900/30 px-2.5 py-1 rounded-full"
                  >
                    <Text className="text-xs text-primary-700 dark:text-primary-300 font-medium">
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className={`text-sm ${textSecondary}`}>No tags</Text>
            )}
          </DetailRow>

          <View className={`h-px my-3.5 ${isDark ? "bg-slate-700" : "bg-slate-200"}`} />

          <DetailRow label="Recurring" isDark={isDark}>
            <Text className={`text-sm font-medium ${textPrimary}`}>
              {expense.isRecurring
                ? `Yes - ${expense.recurrenceInterval}`
                : "No"}
            </Text>
          </DetailRow>
        </Animated.View>

        {/* Notes */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(300)}
          className={`${cardBg} rounded-2xl p-5 mb-4`}
        >
          <Text
            className={`text-xs font-bold uppercase tracking-wider mb-2 ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            Notes
          </Text>
          {isEditing ? (
            <TextInput
              className={`text-sm ${textPrimary} border rounded-xl px-3 py-2.5 min-h-[60px] ${
                isDark ? "bg-slate-700 border-slate-600" : "bg-white border-slate-200"
              }`}
              value={editNotes}
              onChangeText={setEditNotes}
              multiline
              textAlignVertical="top"
            />
          ) : (
            <Text className={`text-sm leading-5 ${expense.notes ? textPrimary : textSecondary}`}>
              {expense.notes || "No notes added"}
            </Text>
          )}
        </Animated.View>

        {/* Receipt */}
        {expense.receiptUrl && (
          <Animated.View
            entering={FadeInDown.duration(500).delay(350)}
            className="mb-4"
          >
            <ReceiptPreview uri={expense.receiptUrl} />
          </Animated.View>
        )}

        {/* Edit History */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(400)}
          className={`${cardBg} rounded-2xl overflow-hidden mb-6`}
        >
          <TouchableOpacity
            onPress={() => {
              setShowHistory(!showHistory);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            className="flex-row items-center justify-between p-5"
            activeOpacity={0.7}
          >
            <View>
              <Text
                className={`text-xs font-bold uppercase tracking-wider ${
                  isDark ? "text-slate-500" : "text-slate-400"
                }`}
              >
                History
              </Text>
              <Text className={`text-xs ${textSecondary} mt-0.5`}>
                Created {new Date(expense.createdAt).toLocaleDateString("en-IN")}
              </Text>
            </View>
            <Text className={textSecondary}>{showHistory ? "▲" : "▼"}</Text>
          </TouchableOpacity>

          {showHistory && (
            <Animated.View
              entering={FadeInDown.duration(200)}
              className={`px-5 pb-5 border-t ${isDark ? "border-slate-700" : "border-slate-200"}`}
            >
              {expense.editHistory.length > 0 ? (
                expense.editHistory.map((entry, i) => (
                  <View key={entry.id} className={`py-3 ${i > 0 ? `border-t ${isDark ? "border-slate-700" : "border-slate-200"}` : ""}`}>
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className={`text-xs font-semibold ${textPrimary}`}>
                        {entry.field.charAt(0).toUpperCase() + entry.field.slice(1)} changed
                      </Text>
                      <Text className={`text-[10px] ${textSecondary}`}>
                        {new Date(entry.timestamp).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Text className={`text-xs ${textSecondary} line-through`}>
                        {entry.oldValue}
                      </Text>
                      <Text className={`text-xs ${textSecondary}`}>→</Text>
                      <Text className={`text-xs font-medium ${textPrimary}`}>
                        {entry.newValue}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text className={`text-xs ${textSecondary} pt-3`}>
                  No edits yet
                </Text>
              )}
              <Text className={`text-[10px] ${textSecondary} mt-2`}>
                Last updated: {new Date(expense.updatedAt).toLocaleString("en-IN")}
              </Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* Comments */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(420)}
          className={`${cardBg} rounded-2xl p-5 mb-6`}
        >
          <ExpenseComments
            expenseId={expense.id}
            currentUserId="me"
            currentUserName="You"
          />
        </Animated.View>

        {/* Action buttons row */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(450)}
          className="flex-row gap-3 mb-3"
        >
          <TouchableOpacity
            className={`flex-1 rounded-2xl py-3.5 items-center border ${
              isDark ? "border-primary-700 bg-primary-900/20" : "border-primary-200 bg-primary-50"
            }`}
            onPress={handleDuplicate}
            activeOpacity={0.7}
          >
            <Text className="text-primary-600 font-semibold text-sm">Duplicate</Text>
          </TouchableOpacity>

          {!isVoided && (
            <TouchableOpacity
              className={`flex-1 rounded-2xl py-3.5 items-center border ${
                isDark ? "border-amber-900 bg-amber-900/20" : "border-amber-200 bg-amber-50"
              }`}
              onPress={handleVoidExpense}
              activeOpacity={0.7}
            >
              <Text className="text-amber-600 dark:text-amber-400 font-semibold text-sm">
                Void
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Delete Button */}
        <Animated.View entering={FadeInUp.duration(500).delay(470)}>
          <TouchableOpacity
            className={`rounded-2xl py-4 items-center border-2 ${
              isDark ? "border-red-900" : "border-red-200"
            } ${isDark ? "bg-red-900/20" : "bg-red-50"}`}
            onPress={handleDelete}
            disabled={isDeleting}
            activeOpacity={0.7}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Text className="text-red-500 font-bold">Delete Expense</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Undo toast */}
      {showDeleteUndo && (
        <Animated.View
          entering={SlideInDown.duration(300)}
          className="absolute bottom-10 left-5 right-5 bg-slate-800 rounded-2xl p-4 flex-row items-center justify-between"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 10,
          }}
        >
          <Text className="text-white text-sm font-medium">Expense deleted</Text>
          <TouchableOpacity
            onPress={() => {
              setShowDeleteUndo(false);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              // TODO: Undo delete
            }}
            activeOpacity={0.7}
          >
            <Text className="text-primary-400 font-bold text-sm">UNDO</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Detail Row helper
// ---------------------------------------------------------------------------

function DetailRow({
  label,
  children,
  isDark,
}: {
  label: string;
  children: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <View>
      <Text
        className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${
          isDark ? "text-slate-500" : "text-slate-400"
        }`}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}
