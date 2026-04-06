import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  useColorScheme,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import NetWorthForm from "@/components/net-worth-form";
import { useAppStore } from "@/stores/app-store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ---- Types ----

type AssetCategory =
  | "cash"
  | "bank"
  | "investment"
  | "property"
  | "vehicle"
  | "other_asset";

type LiabilityCategory =
  | "loan"
  | "credit_card"
  | "mortgage"
  | "pending"
  | "other_liability";

interface NetWorthItem {
  id: string;
  name: string;
  value: number;
  category: AssetCategory | LiabilityCategory;
  notes?: string;
  type: "asset" | "liability";
}

// ---- Mock Data ----

const MOCK_ASSETS: NetWorthItem[] = [
  { id: "a1", name: "Savings Account (HDFC)", value: 125000, category: "bank", type: "asset" },
  { id: "a2", name: "Cash in Hand", value: 8500, category: "cash", type: "asset" },
  { id: "a3", name: "Mutual Funds (Zerodha)", value: 250000, category: "investment", type: "asset" },
  { id: "a4", name: "Home (Partial ownership)", value: 3500000, category: "property", type: "asset" },
];

const MOCK_LIABILITIES: NetWorthItem[] = [
  { id: "l1", name: "Home Loan (SBI)", value: 2200000, category: "mortgage", type: "liability" },
  { id: "l2", name: "HDFC Credit Card", value: 18500, category: "credit_card", type: "liability" },
  { id: "l3", name: "Borrowed from Priya", value: 4500, category: "pending", type: "liability" },
];

const MOCK_TREND = [
  { month: "Oct", value: 1280000 },
  { month: "Nov", value: 1310000 },
  { month: "Dec", value: 1295000 },
  { month: "Jan", value: 1340000 },
  { month: "Feb", value: 1380000 },
  { month: "Mar", value: 1461000 },
];

// ---- Config ----

const ASSET_CONFIG: Record<AssetCategory, { icon: string; color: string; label: string }> = {
  cash: { icon: "💵", color: "#10B981", label: "Cash" },
  bank: { icon: "🏦", color: "#3B82F6", label: "Bank" },
  investment: { icon: "📈", color: "#8B5CF6", label: "Investment" },
  property: { icon: "🏠", color: "#F59E0B", label: "Property" },
  vehicle: { icon: "🚗", color: "#64748B", label: "Vehicle" },
  other_asset: { icon: "💎", color: "#6366F1", label: "Other" },
};

const LIABILITY_CONFIG: Record<LiabilityCategory, { icon: string; color: string; label: string }> = {
  loan: { icon: "🏧", color: "#EF4444", label: "Loan" },
  credit_card: { icon: "💳", color: "#F97316", label: "Credit Card" },
  mortgage: { icon: "🏠", color: "#DC2626", label: "Mortgage" },
  pending: { icon: "💸", color: "#EF4444", label: "Pending" },
  other_liability: { icon: "📋", color: "#94A3B8", label: "Other" },
};

// ---- Helpers ----

