import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Switch,
  RefreshControl,
  Alert,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

// ---- Types ----

interface Policy {
  id: string;
  name: string;
  description: string;
  type: "amount" | "category" | "receipt" | "approval" | "custom";
  active: boolean;
  violationsCount: number;
  rule: string;
}

// ---- Mock Data ----

const MOCK_POLICIES: Policy[] = [
  {
    id: "pol-1",
    name: "Maximum Single Expense",
    description: "Single expense cannot exceed limit",
    type: "amount",
    active: true,
    violationsCount: 2,
    rule: "Max: ₹50,000 per transaction",
  },
  {
    id: "pol-2",
    name: "Receipt Required",
    description: "Receipts required above threshold",
    type: "receipt",
    active: true,
    violationsCount: 5,
    rule: "Required for expenses > ₹500",
  },
  {
    id: "pol-3",
    name: "Approval Required",
    description: "Manager approval for high-value expenses",
    type: "approval",
    active: true,
    violationsCount: 0,
    rule: "Approval needed for expenses > ₹10,000",
  },
  {
    id: "pol-4",
    name: "Required Categories",
    description: "All expenses must have a category",
    type: "category",
    active: true,
    violationsCount: 1,
    rule: "Category must be selected from approved list",
  },
  {
    id: "pol-5",
    name: "Weekend Spending Limit",
    description: "Restrict weekend expense amounts",
    type: "amount",
    active: false,
    violationsCount: 0,
    rule: "Max: ₹5,000 on weekends",
  },
  {
    id: "pol-6",
    name: "Monthly Team Budget",
    description: "Team-level monthly spending cap",
    type: "custom",
    active: true,
    violationsCount: 0,
    rule: "Max: ₹5,00,000/month per team",
  },
];

function getPolicyTypeIcon(type: Policy["type"]): string {
  switch (type) {
    case "amount": return "💰";
    case "category": return "🏷";
    case "receipt": return "🧾";
    case "approval": return "✅";
    case "custom": return "⚙️";
  }
}

// ---- Main Screen ----

export default function PoliciesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [policies, setPolicies] = useState(MOCK_POLICIES);
  const [refreshing, setRefreshing] = useState(false);

  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardBg = isDark ? "bg-slate-800" : "bg-white";

  const totalViolations = policies.reduce((sum, p) => sum + p.violationsCount, 0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  function handleTogglePolicy(id: string, value: boolean) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: value } : p))
    );
  }

  function handleEditPolicy(policy: Policy) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      policy.name,
      `Current rule: ${policy.rule}\n\nEditing policies is available on the web dashboard for full configuration options.`,
      [{ text: "OK" }]
    );
  }

  function renderPolicyItem({ item, index }: { item: Policy; index: number }) {
    const icon = getPolicyTypeIcon(item.type);

    return (
      <Animated.View entering={FadeInDown.duration(300).delay(index * 60)}>
        <TouchableOpacity
          className={`${cardBg} rounded-xl p-4 mb-2`}
          style={{
            shadowColor: isDark ? "#000" : "#64748B",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.15 : 0.04,
            shadowRadius: 3,
            elevation: 1,
            opacity: item.active ? 1 : 0.6,
          }}
          onPress={() => handleEditPolicy(item)}
          activeOpacity={0.7}
        >
          <View className="flex-row items-start">
            <View className={`w-10 h-10 rounded-xl ${isDark ? "bg-slate-700" : "bg-slate-100"} items-center justify-center mr-3`}>
              <Text className="text-lg">{icon}</Text>
            </View>
            <View className="flex-1 mr-3">
              <View className="flex-row items-center gap-2">
                <Text className={`text-sm font-semibold ${textPrimary}`} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.violationsCount > 0 && (
                  <View className="bg-red-500 rounded-full min-w-[20px] h-[20px] items-center justify-center px-1">
                    <Text className="text-white text-[10px] font-bold">
                      {item.violationsCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text className={`text-xs ${textSecondary} mt-0.5`} numberOfLines={1}>
                {item.description}
              </Text>
              <Text className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"} mt-1`}>
                {item.rule}
              </Text>
            </View>
            <Switch
              value={item.active}
              onValueChange={(value) => handleTogglePolicy(item.id, value)}
              trackColor={{ false: "#CBD5E1", true: "#A5B4FC" }}
              thumbColor={item.active ? "#4F46E5" : "#F1F5F9"}
            />
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
        <Text className={`text-lg font-bold ${textPrimary}`}>Policies</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Violations Summary */}
      {totalViolations > 0 && (
        <View className="px-5 pt-3">
          <Animated.View entering={FadeInDown.duration(300)}>
            <View
              className={`${isDark ? "bg-red-900/30 border-red-800" : "bg-red-50 border-red-200"} border rounded-xl p-3 flex-row items-center`}
            >
              <Text className="text-base mr-2">{"⚠️"}</Text>
              <Text className={`text-sm font-medium ${isDark ? "text-red-300" : "text-red-700"}`}>
                {totalViolations} policy violation{totalViolations !== 1 ? "s" : ""} detected
              </Text>
            </View>
          </Animated.View>
        </View>
      )}

      <FlatList
        data={policies}
        keyExtractor={(item) => item.id}
        renderItem={renderPolicyItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4F46E5"
            colors={["#4F46E5"]}
          />
        }
      />
    </SafeAreaView>
  );
}
