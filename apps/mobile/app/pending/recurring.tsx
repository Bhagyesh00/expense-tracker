import { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Switch,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeInRight,
  Layout,
} from "react-native-reanimated";
import { Swipeable } from "react-native-gesture-handler";

import RecurringPaymentForm, {
  type RecurringPaymentFormRef,
  type RecurringPayment,
} from "@/components/recurring-payment-form";
import type { Contact } from "@/components/contact-selector";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_CONTACTS: Contact[] = [
  { id: "c1", name: "Rahul Sharma", phone: "+91 9876543210", email: "rahul@email.com", upiId: "rahul@okaxis" },
  { id: "c2", name: "Priya Patel", phone: "+91 9876543211", email: "priya@email.com", upiId: null },
  { id: "c3", name: "Amit Kumar", phone: "+91 9876543212", email: null, upiId: "amit@ybl" },
];

const MOCK_RECURRING: RecurringPayment[] = [
  {
    id: "r1",
    contactId: "c1",
    contactName: "Rahul Sharma",
    direction: "give",
    amount: 5000,
    currency: "INR",
    interval: "monthly",
    startDate: "2026-01-01",
    endDate: null,
    autoGenerate: true,
    isActive: true,
    nextDueDate: "2026-04-01",
  },
  {
    id: "r2",
    contactId: "c2",
    contactName: "Priya Patel",
    direction: "receive",
    amount: 2500,
    currency: "INR",
    interval: "weekly",
    startDate: "2026-02-01",
    endDate: "2026-12-31",
    autoGenerate: true,
    isActive: true,
    nextDueDate: "2026-04-03",
  },
  {
    id: "r3",
    contactId: "c3",
    contactName: "Amit Kumar",
    direction: "receive",
    amount: 15000,
    currency: "INR",
    interval: "quarterly",
    startDate: "2026-01-01",
    endDate: null,
    autoGenerate: false,
    isActive: false,
    nextDueDate: "2026-07-01",
  },
];

// ---------------------------------------------------------------------------
// Interval label
// ---------------------------------------------------------------------------

const INTERVAL_LABELS: Record<string, string> = {
  weekly: "Every Week",
  monthly: "Every Month",
  quarterly: "Every Quarter",
  yearly: "Every Year",
};

// ---------------------------------------------------------------------------
// Recurring card
// ---------------------------------------------------------------------------

