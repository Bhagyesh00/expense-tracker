import { useState, useCallback, useMemo, useRef } from "react";
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
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeIn,
  Layout,
} from "react-native-reanimated";
import { Swipeable } from "react-native-gesture-handler";

// ---- Types ----

type Direction = "give" | "receive" | "all";
type PaymentStatus = "pending" | "partial" | "overdue" | "all";
type SectionKey = "overdue" | "due_soon" | "upcoming" | "no_date";

interface PendingPayment {
  id: string;
  contactName: string;
  contactInitials: string;
  amount: number;
  paidAmount: number;
  direction: "give" | "receive";
  status: "pending" | "partial" | "overdue";
  description: string;
  dueDate: string | null;
  createdAt: string;
}

interface Section {
  key: SectionKey;
  title: string;
  data: PendingPayment[];
}

// ---- Mock Data ----

const MOCK_PAYMENTS: PendingPayment[] = [
  {
    id: "1",
    contactName: "Rahul Sharma",
    contactInitials: "RS",
    amount: 5000,
    paidAmount: 0,
    direction: "give",
    status: "pending",
    description: "Dinner split",
    dueDate: "2026-04-01",
    createdAt: "2026-03-20",
  },
  {
    id: "2",
    contactName: "Priya Patel",
    contactInitials: "PP",
    amount: 12000,
    paidAmount: 4000,
    direction: "receive",
    status: "partial",
    description: "Trip expenses",
    dueDate: "2026-03-30",
    createdAt: "2026-03-15",
  },
  {
    id: "3",
    contactName: "Amit Kumar",
    contactInitials: "AK",
    amount: 2500,
    paidAmount: 0,
    direction: "give",
    status: "overdue",
    description: "Movie tickets",
    dueDate: "2026-03-20",
    createdAt: "2026-03-10",
  },
  {
    id: "4",
    contactName: "Sneha Verma",
    contactInitials: "SV",
    amount: 8000,
    paidAmount: 0,
    direction: "receive",
    status: "pending",
    description: "Shared groceries",
    dueDate: "2026-04-05",
    createdAt: "2026-03-22",
  },
  {
    id: "5",
    contactName: "Vikram Singh",
    contactInitials: "VS",
    amount: 3500,
    paidAmount: 1500,
    direction: "receive",
    status: "partial",
    description: "Cab fare split",
    dueDate: "2026-03-28",
    createdAt: "2026-03-18",
  },
  {
    id: "6",
    contactName: "Neha Gupta",
    contactInitials: "NG",
    amount: 1200,
    paidAmount: 0,
    direction: "give",
    status: "pending",
    description: "Coffee meetup",
    dueDate: null,
    createdAt: "2026-03-25",
  },
  {
    id: "7",
    contactName: "Rohan Mehta",
    contactInitials: "RM",
    amount: 6000,
    paidAmount: 2000,
    direction: "receive",
    status: "partial",
    description: "Shared rent deposit",
    dueDate: "2026-03-22",
    createdAt: "2026-03-05",
  },
];

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-amber-100", text: "text-amber-700" },
  partial: { bg: "bg-blue-100", text: "text-blue-700" },
  overdue: { bg: "bg-red-100", text: "text-red-700" },
};

// ---- Helpers ----

