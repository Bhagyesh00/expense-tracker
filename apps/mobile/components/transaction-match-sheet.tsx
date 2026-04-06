import { forwardRef, useCallback } from "react";
import { View, Text, TouchableOpacity, FlatList, useColorScheme } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";

// ---- Types ----

interface BankTransaction {
  id: string;
  amount: number;
  merchant: string;
  date: string;
  bankName: string;
}

interface ExpenseMatch {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  confidence: number;
}

interface TransactionMatchSheetProps {
  snapPoints: string[];
  transaction: BankTransaction | null;
  matches: ExpenseMatch[];
  onMatchConfirm: (transactionId: string, expenseId: string) => void;
  onCreateExpense: (transaction: BankTransaction) => void;
  onDismiss: () => void;
}

// ---- Helpers ----

function getConfidenceColor(confidence: number): string {
  if (confidence >= 90) return "#10B981";
  if (confidence >= 70) return "#F59E0B";
  return "#EF4444";
}

// ---- Component ----

const TransactionMatchSheet = forwardRef<BottomSheet, TransactionMatchSheetProps>(
  function TransactionMatchSheet(
    { snapPoints, transaction, matches, onMatchConfirm, onCreateExpense, onDismiss },
    ref
  ) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    const textPrimary = isDark ? "text-white" : "text-slate-900";
    const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
    const sheetBg = isDark ? "#0F172A" : "#FFFFFF";

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      []
    );

    if (!transaction) return null;

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: sheetBg }}
        handleIndicatorStyle={{ backgroundColor: isDark ? "#475569" : "#CBD5E1" }}
        onClose={onDismiss}
      >
        <BottomSheetView style={{ flex: 1, paddingHorizontal: 20 }}>
          {/* Transaction Details */}
          <View
            className={`${isDark ? "bg-slate-800" : "bg-slate-50"} rounded-xl p-4 mb-4`}
          >
            <Text className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-2`}>
              Bank Transaction
            </Text>
            <Text className={`text-base font-bold ${textPrimary}`}>
              {transaction.merchant}
            </Text>
            <View className="flex-row items-center justify-between mt-2">
              <Text className={`text-sm ${textSecondary}`}>{transaction.date}</Text>
              <Text className={`text-lg font-bold ${textPrimary}`}>
                {"\u20B9"}{transaction.amount.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>

          {/* Potential Matches */}
          <Text className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-3`}>
            Potential Matches ({matches.length})
          </Text>

          {matches.length > 0 ? (
            <FlatList
              data={matches}
              keyExtractor={(item) => item.id}
              scrollEnabled={true}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const confColor = getConfidenceColor(item.confidence);
                return (
                  <View
                    className={`${isDark ? "bg-slate-800" : "bg-white"} rounded-xl p-3.5 mb-2 border ${isDark ? "border-slate-700" : "border-slate-100"}`}
                  >
                    <View className="flex-row items-center mb-2">
                      <View className="flex-1">
                        <Text className={`text-sm font-semibold ${textPrimary}`}>
                          {item.description}
                        </Text>
                        <View className="flex-row items-center mt-1 gap-2">
                          <Text className={`text-xs ${textSecondary}`}>{item.category}</Text>
                          <View className={`w-1 h-1 rounded-full ${isDark ? "bg-slate-600" : "bg-slate-300"}`} />
                          <Text className={`text-xs ${textSecondary}`}>{item.date}</Text>
                        </View>
                      </View>
                      <View className="items-end">
                        <Text className={`text-sm font-bold ${textPrimary}`}>
                          {"\u20B9"}{item.amount.toLocaleString("en-IN")}
                        </Text>
                        <View
                          className="rounded-full px-2 py-0.5 mt-1"
                          style={{ backgroundColor: confColor + "20" }}
                        >
                          <Text className="text-[10px] font-bold" style={{ color: confColor }}>
                            {item.confidence}% match
                          </Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      className="bg-primary-600 rounded-lg py-2.5 items-center"
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        onMatchConfirm(transaction.id, item.id);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text className="text-white text-xs font-semibold">Match</Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
              ListFooterComponent={
                <View className="mt-2 mb-4">
                  <TouchableOpacity
                    className={`${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"} border rounded-xl py-3.5 items-center mb-2`}
                    onPress={() => onCreateExpense(transaction)}
                    activeOpacity={0.7}
                  >
                    <Text className="text-primary-600 text-sm font-semibold">
                      + Create New Expense
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="py-3 items-center"
                    onPress={onDismiss}
                    activeOpacity={0.7}
                  >
                    <Text className={`text-sm ${textSecondary}`}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          ) : (
            <View className="items-center py-6">
              <Text className="text-3xl mb-2">{"🔍"}</Text>
              <Text className={`text-sm ${textSecondary} mb-4`}>
                No matching expenses found
              </Text>
              <TouchableOpacity
                className="bg-primary-600 rounded-xl px-6 py-3 mb-2"
                onPress={() => onCreateExpense(transaction)}
                activeOpacity={0.8}
              >
                <Text className="text-white text-sm font-semibold">
                  + Create New Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="py-3"
                onPress={onDismiss}
                activeOpacity={0.7}
              >
                <Text className={`text-sm ${textSecondary}`}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

export default TransactionMatchSheet;
