import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Switch,
  Alert,
  RefreshControl,
  useColorScheme,
} from "react-native";
import Animated, { FadeInRight, SlideOutRight } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

// ---- Types ----

interface Webhook {
  id: string;
  name: string;
  url: string;
  eventCount: number;
  active: boolean;
}

// ---- Mock Data ----

const INITIAL_WEBHOOKS: Webhook[] = [
  {
    id: "wh-1",
    name: "Expense Created",
    url: "https://api.example.com/webhooks/expense-created",
    eventCount: 342,
    active: true,
  },
  {
    id: "wh-2",
    name: "Budget Alert",
    url: "https://hooks.slack.com/services/T0123/B456/abc",
    eventCount: 28,
    active: true,
  },
  {
    id: "wh-3",
    name: "Payment Settled",
    url: "https://n8n.myserver.io/webhook/payment-settled",
    eventCount: 156,
    active: false,
  },
];

// ---- Helpers ----

function truncateUrl(url: string, maxLen: number = 40): string {
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen - 3) + "...";
}

// ---- Component ----

export default function WebhookList() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [webhooks, setWebhooks] = useState(INITIAL_WEBHOOKS);
  const [refreshing, setRefreshing] = useState(false);

  const cardBg = isDark ? "bg-slate-800" : "bg-white";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setRefreshing(false);
  }, []);

  function handleToggleActive(id: string, value: boolean) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWebhooks((prev) =>
      prev.map((wh) => (wh.id === id ? { ...wh, active: value } : wh))
    );
  }

  function handleDelete(id: string) {
    const webhook = webhooks.find((wh) => wh.id === id);
    if (!webhook) return;

    Alert.alert(
      "Delete Webhook",
      `Are you sure you want to delete "${webhook.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setWebhooks((prev) => prev.filter((wh) => wh.id !== id));
          },
        },
      ]
    );
  }

  function renderWebhookItem({ item, index }: { item: Webhook; index: number }) {
    return (
      <Animated.View entering={FadeInRight.duration(300).delay(index * 80)}>
        <View className="flex-row items-center py-3.5">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-1">
              <Text className={`text-sm font-semibold ${textPrimary}`}>
                {item.name}
              </Text>
              <View
                className="ml-2 rounded-full px-2 py-0.5"
                style={{
                  backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                }}
              >
                <Text className={`text-[10px] font-medium ${textSecondary}`}>
                  {item.eventCount} events
                </Text>
              </View>
            </View>
            <Text className={`text-xs font-mono ${textSecondary}`} numberOfLines={1}>
              {truncateUrl(item.url)}
            </Text>
          </View>
          <Switch
            value={item.active}
            onValueChange={(value) => handleToggleActive(item.id, value)}
            trackColor={{ false: "#CBD5E1", true: "#A5B4FC" }}
            thumbColor={item.active ? "#4F46E5" : "#F1F5F9"}
          />
          <TouchableOpacity
            className="ml-2 p-1.5"
            onPress={() => handleDelete(item.id)}
            activeOpacity={0.6}
          >
            <Text className="text-red-500 text-sm">{"🗑"}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  return (
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
      {webhooks.length === 0 ? (
        <View className="py-8 items-center">
          <Text className="text-3xl mb-2">{"🔗"}</Text>
          <Text className={`text-sm font-medium ${textPrimary}`}>No Webhooks</Text>
          <Text className={`text-xs ${textSecondary} mt-1`}>
            Create webhooks from the web dashboard
          </Text>
        </View>
      ) : (
        <FlatList
          data={webhooks}
          keyExtractor={(item) => item.id}
          renderItem={renderWebhookItem}
          scrollEnabled={false}
          ItemSeparatorComponent={() => (
            <View className={`h-px ${isDark ? "bg-slate-700" : "bg-slate-100"}`} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4F46E5"
              colors={["#4F46E5"]}
            />
          }
        />
      )}
    </View>
  );
}
