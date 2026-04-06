import { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import BottomSheet from "@gorhom/bottom-sheet";

import TransactionMatchSheet from "@/components/transaction-match-sheet";

// ---- Types ----

export interface BankTransaction {
  id: string;
  amount: number;
  merchant: string;
  date: string;
  bankName: string;
  matched: boolean;
}

export interface ExpenseMatch {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  confidence: number;
}

// ---- Mock Data ----

const MOCK_TRANSACTIONS: BankTransaction[] = [
  { id: "bt-1", amount: 450, merchant: "SWIGGY*ORDER", date: "Mar 30, 2026", bankName: "HDFC", matched: false },
  { id: "bt-2", amount: 2100, merchant: "ELECTRICITY BILL", date: "Mar 29, 2026", bankName: "HDFC", matched: false },
  { id: "bt-3", amount: 699, merchant: "NETFLIX.COM", date: "Mar 28, 2026", bankName: "HDFC", matched: false },
  { id: "bt-4", amount: 1299, merchant: "AMAZON.IN", date: "Mar 28, 2026", bankName: "SBI", matched: false },
  { id: "bt-5", amount: 220, merchant: "UBER TRIP", date: "Mar 27, 2026", bankName: "SBI", matched: false },
  { id: "bt-6", amount: 3500, merchant: "PHONE RECHARGE", date: "Mar 26, 2026", bankName: "SBI", matched: false },
  { id: "bt-7", amount: 850, merchant: "ZOMATO*GOLD", date: "Mar 26, 2026", bankName: "HDFC", matched: false },
  { id: "bt-8", amount: 15000, merchant: "RENT PAYMENT", date: "Mar 25, 2026", bankName: "HDFC", matched: false },
];

const MOCK_EXPENSE_MATCHES: Record<string, ExpenseMatch[]> = {
  "bt-1": [
    { id: "e-1", description: "Swiggy order", amount: 450, date: "Mar 30", category: "Food", confidence: 95 },
    { id: "e-2", description: "Food delivery", amount: 460, date: "Mar 30", category: "Food", confidence: 72 },
  ],
  "bt-2": [
    { id: "e-3", description: "Electricity bill", amount: 2100, date: "Mar 29", category: "Bills", confidence: 98 },
  ],
  "bt-5": [
    { id: "e-4", description: "Uber ride", amount: 220, date: "Mar 27", category: "Transport", confidence: 97 },
    { id: "e-5", description: "Cab to office", amount: 215, date: "Mar 27", category: "Transport", confidence: 68 },
  ],
};

// ---- Main Screen ----

export default function BankTransactionsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [transactions, setTransactions] = useState(MOCK_TRANSACTIONS);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["50%", "80%"], []);

  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardBg = isDark ? "bg-slate-800" : "bg-white";

  const unmatchedTransactions = transactions.filter((t) => !t.matched);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  function handleMatchPress(transaction: BankTransaction) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedTransaction(transaction);
    bottomSheetRef.current?.snapToIndex(0);
  }

  function handleMatchConfirm(transactionId: string, _expenseId: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTransactions((prev) =>
      prev.map((t) => (t.id === transactionId ? { ...t, matched: true } : t))
    );
    bottomSheetRef.current?.close();
    setSelectedTransaction(null);
  }

  function handleCreateExpense(transaction: BankTransaction) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    bottomSheetRef.current?.close();
    setSelectedTransaction(null);
    // Navigate to new expense form with pre-filled data
    router.push({
      pathname: "/expense/new",
      params: {
        amount: transaction.amount.toString(),
        description: transaction.merchant,
      },
    });
  }

  function handleDismiss() {
    bottomSheetRef.current?.close();
    setSelectedTransaction(null);
  }

  function renderTransactionItem({ item, index }: { item: BankTransaction; index: number }) {
    return (
      <Animated.View entering={FadeInDown.duration(300).delay(index * 50)}>
        <View
          className={`${cardBg} rounded-xl p-4 mb-2`}
          style={{
            shadowColor: isDark ? "#000" : "#64748B",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.15 : 0.04,
            shadowRadius: 3,
            elevation: 1,
          }}
        >
          <View className="flex-row items-center">
            <View className="flex-1">
              <Text className={`text-sm font-semibold ${textPrimary}`}>
                {item.merchant}
              </Text>
              <View className="flex-row items-center mt-1 gap-2">
                <Text className={`text-xs ${textSecondary}`}>{item.date}</Text>
                <View className={`w-1 h-1 rounded-full ${isDark ? "bg-slate-600" : "bg-slate-300"}`} />
                <Text className={`text-xs ${textSecondary}`}>{item.bankName}</Text>
              </View>
            </View>
            <Text className={`text-base font-bold ${textPrimary} mr-3`}>
              {"- \u20B9"}{item.amount.toLocaleString("en-IN")}
            </Text>
            <TouchableOpacity
              className="bg-primary-600 rounded-lg px-3.5 py-2"
              onPress={() => handleMatchPress(item)}
              activeOpacity={0.8}
            >
              <Text className="text-white text-xs font-semibold">Match</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  }

  const potentialMatches = selectedTransaction
    ? MOCK_EXPENSE_MATCHES[selectedTransaction.id] ?? []
    : [];

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`} edges={["top"]}>
      {/* Header */}
      <View
        className={`flex-row items-center justify-between px-5 py-3.5 border-b ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"}`}
      >
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text className="text-primary-600 text-base font-medium">{"<"} Back</Text>
        </TouchableOpacity>
        <Text className={`text-lg font-bold ${textPrimary}`}>
          Unmatched Transactions
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Summary */}
      <View className="px-5 py-3">
        <Text className={`text-sm ${textSecondary}`}>
          {unmatchedTransactions.length} transactions need matching
        </Text>
      </View>

      <FlatList
        data={unmatchedTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransactionItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4F46E5"
            colors={["#4F46E5"]}
          />
        }
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-4xl mb-3">{"🎉"}</Text>
            <Text className={`text-base font-semibold ${textPrimary} mb-1`}>
              All Matched!
            </Text>
            <Text className={`text-sm ${textSecondary} text-center`}>
              All bank transactions have been matched to expenses.
            </Text>
          </View>
        }
      />

      {/* Match Bottom Sheet */}
      <TransactionMatchSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        transaction={selectedTransaction as any}
        matches={potentialMatches}
        onMatchConfirm={handleMatchConfirm}
        onCreateExpense={handleCreateExpense as any}
        onDismiss={handleDismiss}
      />
    </SafeAreaView>
  );
}
