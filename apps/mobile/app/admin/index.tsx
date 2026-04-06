import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

// ---- Types ----

interface StatCard {
  id: string;
  label: string;
  value: string;
  icon: string;
  change?: string;
  changePositive?: boolean;
}

interface QuickLink {
  id: string;
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

// ---- Mock Data ----

const MOCK_STATS: StatCard[] = [
  { id: "members", label: "Team Members", value: "24", icon: "👥", change: "+3 this month", changePositive: true },
  { id: "expenses", label: "Total Expenses", value: "₹4,82,500", icon: "💰", change: "+12% vs last month", changePositive: false },
  { id: "pending", label: "Pending Approvals", value: "8", icon: "⏳" },
  { id: "violations", label: "Policy Violations", value: "3", icon: "⚠️" },
];

const QUICK_LINKS: QuickLink[] = [
  { id: "approvals", label: "Approvals", icon: "✅", route: "/admin/approvals", badge: 8 },
  { id: "policies", label: "Policies", icon: "📋", route: "/admin/policies", badge: 3 },
  { id: "members", label: "Members", icon: "👥", route: "/admin/approvals" },
  { id: "audit", label: "Audit Log", icon: "📜", route: "/admin/approvals" },
];

// ---- Main Screen ----

export default function AdminDashboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [refreshing, setRefreshing] = useState(false);

  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardBg = isDark ? "bg-slate-800" : "bg-white";

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`} edges={["top"]}>
      {/* Header */}
      <View
        className={`flex-row items-center justify-between px-5 py-3.5 border-b ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"}`}
      >
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text className="text-primary-600 text-base font-medium">{"<"} Back</Text>
        </TouchableOpacity>
        <Text className={`text-lg font-bold ${textPrimary}`}>Admin</Text>
        <View style={{ width: 60 }} />
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
        {/* Workspace Info */}
        <Animated.View entering={FadeInDown.duration(400).delay(50)}>
          <View
            className={`${isDark ? "bg-indigo-900/30 border-indigo-800" : "bg-indigo-50 border-indigo-100"} border rounded-2xl p-4 mb-6`}
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-xl bg-indigo-600 items-center justify-center mr-3">
                <Text className="text-xl">{"🏢"}</Text>
              </View>
              <View className="flex-1">
                <Text className={`text-base font-bold ${isDark ? "text-indigo-200" : "text-indigo-900"}`}>
                  Acme Corp Workspace
                </Text>
                <Text className={`text-xs ${isDark ? "text-indigo-300/70" : "text-indigo-700"}`}>
                  Pro Plan - 24 members
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Stats Cards */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <Text className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-3 px-1`}>
            Workspace Stats
          </Text>
          <View className="flex-row flex-wrap gap-3 mb-6">
            {MOCK_STATS.map((stat) => (
              <View
                key={stat.id}
                className={`${cardBg} rounded-2xl p-4`}
                style={{
                  width: "48%",
                  shadowColor: isDark ? "#000" : "#64748B",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.2 : 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text className="text-2xl mb-2">{stat.icon}</Text>
                <Text className={`text-xl font-bold ${textPrimary}`}>{stat.value}</Text>
                <Text className={`text-xs ${textSecondary} mt-1`}>{stat.label}</Text>
                {stat.change && (
                  <Text
                    className={`text-[10px] font-medium mt-1 ${
                      stat.changePositive
                        ? isDark ? "text-green-400" : "text-green-600"
                        : isDark ? "text-red-400" : "text-red-600"
                    }`}
                  >
                    {stat.change}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Quick Links */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Text className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-3 px-1`}>
            Quick Links
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
            {QUICK_LINKS.map((link, index) => (
              <View key={link.id}>
                <TouchableOpacity
                  className="flex-row items-center py-3.5"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(link.route as any);
                  }}
                  activeOpacity={0.7}
                >
                  <View className={`w-10 h-10 rounded-xl ${isDark ? "bg-slate-700" : "bg-slate-100"} items-center justify-center mr-3`}>
                    <Text className="text-lg">{link.icon}</Text>
                  </View>
                  <Text className={`flex-1 text-sm font-semibold ${textPrimary}`}>
                    {link.label}
                  </Text>
                  {link.badge !== undefined && link.badge > 0 && (
                    <View className="bg-red-500 rounded-full min-w-[22px] h-[22px] items-center justify-center px-1.5 mr-2">
                      <Text className="text-white text-[10px] font-bold">{link.badge}</Text>
                    </View>
                  )}
                  <Text className={`text-lg ${isDark ? "text-slate-600" : "text-slate-300"}`}>{">"}</Text>
                </TouchableOpacity>
                {index < QUICK_LINKS.length - 1 && (
                  <View className={`h-px ${isDark ? "bg-slate-700" : "bg-slate-100"}`} />
                )}
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Recent Activity */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)} className="mt-6">
          <Text className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-3 px-1`}>
            Recent Activity
          </Text>
          <View
            className={`${cardBg} rounded-2xl px-4 py-2`}
            style={{
              shadowColor: isDark ? "#000" : "#64748B",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDark ? 0.2 : 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            {[
              { text: "Priya submitted expense for ₹12,500", time: "2h ago", icon: "📝" },
              { text: "Rahul's expense was auto-approved", time: "4h ago", icon: "✅" },
              { text: "Policy violation: Missing receipt (Amit)", time: "6h ago", icon: "⚠️" },
              { text: "New member added: Sneha Patel", time: "1d ago", icon: "👤" },
            ].map((activity, index) => (
              <View key={index}>
                <View className="flex-row items-center py-3">
                  <Text className="text-base mr-3">{activity.icon}</Text>
                  <View className="flex-1">
                    <Text className={`text-sm ${textPrimary}`} numberOfLines={1}>
                      {activity.text}
                    </Text>
                    <Text className={`text-xs ${textSecondary} mt-0.5`}>{activity.time}</Text>
                  </View>
                </View>
                {index < 3 && (
                  <View className={`h-px ${isDark ? "bg-slate-700" : "bg-slate-100"}`} />
                )}
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