function RecurringCard({
  item,
  index,
  onToggleActive,
  onDelete,
  onTap,
  isDark,
}: {
  item: RecurringPayment;
  index: number;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  onTap: (item: RecurringPayment) => void;
  isDark: boolean;
}) {
  const swipeRef = useRef<Swipeable>(null);
  const isGive = item.direction === "give";

  const cardBg = isDark ? "bg-slate-800" : "bg-white";
  const borderColor = isDark ? "border-slate-700" : "border-slate-100";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";

  const renderRightActions = () => (
    <TouchableOpacity
      onPress={() => {
        swipeRef.current?.close();
        Alert.alert(
          "Delete Recurring",
          `Stop and delete recurring payment with ${item.contactName}?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onDelete(item.id);
              },
            },
          ],
        );
      }}
      className="bg-red-500 justify-center items-center px-6 rounded-2xl my-1 ml-2"
      activeOpacity={0.8}
    >
      <Text className="text-white text-xs font-bold">Delete</Text>
    </TouchableOpacity>
  );

  return (
    <Animated.View
      entering={FadeInRight.duration(350).delay(index * 60)}
      layout={Layout.springify()}
      className="mb-2"
    >
      <Swipeable
        ref={swipeRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onTap(item);
          }}
          activeOpacity={0.7}
          className={`rounded-2xl p-4 border ${cardBg} ${borderColor} ${
            !item.isActive ? "opacity-60" : ""
          }`}
          style={{
            shadowColor: isDark ? "#000" : "#64748B",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.1 : 0.04,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <View className="flex-row items-start justify-between mb-3">
            {/* Avatar + name */}
            <View className="flex-row items-center flex-1">
              <View
                className={`w-11 h-11 rounded-full items-center justify-center mr-3 ${
                  isGive ? "bg-red-100 dark:bg-red-900/30" : "bg-green-100 dark:bg-green-900/30"
                }`}
              >
                <Text
                  className={`text-sm font-bold ${
                    isGive
                      ? "text-red-700 dark:text-red-400"
                      : "text-green-700 dark:text-green-400"
                  }`}
                >
                  {item.contactName
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text
                    className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
                    numberOfLines={1}
                  >
                    {item.contactName}
                  </Text>
                  {/* Direction badge */}
                  <View
                    className={`px-1.5 py-0.5 rounded ${
                      isGive
                        ? "bg-red-100 dark:bg-red-900/30"
                        : "bg-green-100 dark:bg-green-900/30"
                    }`}
                  >
                    <Text
                      className={`text-[9px] font-bold ${
                        isGive
                          ? "text-red-600 dark:text-red-400"
                          : "text-green-600 dark:text-green-400"
                      }`}
                    >
                      {isGive ? "GIVE" : "RECEIVE"}
                    </Text>
                  </View>
                </View>
                <Text className={`text-xs ${textSecondary} mt-0.5`}>
                  {INTERVAL_LABELS[item.interval]}
                </Text>
              </View>
            </View>

            {/* Amount */}
            <View className="items-end">
              <Text
                className={`text-base font-bold ${
                  isGive ? "text-red-600" : "text-green-600"
                }`}
              >
                {isGive ? "-" : "+"}₹{item.amount.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>

          {/* Footer: next due + status toggle */}
          <View className="flex-row items-center justify-between">
            <View>
              <Text className={`text-xs ${textSecondary}`}>
                Next: {new Date(item.nextDueDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
              {item.endDate && (
                <Text className={`text-[10px] ${textSecondary} mt-0.5`}>
                  Until {new Date(item.endDate).toLocaleDateString("en-IN", {
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              )}
            </View>

            <View className="flex-row items-center gap-2">
              {item.autoGenerate && (
                <View className="bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] font-semibold text-primary-600">
                    Auto
                  </Text>
                </View>
              )}
              <View className="flex-row items-center gap-1.5">
                <Text className={`text-[10px] font-medium ${textSecondary}`}>
                  {item.isActive ? "Active" : "Paused"}
                </Text>
                <Switch
                  value={item.isActive}
                  onValueChange={(v) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onToggleActive(item.id, v);
                  }}
                  trackColor={{
                    false: isDark ? "#475569" : "#CBD5E1",
                    true: "#A5B4FC",
                  }}
                  thumbColor={item.isActive ? "#4F46E5" : isDark ? "#64748B" : "#F1F5F9"}
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function RecurringPaymentsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [payments, setPayments] = useState<RecurringPayment[]>(MOCK_RECURRING);
  const [refreshing, setRefreshing] = useState(false);
  const formRef = useRef<RecurringPaymentFormRef>(null);

  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const borderColor = isDark ? "border-slate-800" : "border-slate-100";

  const activeCount = useMemo(
    () => payments.filter((p) => p.isActive).length,
    [payments],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  }, []);

  const handleToggleActive = useCallback((id: string, active: boolean) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: active } : p)),
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleTap = useCallback(
    (item: RecurringPayment) => {
      formRef.current?.open(item);
    },
    [],
  );

  const handleSave = useCallback(
    async (data: Omit<RecurringPayment, "id" | "isActive" | "nextDueDate">) => {
      // TODO: Call API
      await new Promise((r) => setTimeout(r, 400));

      // Calculate next due date (mock)
      const nextDue = new Date();
      nextDue.setMonth(nextDue.getMonth() + 1);

      const newPayment: RecurringPayment = {
        id: String(Date.now()),
        ...data,
        isActive: true,
        nextDueDate: nextDue.toISOString().split("T")[0],
      };
      setPayments((prev) => [newPayment, ...prev]);
    },
    [],
  );

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        className={`flex-row items-center justify-between px-5 py-3 border-b ${borderColor} ${
          isDark ? "bg-slate-900" : "bg-white"
        }`}
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
        <Text className={`text-lg font-bold ${textPrimary}`}>
          Recurring Payments
        </Text>
        <View className="w-9" />
      </Animated.View>

      {/* Summary bar */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(100)}
        className="px-5 py-3"
      >
        <Text className={`text-sm ${textSecondary}`}>
          {payments.length} recurring setup •{" "}
          <Text className="font-semibold text-green-600">{activeCount} active</Text>
        </Text>
      </Animated.View>

      {/* List */}
      <FlatList
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: 100,
          flexGrow: 1,
        }}
        data={payments}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <RecurringCard
            item={item}
            index={index}
            onToggleActive={handleToggleActive}
            onDelete={handleDelete}
            onTap={handleTap}
            isDark={isDark}
          />
        )}
        ListEmptyComponent={
          <Animated.View
            entering={FadeInDown.duration(500).delay(200)}
            className="flex-1 items-center justify-center py-24"
          >
            <Text className="text-5xl mb-4">🔄</Text>
            <Text className={`text-lg font-bold ${textPrimary} mb-1 text-center`}>
              No Recurring Payments
            </Text>
            <Text className={`text-sm ${textSecondary} text-center px-8`}>
              Set up recurring payments to auto-generate pending entries on a
              schedule.
            </Text>
          </Animated.View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4F46E5"
            colors={["#4F46E5"]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <Animated.View
        entering={FadeInUp.duration(500).delay(400)}
        className="absolute bottom-8 right-5"
        style={{
          shadowColor: "#4F46E5",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 10,
          elevation: 10,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            formRef.current?.open();
          }}
          activeOpacity={0.85}
          className="flex-row items-center gap-2 bg-primary-600 rounded-full px-5 py-4"
        >
          <Text className="text-white text-lg font-light leading-none">+</Text>
          <Text className="text-white text-sm font-bold">Add Recurring</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Form Sheet */}
      <RecurringPaymentForm
        ref={formRef}
        contacts={MOCK_CONTACTS}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}
