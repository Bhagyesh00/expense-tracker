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

import ApprovalActionSheet from "@/components/approval-action-sheet";

// ---- Types ----

type ApprovalStatus = "pending" | "approved" | "rejected";

export interface ApprovalRequest {
  id: string;
  submittedBy: string;
  submittedAt: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  status: ApprovalStatus;
  receiptUrl?: string;
  comment?: string;
}

// ---- Mock Data ----

const MOCK_APPROVALS: ApprovalRequest[] = [
  {
    id: "apr-1",
    submittedBy: "Priya Sharma",
    submittedAt: "Mar 30, 2026 10:30 AM",
    amount: 12500,
    category: "Travel",
    description: "Flight tickets to Mumbai",
    date: "Mar 28, 2026",
    status: "pending",
    receiptUrl: "receipt.jpg",
  },
  {
    id: "apr-2",
    submittedBy: "Rahul Verma",
    submittedAt: "Mar 30, 2026 09:15 AM",
    amount: 3200,
    category: "Food",
    description: "Client dinner at Taj",
    date: "Mar 29, 2026",
    status: "pending",
  },
  {
    id: "apr-3",
    submittedBy: "Amit Patel",
    submittedAt: "Mar 29, 2026 04:00 PM",
    amount: 45000,
    category: "Equipment",
    description: "MacBook charger + accessories",
    date: "Mar 28, 2026",
    status: "pending",
    receiptUrl: "receipt2.jpg",
  },
  {
    id: "apr-4",
    submittedBy: "Sneha Gupta",
    submittedAt: "Mar 29, 2026 02:30 PM",
    amount: 8900,
    category: "Software",
    description: "Annual Figma license",
    date: "Mar 27, 2026",
    status: "pending",
    receiptUrl: "receipt3.jpg",
  },
  {
    id: "apr-5",
    submittedBy: "Vikram Singh",
    submittedAt: "Mar 28, 2026 11:00 AM",
    amount: 1500,
    category: "Transport",
    description: "Uber rides - client visits",
    date: "Mar 27, 2026",
    status: "approved",
    comment: "Approved - within policy limits",
  },
  {
    id: "apr-6",
    submittedBy: "Meera Nair",
    submittedAt: "Mar 27, 2026 03:45 PM",
    amount: 75000,
    category: "Equipment",
    description: "Standing desk",
    date: "Mar 26, 2026",
    status: "rejected",
    comment: "Over budget - please use company procurement portal",
  },
];

// ---- Segmented Control ----

