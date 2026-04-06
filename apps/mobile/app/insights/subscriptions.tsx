import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeIn,
  SlideOutLeft,
  Layout,
} from "react-native-reanimated";

import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/stores/app-store";

// ---- Types ----

type Period = "monthly" | "weekly" | "yearly" | "quarterly";

interface Subscription {
  id: string;
  merchant: string;
  amount: number;
  period: Period;
  lastCharged: string;
  category: string;
  categoryIcon: string;
  confidence: number; // 0-1
  added?: boolean;
}

// ---- Mock Detected Subscriptions ----

const MOCK_SUBSCRIPTIONS: Subscription[] = [
  {
    id: "s1",
    merchant: "Netflix",
    amount: 649,
    period: "monthly",
    lastCharged: "Mar 15, 2026",
    category: "Entertainment",
    categoryIcon: "🎬",
    confidence: 0.98,
  },
  {
    id: "s2",
    merchant: "Spotify",
    amount: 119,
    period: "monthly",
    lastCharged: "Mar 20, 2026",
    category: "Entertainment",
    categoryIcon: "🎵",
    confidence: 0.96,
  },
  {
    id: "s3",
    merchant: "Jio Prepaid",
    amount: 999,
    period: "monthly",
    lastCharged: "Mar 01, 2026",
    category: "Bills",
    categoryIcon: "📱",
    confidence: 0.94,
  },
  {
    id: "s4",
    merchant: "Amazon Prime",
    amount: 1499,
    period: "yearly",
    lastCharged: "Jan 10, 2026",
    category: "Shopping",
    categoryIcon: "📦",
    confidence: 0.91,
  },
  {
    id: "s5",
    merchant: "Zerodha Coin",
    amount: 50,
    period: "monthly",
    lastCharged: "Mar 22, 2026",
    category: "Investment",
    categoryIcon: "📈",
    confidence: 0.87,
  },
  {
    id: "s6",
    merchant: "Google One",
    amount: 130,
    period: "monthly",
    lastCharged: "Mar 18, 2026",
    category: "Technology",
    categoryIcon: "☁️",
    confidence: 0.89,
  },
  {
    id: "s7",
    merchant: "Swiggy One",
    amount: 299,
    period: "monthly",
    lastCharged: "Mar 12, 2026",
    category: "Food",
    categoryIcon: "🍕",
    confidence: 0.82,
  },
];

// ---- Helpers ----

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function getMonthlyEquivalent(amount: number, period: Period): number {
  switch (period) {
    case "weekly":
      return Math.round(amount * 4.33);
    case "monthly":
      return amount;
    case "quarterly":
      return Math.round(amount / 3);
    case "yearly":
      return Math.round(amount / 12);
    default:
      return amount;
  }
}

function getPeriodLabel(period: Period): string {
  const map: Record<Period, string> = {
    weekly: "Weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
  };
  return map[period];
}

function getConfidenceBadge(confidence: number): { label: string; color: string; bg: string } {
  if (confidence >= 0.9) return { label: "High", color: "#059669", bg: "#DCFCE7" };
  if (confidence >= 0.8) return { label: "Medium", color: "#D97706", bg: "#FEF3C7" };
  return { label: "Low", color: "#DC2626", bg: "#FEE2E2" };
}

// ---- Subscription Card ----

