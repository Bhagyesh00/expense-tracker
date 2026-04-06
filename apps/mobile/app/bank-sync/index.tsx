import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Switch,
  Alert,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

// ---- Types ----

interface ConnectedAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  icon: string;
  provider: "plaid" | "salt_edge" | "manual";
  syncStatus: "synced" | "syncing" | "error" | "pending";
  lastSyncedAt: string | null;
  unmatchedCount: number;
}

// ---- Mock Data ----

const MOCK_ACCOUNTS: ConnectedAccount[] = [
  {
    id: "acc-1",
    bankName: "HDFC Bank",
    accountNumber: "XXXX-4521",
    icon: "🏦",
    provider: "plaid",
    syncStatus: "synced",
    lastSyncedAt: "2026-03-30T10:00:00Z",
    unmatchedCount: 5,
  },
  {
    id: "acc-2",
    bankName: "SBI",
    accountNumber: "XXXX-8832",
    icon: "🏛",
    provider: "manual",
    syncStatus: "error",
    lastSyncedAt: "2026-03-28T14:30:00Z",
    unmatchedCount: 12,
  },
];

function getSyncStatusColor(status: ConnectedAccount["syncStatus"]): string {
  switch (status) {
    case "synced": return "#10B981";
    case "syncing": return "#4F46E5";
    case "error": return "#EF4444";
    case "pending": return "#F59E0B";
    default: return "#94A3B8";
  }
}

function getSyncStatusLabel(status: ConnectedAccount["syncStatus"]): string {
  switch (status) {
    case "synced": return "Synced";
    case "syncing": return "Syncing...";
    case "error": return "Sync Error";
    case "pending": return "Pending";
    default: return "Unknown";
  }
}

// ---- Main Screen ----