function SegmentedControl({
  options,
  selected,
  onSelect,
  isDark,
}: {
  options: { value: string; label: string; count?: number }[];
  selected: string;
  onSelect: (v: string) => void;
  isDark: boolean;
}) {
  return (
    <View
      className={`flex-row ${isDark ? "bg-slate-800" : "bg-slate-100"} rounded-xl p-1`}
    >
      {options.map((opt) => {
        const active = opt.value === selected;
        return (
          <TouchableOpacity
            key={opt.value}
            className={`flex-1 py-2.5 items-center rounded-lg ${active ? (isDark ? "bg-slate-700" : "bg-white") : ""}`}
            style={{
              shadowColor: active ? "#000" : "transparent",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: active ? 0.1 : 0,
              shadowRadius: 2,
              elevation: active ? 2 : 0,
            }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(opt.value);
            }}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-1">
              <Text
                className={`text-xs font-semibold ${
                  active
                    ? isDark ? "text-white" : "text-slate-900"
                    : isDark ? "text-slate-500" : "text-slate-400"
                }`}
              >
                {opt.label}
              </Text>
              {opt.count !== undefined && opt.count > 0 && (
                <View
                  className={`rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 ${
                    active ? "bg-primary-600" : isDark ? "bg-slate-600" : "bg-slate-300"
                  }`}
                >
                  <Text className="text-white text-[10px] font-bold">{opt.count}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ---- Main Screen ----

export default function ApprovalsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [approvals, setApprovals] = useState(MOCK_APPROVALS);
  const [activeTab, setActiveTab] = useState<ApprovalStatus>("pending");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["55%", "80%"], []);

  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardBg = isDark ? "bg-slate-800" : "bg-white";

  const filteredApprovals = approvals.filter((a) => a.status === activeTab);
  const pendingCount = approvals.filter((a) => a.status === "pending").length;
  const approvedCount = approvals.filter((a) => a.status === "approved").length;
  const rejectedCount = approvals.filter((a) => a.status === "rejected").length;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  function handleTapApproval(approval: ApprovalRequest) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedApproval(approval);
    bottomSheetRef.current?.snapToIndex(0);
  }

  function handleApprove(id: string, comment: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setApprovals((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "approved" as const, comment } : a
      )
    );
    bottomSheetRef.current?.close();
    setSelectedApproval(null);
  }

  function handleReject(id: string, comment: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setApprovals((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "rejected" as const, comment } : a
      )
    );
    bottomSheetRef.current?.close();
    setSelectedApproval(null);
  }

  function getStatusColor(status: ApprovalStatus): string {
    switch (status) {
      case "pending": return "#F59E0B";
      case "approved": return "#10B981";
      case "rejected": return "#EF4444";
    }
  }

  function renderApprovalItem({ item, index }: { item: ApprovalRequest; index: number }) {
    const statusColor = getStatusColor(item.status);

    return (
      <Animated.View entering={FadeInDown.duration(300).delay(index * 50)}>
        <TouchableOpacity
          className={`${cardBg} rounded-xl p-4 mb-2`}
          style={{
            shadowColor: isDark ? "#000" : "#64748B",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.15 : 0.04,
            shadowRadius: 3,
            elevation: 1,
          }}
          onPress={() => handleTapApproval(item)}
          activeOpacity={0.7}
        >
          <View className="flex-row items-start">
            <View className={`w-10 h-10 rounded-full ${isDark ? "bg-slate-700" : "bg-slate-100"} items-center justify-center mr-3`}>
              <Text className="text-base">{"👤"}</Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className={`text-sm font-semibold ${textPrimary}`}>
                  {item.submittedBy}
                </Text>
                <Text className={`text-base font-bold ${textPrimary}`}>
                  {"\u20B9"}{item.amount.toLocaleString("en-IN")}
                </Text>
              </View>
              <Text className={`text-xs ${textSecondary} mt-0.5`} numberOfLines={1}>
                {item.description}
              </Text>
              <View className="flex-row items-center mt-2 gap-2">
                <View
                  className="rounded-full px-2 py-0.5"
                  style={{ backgroundColor: statusColor + "20" }}
                >
                  <Text className="text-[10px] font-semibold" style={{ color: statusColor }}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Text>
                </View>
                <Text className={`text-[10px] ${textSecondary}`}>{item.category}</Text>
                <View className={`w-1 h-1 rounded-full ${isDark ? "bg-slate-600" : "bg-slate-300"}`} />
                <Text className={`text-[10px] ${textSecondary}`}>{item.date}</Text>
                {item.receiptUrl && (
                  <>
                    <View className={`w-1 h-1 rounded-full ${isDark ? "bg-slate-600" : "bg-slate-300"}`} />
                    <Text className={`text-[10px] ${textSecondary}`}>{"📎"} Receipt</Text>
                  </>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
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
        <Text className={`text-lg font-bold ${textPrimary}`}>Approvals</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Segmented Control */}
      <View className="px-5 py-3">
        <SegmentedControl
          options={[
            { value: "pending", label: "Pending", count: pendingCount },
            { value: "approved", label: "Approved", count: approvedCount },
            { value: "rejected", label: "Rejected", count: rejectedCount },
          ]}
          selected={activeTab}
          onSelect={(v) => setActiveTab(v as ApprovalStatus)}
          isDark={isDark}
        />
      </View>

      <FlatList
        data={filteredApprovals}
        keyExtractor={(item) => item.id}
        renderItem={renderApprovalItem}
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
            <Text className="text-4xl mb-3">
              {activeTab === "pending" ? "✅" : activeTab === "approved" ? "📋" : "📭"}
            </Text>
            <Text className={`text-base font-semibold ${textPrimary} mb-1`}>
              No {activeTab} approvals
            </Text>
            <Text className={`text-sm ${textSecondary}`}>
              {activeTab === "pending"
                ? "All caught up! No expenses waiting for review."
                : `No ${activeTab} expenses to show.`}
            </Text>
          </View>
        }
      />

      {/* Approval Action Bottom Sheet */}
      <ApprovalActionSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        approval={selectedApproval}
        onApprove={handleApprove}
        onReject={handleReject}
        onClose={() => {
          bottomSheetRef.current?.close();
          setSelectedApproval(null);
        }}
      />
    </SafeAreaView>
  );
}