function formatCurrency(value: number, currency = "INR"): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value.toLocaleString("en-IN")}`;
}

// ---- Mini Line Chart ----

function MiniLineChart({
  data,
  isDark,
}: {
  data: { month: string; value: number }[];
  isDark: boolean;
}) {
  const chartWidth = SCREEN_WIDTH - 80;
  const chartHeight = 80;
  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;

  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * (chartWidth - 20) + 10,
    y: chartHeight - ((d.value - minValue) / range) * (chartHeight - 20) - 10,
    month: d.month,
    value: d.value,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <View>
      <View style={{ height: chartHeight, position: "relative" }}>
        {/* SVG-like line via absolute positioned views */}
        {points.map((p, i) => {
          if (i === 0) return null;
          const prev = points[i - 1];
          const dx = p.x - prev.x;
          const dy = p.y - prev.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);

          return (
            <View
              key={i}
              style={{
                position: "absolute",
                left: prev.x,
                top: prev.y,
                width: length,
                height: 2,
                backgroundColor: "#4F46E5",
                transform: [{ rotate: `${angle}deg` }],
                transformOrigin: "left center",
              }}
            />
          );
        })}

        {/* Dots */}
        {points.map((p, i) => (
          <View
            key={`dot-${i}`}
            style={{
              position: "absolute",
              left: p.x - 5,
              top: p.y - 5,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: i === points.length - 1 ? "#4F46E5" : isDark ? "#334155" : "#C7D2FE",
              borderWidth: 2,
              borderColor: "#4F46E5",
            }}
          />
        ))}
      </View>

      {/* Month Labels */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
        {data.map((d) => (
          <Text key={d.month} style={{ fontSize: 10, color: isDark ? "#475569" : "#94A3B8", fontWeight: "500" }}>
            {d.month}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ---- Asset / Liability Row ----

function NetWorthRow({
  item,
  isDark,
  onPress,
}: {
  item: NetWorthItem;
  isDark: boolean;
  onPress: () => void;
}) {
  const config =
    item.type === "asset"
      ? ASSET_CONFIG[item.category as AssetCategory]
      : LIABILITY_CONFIG[item.category as LiabilityCategory];

  const { isPrivateMode } = useAppStore() as any;
  const valueStr = isPrivateMode ? "•••" : formatCurrency(item.value);

  return (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 13,
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.7}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: config.color + "20",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Text style={{ fontSize: 18 }}>{config.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: isDark ? "#F8FAFC" : "#0F172A" }}>
          {item.name}
        </Text>
        <View
          style={{
            backgroundColor: config.color + "20",
            borderRadius: 6,
            paddingHorizontal: 7,
            paddingVertical: 2,
            alignSelf: "flex-start",
            marginTop: 3,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "600", color: config.color }}>{config.label}</Text>
        </View>
      </View>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "700",
          color:
            item.type === "asset"
              ? isDark
                ? "#6EE7B7"
                : "#059669"
              : "#EF4444",
        }}
      >
        {item.type === "liability" ? "-" : ""}
        {valueStr}
      </Text>
    </TouchableOpacity>
  );
}

// ---- Main Screen ----

export default function NetWorthScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [assets, setAssets] = useState<NetWorthItem[]>(MOCK_ASSETS);
  const [liabilities, setLiabilities] = useState<NetWorthItem[]>(MOCK_LIABILITIES);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formDefaultType, setFormDefaultType] = useState<"asset" | "liability">("asset");

  const { isPrivateMode } = useAppStore() as any;

  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.value, 0);
  const netWorth = totalAssets - totalLiabilities;
  const lastMonthNetWorth = MOCK_TREND[MOCK_TREND.length - 2].value;
  const change = netWorth - lastMonthNetWorth;
  const changePercent = ((change / lastMonthNetWorth) * 100).toFixed(1);
  const isPositive = change >= 0;

  const bgColor = isDark ? "#0F172A" : "#F8FAFC";

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(false);
  }, []);

  function handleAddAsset() {
    setFormDefaultType("asset");
    setShowForm(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function handleAddLiability() {
    setFormDefaultType("liability");
    setShowForm(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function handleSaveItem(item: Omit<NetWorthItem, "id">) {
    const newItem: NetWorthItem = { ...item, id: Date.now().toString() };
    if (item.type === "asset") {
      setAssets((prev) => [...prev, newItem]);
    } else {
      setLiabilities((prev) => [...prev, newItem]);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  return (
    <>
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
            Net Worth
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 120 }}
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
          {/* Net Worth Hero */}
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <View
              style={{
                backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                marginHorizontal: 20,
                marginTop: 20,
                borderRadius: 24,
                padding: 24,
                shadowColor: isDark ? "#000" : "#64748B",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.3 : 0.1,
                shadowRadius: 16,
                elevation: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: isDark ? "#64748B" : "#94A3B8",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 6,
                }}
              >
                Total Net Worth
              </Text>
              <Text
                style={{
                  fontSize: 36,
                  fontWeight: "800",
                  color: netWorth >= 0
                    ? isDark ? "#6EE7B7" : "#059669"
                    : "#EF4444",
                  marginBottom: 8,
                  letterSpacing: -1,
                }}
              >
                {isPrivateMode ? "•••••" : formatCurrency(netWorth)}
              </Text>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View
                  style={{
                    backgroundColor: isPositive
                      ? isDark ? "#14532D" : "#DCFCE7"
                      : isDark ? "#450A0A" : "#FEF2F2",
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <Text style={{ fontSize: 11, color: isPositive ? "#10B981" : "#EF4444" }}>
                    {isPositive ? "▲" : "▼"}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: isPositive ? "#10B981" : "#EF4444",
                    }}
                  >
                    {isPrivateMode ? "•••" : `${formatCurrency(Math.abs(change))} (${changePercent}%)`}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: isDark ? "#64748B" : "#94A3B8" }}>
                  vs last month
                </Text>
              </View>

              {/* Asset vs Liability bar */}
              <View style={{ marginTop: 16 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, color: isDark ? "#6EE7B7" : "#059669", fontWeight: "600" }}>
                    Assets: {isPrivateMode ? "•••" : formatCurrency(totalAssets)}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#EF4444", fontWeight: "600" }}>
                    Liabilities: {isPrivateMode ? "•••" : formatCurrency(totalLiabilities)}
                  </Text>
                </View>
                <View
                  style={{
                    height: 6,
                    backgroundColor: isDark ? "#334155" : "#E2E8F0",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: 6,
                      width: `${Math.min((totalAssets / (totalAssets + totalLiabilities)) * 100, 100)}%`,
                      backgroundColor: "#10B981",
                      borderRadius: 3,
                    }}
                  />
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Trend Chart */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <View
              style={{
                backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                marginHorizontal: 20,
                marginTop: 16,
                borderRadius: 20,
                padding: 20,
                shadowColor: isDark ? "#000" : "#64748B",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isDark ? 0.2 : 0.06,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: isDark ? "#F8FAFC" : "#0F172A",
                  marginBottom: 16,
                }}
              >
                6-Month Trend
              </Text>
              <MiniLineChart data={MOCK_TREND} isDark={isDark} />
            </View>
          </Animated.View>

          {/* Assets Section */}
          <Animated.View entering={FadeInDown.duration(500).delay(300)}>
            <View style={{ marginHorizontal: 20, marginTop: 24 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "800",
                      color: isDark ? "#F8FAFC" : "#0F172A",
                    }}
                  >
                    Assets
                  </Text>
                  <Text style={{ fontSize: 12, color: isDark ? "#6EE7B7" : "#059669", fontWeight: "600", marginTop: 1 }}>
                    {isPrivateMode ? "•••" : formatCurrency(totalAssets)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={{
                    backgroundColor: "#10B981",
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}
                  onPress={handleAddAsset}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>+</Text>
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Add Asset</Text>
                </TouchableOpacity>
              </View>

              <View
                style={{
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  shadowColor: isDark ? "#000" : "#64748B",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.2 : 0.06,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                {assets.map((asset, i) => (
                  <View key={asset.id}>
                    <NetWorthRow
                      item={asset}
                      isDark={isDark}
                      onPress={() => {}}
                    />
                    {i < assets.length - 1 && (
                      <View style={{ height: 1, backgroundColor: isDark ? "#334155" : "#F1F5F9" }} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>

          {/* Liabilities Section */}
          <Animated.View entering={FadeInDown.duration(500).delay(400)}>
            <View style={{ marginHorizontal: 20, marginTop: 24 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "800",
                      color: isDark ? "#F8FAFC" : "#0F172A",
                    }}
                  >
                    Liabilities
                  </Text>
                  <Text style={{ fontSize: 12, color: "#EF4444", fontWeight: "600", marginTop: 1 }}>
                    {isPrivateMode ? "•••" : formatCurrency(totalLiabilities)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={{
                    backgroundColor: isDark ? "#450A0A" : "#FEF2F2",
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: "#FCA5A5",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}
                  onPress={handleAddLiability}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: "#EF4444", fontSize: 16, fontWeight: "700" }}>+</Text>
                  <Text style={{ color: "#EF4444", fontSize: 12, fontWeight: "600" }}>Add Liability</Text>
                </TouchableOpacity>
              </View>

              <View
                style={{
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  shadowColor: isDark ? "#000" : "#64748B",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.2 : 0.06,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                {liabilities.map((liability, i) => (
                  <View key={liability.id}>
                    <NetWorthRow
                      item={liability}
                      isDark={isDark}
                      onPress={() => {}}
                    />
                    {i < liabilities.length - 1 && (
                      <View style={{ height: 1, backgroundColor: isDark ? "#334155" : "#F1F5F9" }} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Net Worth Form Sheet */}
      <NetWorthForm
        visible={showForm}
        defaultType={formDefaultType}
        onClose={() => setShowForm(false)}
        onSave={handleSaveItem}
      />
    </>
  );
}