function SubscriptionCard({
  item,
  isDark,
  isPrivateMode,
  onAdd,
  onDismiss,
  index,
}: {
  item: Subscription;
  isDark: boolean;
  isPrivateMode: boolean;
  onAdd: (id: string) => void;
  onDismiss: (id: string) => void;
  index: number;
}) {
  const badge = getConfidenceBadge(item.confidence);
  const monthlyEq = getMonthlyEquivalent(item.amount, item.period);

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(index * 60)}
      exiting={SlideOutLeft.duration(300)}
      layout={Layout.springify()}
      style={{
        backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        shadowColor: isDark ? "#000" : "#64748B",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.2 : 0.07,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      {/* Top Row */}
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: isDark ? "#334155" : "#F1F5F9",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Text style={{ fontSize: 22 }}>{item.categoryIcon}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: isDark ? "#F8FAFC" : "#0F172A",
              }}
            >
              {item.merchant}
            </Text>
            <View
              style={{
                backgroundColor: isDark ? badge.bg + "40" : badge.bg,
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: "700", color: badge.color }}>
                {badge.label} Confidence
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: isDark ? "#64748B" : "#94A3B8" }}>
            {item.category} · Last charged {item.lastCharged}
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "800",
              color: isDark ? "#F8FAFC" : "#0F172A",
            }}
          >
            {isPrivateMode ? "•••" : formatCurrency(item.amount)}
          </Text>
          <View
            style={{
              backgroundColor: isDark ? "#312E81" : "#EEF2FF",
              borderRadius: 6,
              paddingHorizontal: 6,
              paddingVertical: 2,
              marginTop: 3,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "600", color: "#4F46E5" }}>
              {getPeriodLabel(item.period)}
            </Text>
          </View>
        </View>
      </View>

      {/* Monthly equivalent if not monthly */}
      {item.period !== "monthly" && (
        <View
          style={{
            backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginTop: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Text style={{ fontSize: 12 }}>📅</Text>
          <Text style={{ fontSize: 12, color: isDark ? "#94A3B8" : "#64748B" }}>
            Monthly equivalent:{" "}
            <Text style={{ fontWeight: "700", color: isDark ? "#F8FAFC" : "#0F172A" }}>
              {isPrivateMode ? "•••" : formatCurrency(monthlyEq)}/mo
            </Text>
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        {!item.added ? (
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "#4F46E5",
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 4,
            }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onAdd(item.id);
            }}
            activeOpacity={0.8}
          >
            <Text style={{ color: "#fff", fontSize: 12 }}>+</Text>
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
              Add to Recurring
            </Text>
          </TouchableOpacity>
        ) : (
          <View
            style={{
              flex: 1,
              backgroundColor: isDark ? "#14532D" : "#DCFCE7",
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <Text style={{ color: "#10B981", fontSize: 14 }}>✓</Text>
            <Text style={{ color: "#10B981", fontSize: 12, fontWeight: "600" }}>Added</Text>
          </View>
        )}

        <TouchableOpacity
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: isDark ? "#334155" : "#E2E8F0",
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onDismiss(item.id);
          }}
          activeOpacity={0.7}
        >
          <Text style={{ color: isDark ? "#64748B" : "#94A3B8", fontSize: 12, fontWeight: "600" }}>
            Dismiss
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ---- Main Screen ----

export default function SubscriptionsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const { isPrivateMode } = useAppStore() as any;

  const [subscriptions, setSubscriptions] = useState<Subscription[]>(MOCK_SUBSCRIPTIONS);
  const [refreshing, setRefreshing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const bgColor = isDark ? "#0F172A" : "#F8FAFC";

  const totalMonthly = subscriptions.reduce((sum, s) => {
    return sum + getMonthlyEquivalent(s.amount, s.period);
  }, 0);

  const addedCount = subscriptions.filter((s) => s.added).length;

  // ---- Re-analyze ----

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setAnalyzing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // In production: call AI analysis on recent expenses
      await new Promise((r) => setTimeout(r, 1500));
      // Reset to fresh data (simulate re-detection)
      setSubscriptions(MOCK_SUBSCRIPTIONS.map((s) => ({ ...s, added: false })));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setRefreshing(false);
      setAnalyzing(false);
    }
  }, []);

  // ---- Actions ----

  function handleAdd(id: string) {
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, added: true } : s))
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "Added to Recurring",
      "This subscription has been added to your recurring expenses.",
      [{ text: "OK" }]
    );
  }

  function handleDismiss(id: string) {
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }} edges={["top"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "#1E293B" : "#F1F5F9",
        }}
      >
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={{ color: "#4F46E5", fontSize: 16, fontWeight: "500" }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "700", color: isDark ? "#F8FAFC" : "#0F172A" }}>
          Subscriptions
        </Text>
        <TouchableOpacity
          onPress={onRefresh}
          activeOpacity={0.7}
          disabled={analyzing}
        >
          {analyzing ? (
            <ActivityIndicator size="small" color="#4F46E5" />
          ) : (
            <Text style={{ fontSize: 18 }}>🔄</Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={subscriptions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4F46E5"
            colors={["#4F46E5"]}
          />
        }
        ListHeaderComponent={
          <>
            {/* Total Monthly Cost Card */}
            <Animated.View entering={FadeInDown.duration(400).delay(50)}>
              <View
                style={{
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  borderRadius: 20,
                  padding: 20,
                  marginBottom: 20,
                  shadowColor: isDark ? "#000" : "#64748B",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0.25 : 0.1,
                  shadowRadius: 16,
                  elevation: 6,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ fontSize: 20, marginRight: 8 }}>🔄</Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: isDark ? "#94A3B8" : "#64748B",
                    }}
                  >
                    Total Monthly Subscriptions
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: "800",
                    color: isDark ? "#F8FAFC" : "#0F172A",
                    marginBottom: 8,
                    letterSpacing: -1,
                  }}
                >
                  {isPrivateMode ? "•••••" : formatCurrency(totalMonthly)}
                  <Text style={{ fontSize: 16, fontWeight: "500", color: isDark ? "#64748B" : "#94A3B8" }}>
                    {" "}/mo
                  </Text>
                </Text>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View
                    style={{
                      backgroundColor: isDark ? "#0F172A" : "#F1F5F9",
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      flex: 1,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: isDark ? "#64748B" : "#94A3B8", fontWeight: "500", marginBottom: 2 }}>
                      Detected
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: isDark ? "#F8FAFC" : "#0F172A" }}>
                      {subscriptions.length}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: isDark ? "#14532D" : "#DCFCE7",
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      flex: 1,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: isDark ? "#6EE7B7" : "#059669", fontWeight: "500", marginBottom: 2 }}>
                      Added
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: isDark ? "#6EE7B7" : "#059669" }}>
                      {addedCount}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: isDark ? "#1E1B4B" : "#EEF2FF",
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      flex: 1,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: isDark ? "#A5B4FC" : "#4F46E5", fontWeight: "500", marginBottom: 2 }}>
                      Yearly
                    </Text>
                    <Text style={{ fontSize: 16, fontWeight: "800", color: isDark ? "#A5B4FC" : "#4F46E5" }}>
                      {isPrivateMode ? "•••" : formatCurrency(totalMonthly * 12).replace("₹", "₹")}
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Detected Label */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: isDark ? "#64748B" : "#94A3B8",
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 12,
              }}
            >
              Detected Subscriptions ({subscriptions.length})
            </Text>
          </>
        }
        renderItem={({ item, index }) => (
          <SubscriptionCard
            item={item}
            isDark={isDark}
            isPrivateMode={isPrivateMode ?? false}
            onAdd={handleAdd}
            onDismiss={handleDismiss}
            index={index}
          />
        )}
        ListEmptyComponent={
          <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: "center", paddingVertical: 60 }}>
            <Text style={{ fontSize: 56, marginBottom: 16 }}>🎉</Text>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: isDark ? "#F8FAFC" : "#0F172A",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              No Subscriptions Detected
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: isDark ? "#64748B" : "#94A3B8",
                textAlign: "center",
                lineHeight: 19,
                maxWidth: 260,
                marginBottom: 24,
              }}
            >
              No recurring subscriptions were found in your recent transactions. Pull down to re-analyze.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#4F46E5",
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 24,
              }}
              onPress={onRefresh}
              activeOpacity={0.8}
            >
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
                Re-analyze Transactions
              </Text>
            </TouchableOpacity>
          </Animated.View>
        }
      />
    </SafeAreaView>
  );
}