function getDaysOverdue(dueDate: string | null): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const now = new Date();
  const diff = Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function getDaysUntilDue(dueDate: string | null): number {
  if (!dueDate) return Infinity;
  const due = new Date(dueDate);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function classifyPayment(p: PendingPayment): SectionKey {
  if (!p.dueDate) return "no_date";
  const days = getDaysUntilDue(p.dueDate);
  if (days < 0) return "overdue";
  if (days <= 3) return "due_soon";
  return "upcoming";
}

const SECTION_TITLES: Record<SectionKey, string> = {
  overdue: "Overdue",
  due_soon: "Due Soon",
  upcoming: "Upcoming",
  no_date: "No Due Date",
};

const SECTION_ORDER: SectionKey[] = ["overdue", "due_soon", "upcoming", "no_date"];

// ---- Components ----

function SwipeAction({
  label,
  bgColor,
  onPress,
}: {
  label: string;
  bgColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className={`${bgColor} justify-center items-center px-5 rounded-2xl my-1`}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text className="text-white text-xs font-semibold">{label}</Text>
    </TouchableOpacity>
  );
}

export default function PendingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [direction, setDirection] = useState<Direction>("all");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus>("all");
  const [refreshing, setRefreshing] = useState(false);
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});

  const filteredPayments = useMemo(() => {
    let result = MOCK_PAYMENTS;
    if (direction !== "all") {
      result = result.filter((p) => p.direction === direction);
    }
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }
    return result;
  }, [direction, statusFilter]);

  const sections = useMemo<Section[]>(() => {
    const groups: Record<SectionKey, PendingPayment[]> = {
      overdue: [],
      due_soon: [],
      upcoming: [],
      no_date: [],
    };
    filteredPayments.forEach((p) => {
      const key = classifyPayment(p);
      groups[key].push(p);
    });
    return SECTION_ORDER.filter((k) => groups[k].length > 0).map((k) => ({
      key: k,
      title: SECTION_TITLES[k],
      data: groups[k],
    }));
  }, [filteredPayments]);

  const flatData = useMemo(() => {
    const items: Array<
      { type: "header"; title: string; key: string } | { type: "item"; payment: PendingPayment }
    > = [];
    sections.forEach((s) => {
      items.push({ type: "header", title: s.title, key: s.key });
      s.data.forEach((p) => items.push({ type: "item", payment: p }));
    });
    return items;
  }, [sections]);

  const netBalance = useMemo(() => {
    const totalOwe = MOCK_PAYMENTS.filter((p) => p.direction === "give").reduce(
      (sum, p) => sum + (p.amount - p.paidAmount),
      0
    );
    const totalOwed = MOCK_PAYMENTS.filter((p) => p.direction === "receive").reduce(
      (sum, p) => sum + (p.amount - p.paidAmount),
      0
    );
    return { totalOwe, totalOwed, net: totalOwed - totalOwe };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  function closeAllSwipeables(exceptId?: string) {
    Object.entries(swipeableRefs.current).forEach(([id, ref]) => {
      if (id !== exceptId) ref?.close();
    });
  }

  function renderRightActions(item: PendingPayment) {
    return (
      <View className="flex-row gap-1 ml-2">
        <SwipeAction
          label="Record"
          bgColor="bg-green-500"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            swipeableRefs.current[item.id]?.close();
            router.push(`/pending/${item.id}`);
          }}
        />
        {item.direction === "receive" && (
          <SwipeAction
            label="Remind"
            bgColor="bg-blue-500"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              swipeableRefs.current[item.id]?.close();
              router.push(`/pending/${item.id}`);
            }}
          />
        )}
      </View>
    );
  }

  function renderPaymentCard(item: PendingPayment) {
    const remaining = item.amount - item.paidAmount;
    const isGive = item.direction === "give";
    const colors = statusColors[item.status] ?? statusColors.pending;
    const isOverdue = item.dueDate && getDaysOverdue(item.dueDate) > 0;
    const overdueDays = item.dueDate ? getDaysOverdue(item.dueDate) : 0;
    const progressPct = item.paidAmount > 0 ? (item.paidAmount / item.amount) * 100 : 0;

    return (
      <Swipeable
        ref={(ref) => {
          swipeableRefs.current[item.id] = ref;
        }}
        renderRightActions={() => renderRightActions(item)}
        onSwipeableOpen={() => closeAllSwipeables(item.id)}
        overshootRight={false}
        friction={2}
      >
        <TouchableOpacity
          className={`bg-white rounded-2xl p-4 mb-2 border ${
            isOverdue ? "border-red-200 bg-red-50/50" : "border-slate-100"
          }`}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/pending/${item.id}`);
          }}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center flex-1">
              {/* Avatar */}
              <View
                className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                  isGive ? "bg-red-100" : "bg-green-100"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isGive ? "text-red-700" : "text-green-700"
                  }`}
                >
                  {item.contactInitials}
                </Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text
                    className="text-sm font-semibold text-slate-900"
                    numberOfLines={1}
                  >
                    {item.contactName}
                  </Text>
                  {/* Direction badge */}
                  <View
                    className={`px-1.5 py-0.5 rounded ${
                      isGive ? "bg-red-100" : "bg-green-100"
                    }`}
                  >
                    <Text
                      className={`text-[9px] font-bold ${
                        isGive ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {isGive ? "GIVE" : "GET"}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-slate-400" numberOfLines={1}>
                  {item.description}
                </Text>
              </View>
            </View>
            <View className="items-end">
              <Text
                className={`text-sm font-bold ${
                  isGive ? "text-red-600" : "text-green-600"
                }`}
              >
                {isGive ? "-" : "+"}{"\u20B9"}{remaining.toLocaleString("en-IN")}
              </Text>
              {item.paidAmount > 0 && (
                <Text className="text-[10px] text-slate-400">
                  of {"\u20B9"}{item.amount.toLocaleString("en-IN")}
                </Text>
              )}
            </View>
          </View>

          {/* Progress bar */}
          {item.paidAmount > 0 && (
            <View className="mb-2">
              <View className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <View
                  className={`h-full rounded-full ${
                    isGive ? "bg-red-400" : "bg-green-400"
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </View>
              <Text className="text-[10px] text-slate-400 mt-0.5">
                {progressPct.toFixed(0)}% paid
              </Text>
            </View>
          )}

          <View className="flex-row items-center justify-between">
            <View className={`px-2.5 py-1 rounded-full ${colors.bg}`}>
              <Text
                className={`text-[10px] font-semibold uppercase ${colors.text}`}
              >
                {item.status}
              </Text>
            </View>
            <View className="flex-row items-center">
              {isOverdue && overdueDays > 0 && (
                <Text className="text-[10px] font-medium text-red-500 mr-2">
                  Overdue by {overdueDays}d
                </Text>
              )}
              {item.dueDate && !isOverdue && (
                <Text className="text-xs text-slate-400">
                  Due: {item.dueDate}
                </Text>
              )}
              {!item.dueDate && (
                <Text className="text-xs text-slate-300">No due date</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  }

  const directions: { key: Direction; label: string }[] = [
    { key: "all", label: "All" },
    { key: "give", label: "Give" },
    { key: "receive", label: "Receive" },
  ];

  const statusFilters: { key: PaymentStatus; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "partial", label: "Partial" },
    { key: "overdue", label: "Overdue" },
  ];

  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const headerBg = isDark ? "bg-slate-800" : "bg-white";

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`} edges={["top"]}>
      {/* Header */}
      <View className={`${headerBg} px-5 pt-4 pb-3 border-b border-slate-100`}>
        <Text className="text-2xl font-bold text-slate-900 mb-3">
          Pending Payments
        </Text>

        {/* Summary Cards */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          className="flex-row gap-3 mb-3"
        >
          <View className="flex-1 bg-red-50 rounded-xl p-3 border border-red-100">
            <Text className="text-[10px] font-semibold text-red-500 uppercase tracking-wider">
              You Owe
            </Text>
            <Text className="text-lg font-bold text-red-700">
              {"\u20B9"}{netBalance.totalOwe.toLocaleString("en-IN")}
            </Text>
          </View>

          {/* Net indicator */}
          <View className="justify-center items-center" style={{ width: 40 }}>
            <View
              className={`w-8 h-8 rounded-full items-center justify-center ${
                netBalance.net >= 0 ? "bg-green-100" : "bg-red-100"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  netBalance.net >= 0 ? "text-green-700" : "text-red-700"
                }`}
              >
                {netBalance.net >= 0 ? "+" : "-"}
              </Text>
            </View>
            <Text className="text-[8px] font-bold text-slate-400 mt-0.5">
              NET
            </Text>
          </View>

          <View className="flex-1 bg-green-50 rounded-xl p-3 border border-green-100">
            <Text className="text-[10px] font-semibold text-green-500 uppercase tracking-wider">
              Owed to You
            </Text>
            <Text className="text-lg font-bold text-green-700">
              {"\u20B9"}{netBalance.totalOwed.toLocaleString("en-IN")}
            </Text>
          </View>
        </Animated.View>

        {/* Direction Segmented Control */}
        <View className="flex-row bg-slate-100 rounded-xl p-1 mb-3">
          {directions.map((d) => (
            <TouchableOpacity
              key={d.key}
              className={`flex-1 py-2 rounded-lg items-center ${
                direction === d.key ? "bg-white shadow-sm" : ""
              }`}
              onPress={() => {
                setDirection(d.key);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.7}
            >
              <Text
                className={`text-sm font-semibold ${
                  direction === d.key ? "text-primary-600" : "text-slate-500"
                }`}
              >
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Status Filter Chips */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={statusFilters}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              className={`px-3.5 py-1.5 rounded-full border ${
                statusFilter === item.key
                  ? "bg-primary-600 border-primary-600"
                  : "bg-white border-slate-200"
              }`}
              onPress={() => {
                setStatusFilter(item.key);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.7}
            >
              <Text
                className={`text-xs font-semibold ${
                  statusFilter === item.key ? "text-white" : "text-slate-600"
                }`}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Payment List with Section Headers */}
      <FlatList
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100 }}
        data={flatData}
        keyExtractor={(item, index) =>
          item.type === "header" ? `header-${item.key}` : `item-${item.payment.id}`
        }
        renderItem={({ item, index }) => {
          if (item.type === "header") {
            return (
              <Animated.View entering={FadeIn.duration(300).delay(index * 30)}>
                <View className="flex-row items-center mt-3 mb-2">
                  <View
                    className={`w-2 h-2 rounded-full mr-2 ${
                      item.key === "overdue"
                        ? "bg-red-500"
                        : item.key === "due_soon"
                          ? "bg-amber-500"
                          : item.key === "upcoming"
                            ? "bg-blue-500"
                            : "bg-slate-400"
                    }`}
                  />
                  <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {item.title}
                  </Text>
                  <View className="flex-1 h-px bg-slate-200 ml-2" />
                </View>
              </Animated.View>
            );
          }
          return (
            <Animated.View
              entering={FadeInRight.duration(300).delay(index * 40)}
              layout={Layout.springify()}
            >
              {renderPaymentCard(item.payment)}
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          <View className="items-center py-20">
            <View className="w-20 h-20 rounded-full bg-green-50 items-center justify-center mb-4">
              <Text className="text-4xl">V</Text>
            </View>
            <Text className="text-lg font-semibold text-slate-900">
              All settled!
            </Text>
            <Text className="text-sm text-slate-500 mt-1 text-center px-8">
              {statusFilter !== "all" || direction !== "all"
                ? "No payments match the current filters."
                : "No pending payments. Tap + to record one."}
            </Text>
          </View>
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
      <TouchableOpacity
        className="absolute bottom-6 right-5 w-14 h-14 rounded-full bg-primary-600 items-center justify-center"
        style={{
          shadowColor: "#4F46E5",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/pending/new");
        }}
        activeOpacity={0.8}
      >
        <Text className="text-white text-2xl font-light leading-none">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