export default function BankSyncScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [accounts] = useState(MOCK_ACCOUNTS);
  const [refreshing, setRefreshing] = useState(false);
  const [smsAutoImport, setSmsAutoImport] = useState(false);

  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardBg = isDark ? "bg-slate-800" : "bg-white";

  const totalUnmatched = accounts.reduce((sum, a) => sum + a.unmatchedCount, 0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  function handleImportStatement() {
    Alert.alert(
      "Import Statement",
      "Select a file format to import:",
      [
        { text: "CSV", onPress: () => {} },
        { text: "OFX", onPress: () => {} },
        { text: "QIF", onPress: () => {} },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }

  function handleSmsToggle(value: boolean) {
    if (value) {
      Alert.alert(
        "SMS Auto-Import",
        "ExpenseFlow will read transaction SMS from supported banks to auto-create expense entries. Grant SMS permission?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Allow",
            onPress: () => {
              setSmsAutoImport(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ]
      );
    } else {
      setSmsAutoImport(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`} edges={["top"]}>
      {/* Header */}
      <View
        className={`flex-row items-center justify-between px-5 py-3.5 border-b ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"}`}
      >
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text className="text-primary-600 text-base font-medium">{"<"} Back</Text>
        </TouchableOpacity>
        <Text className={`text-lg font-bold ${textPrimary}`}>Bank Sync</Text>
        <TouchableOpacity
          onPress={() => router.push("/bank-sync/connect")}
          activeOpacity={0.7}
        >
          <Text className="text-primary-600 text-sm font-semibold">+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-4 pb-8"
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
        {/* Connected Accounts */}
        <Animated.View entering={FadeInDown.duration(400).delay(50)}>
          <Text className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-3 px-1`}>
            Connected Accounts
          </Text>

          {accounts.length === 0 ? (
            <View className={`${cardBg} rounded-2xl p-8 items-center mb-6`}>
              <Text className="text-4xl mb-3">{"🏦"}</Text>
              <Text className={`text-base font-semibold ${textPrimary} mb-1`}>
                No Accounts Connected
              </Text>
              <Text className={`text-sm ${textSecondary} text-center`}>
                Connect a bank account to auto-import transactions.
              </Text>
              <TouchableOpacity
                className="bg-primary-600 rounded-xl px-6 py-3 mt-4"
                onPress={() => router.push("/bank-sync/connect")}
                activeOpacity={0.8}
              >
                <Text className="text-white text-sm font-semibold">Connect Bank</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-3 mb-6">
              {accounts.map((account) => {
                const statusColor = getSyncStatusColor(account.syncStatus);
                const statusLabel = getSyncStatusLabel(account.syncStatus);

                return (
                  <TouchableOpacity
                    key={account.id}
                    className={`${cardBg} rounded-2xl p-4`}
                    style={{
                      shadowColor: isDark ? "#000" : "#64748B",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: isDark ? 0.2 : 0.05,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                    onPress={() => router.push("/bank-sync/transactions")}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center">
                      <View className={`w-11 h-11 rounded-xl ${isDark ? "bg-slate-700" : "bg-slate-100"} items-center justify-center mr-3`}>
                        <Text className="text-xl">{account.icon}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className={`text-sm font-semibold ${textPrimary}`}>
                          {account.bankName}
                        </Text>
                        <Text className={`text-xs ${textSecondary} mt-0.5`}>
                          {account.accountNumber}
                        </Text>
                      </View>
                      <View className="items-end">
                        <View className="flex-row items-center mb-1">
                          <View
                            className="w-2 h-2 rounded-full mr-1.5"
                            style={{ backgroundColor: statusColor }}
                          />
                          <Text className="text-xs font-medium" style={{ color: statusColor }}>
                            {statusLabel}
                          </Text>
                        </View>
                        {account.unmatchedCount > 0 && (
                          <View className="bg-amber-100 dark:bg-amber-900/30 rounded-full px-2 py-0.5">
                            <Text className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                              {account.unmatchedCount} unmatched
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* Unmatched Transactions CTA */}
        {totalUnmatched > 0 && (
          <Animated.View entering={FadeInDown.duration(400).delay(150)}>
            <TouchableOpacity
              className={`${isDark ? "bg-amber-900/30 border-amber-800" : "bg-amber-50 border-amber-200"} border rounded-2xl p-4 mb-6`}
              onPress={() => router.push("/bank-sync/transactions")}
              activeOpacity={0.8}
            >
              <View className="flex-row items-center">
                <Text className="text-lg mr-3">{"⚠️"}</Text>
                <View className="flex-1">
                  <Text className={`text-sm font-semibold ${isDark ? "text-amber-200" : "text-amber-800"}`}>
                    {totalUnmatched} Unmatched Transactions
                  </Text>
                  <Text className={`text-xs ${isDark ? "text-amber-300/70" : "text-amber-700"} mt-0.5`}>
                    Tap to review and match with your expenses
                  </Text>
                </View>
                <Text className={`text-lg ${isDark ? "text-amber-500" : "text-amber-400"}`}>{">"}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Import Statement */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Text className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-3 px-1`}>
            Import
          </Text>
          <View
            className={`${cardBg} rounded-2xl px-4`}
            style={{
              shadowColor: isDark ? "#000" : "#64748B",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDark ? 0.2 : 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <TouchableOpacity
              className="flex-row items-center py-3.5"
              onPress={handleImportStatement}
              activeOpacity={0.7}
            >
              <View className={`w-10 h-10 rounded-xl ${isDark ? "bg-slate-700" : "bg-slate-100"} items-center justify-center mr-3`}>
                <Text className="text-lg">{"📄"}</Text>
              </View>
              <View className="flex-1">
                <Text className={`text-sm font-semibold ${textPrimary}`}>
                  Import Statement
                </Text>
                <Text className={`text-xs ${textSecondary} mt-0.5`}>
                  CSV, OFX, or QIF bank statements
                </Text>
              </View>
              <Text className={`text-lg ${isDark ? "text-slate-600" : "text-slate-300"}`}>{">"}</Text>
            </TouchableOpacity>

            <View className={`h-px ${isDark ? "bg-slate-700" : "bg-slate-100"}`} />

            {/* SMS Auto-Import */}
            <View className="flex-row items-center py-3.5">
              <View className={`w-10 h-10 rounded-xl ${isDark ? "bg-slate-700" : "bg-slate-100"} items-center justify-center mr-3`}>
                <Text className="text-lg">{"📱"}</Text>
              </View>
              <View className="flex-1 mr-3">
                <Text className={`text-sm font-semibold ${textPrimary}`}>
                  SMS Auto-Import
                </Text>
                <Text className={`text-xs ${textSecondary} mt-0.5`}>
                  Auto-detect transactions from bank SMS
                </Text>
              </View>
              <Switch
                value={smsAutoImport}
                onValueChange={handleSmsToggle}
                trackColor={{ false: "#CBD5E1", true: "#A5B4FC" }}
                thumbColor={smsAutoImport ? "#4F46E5" : "#F1F5F9"}
              />
            </View>
          </View>

          {smsAutoImport && (
            <TouchableOpacity
              className={`${cardBg} rounded-2xl p-4 mt-3`}
              onPress={() => {}}
              activeOpacity={0.7}
              style={{
                shadowColor: isDark ? "#000" : "#64748B",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isDark ? 0.2 : 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text className={`text-sm font-semibold ${textPrimary} mb-2`}>
                SMS Parser Settings
              </Text>
              <Text className={`text-xs ${textSecondary}`}>
                Configure supported banks and auto-creation rules
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
