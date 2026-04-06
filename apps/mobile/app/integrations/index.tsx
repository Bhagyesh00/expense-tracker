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

import IntegrationCard from "@/components/integration-card";
import WebhookList from "@/components/webhook-list";

// ---- Types ----

export interface Integration {
  id: string;
  name: string;
  icon: string;
  description: string;
  connected: boolean;
  lastSyncedAt: string | null;
  syncStatus: "idle" | "syncing" | "success" | "error";
  errorMessage?: string;
}

// ---- Mock Data ----

const MOCK_INTEGRATIONS: Integration[] = [
  {
    id: "google-sheets",
    name: "Google Sheets",
    icon: "📊",
    description: "Auto-export expenses to Google Sheets",
    connected: true,
    lastSyncedAt: "2026-03-30T08:15:00Z",
    syncStatus: "success",
  },
  {
    id: "slack",
    name: "Slack",
    icon: "💬",
    description: "Get expense notifications in Slack channels",
    connected: true,
    lastSyncedAt: "2026-03-30T09:30:00Z",
    syncStatus: "success",
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    icon: "📒",
    description: "Sync expenses with QuickBooks Online",
    connected: false,
    lastSyncedAt: null,
    syncStatus: "idle",
  },
  {
    id: "xero",
    name: "Xero",
    icon: "📘",
    description: "Two-way sync with Xero accounting",
    connected: false,
    lastSyncedAt: null,
    syncStatus: "idle",
  },
];

const MOCK_API_KEYS = [
  { id: "key-1", name: "Production Key", prefix: "ef_live_...3k9x", createdAt: "2026-02-15" },
  { id: "key-2", name: "Test Key", prefix: "ef_test_...7m2p", createdAt: "2026-03-01" },
];

// ---- Main Screen ----

export default function IntegrationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [integrations, setIntegrations] = useState(MOCK_INTEGRATIONS);
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

  function handleToggleConnection(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIntegrations((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (item.connected) {
          return { ...item, connected: false, syncStatus: "idle" as const, lastSyncedAt: null };
        }
        // In production this would open an OAuth flow
        return { ...item, connected: true, syncStatus: "success" as const, lastSyncedAt: new Date().toISOString() };
      })
    );
  }

  function handleSyncNow(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIntegrations((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, syncStatus: "syncing" as const } : item
      )
    );
    // Simulate sync
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, syncStatus: "success" as const, lastSyncedAt: new Date().toISOString() }
            : item
        )
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 2000);
  }

  function handleOpenSettings(id: string) {
    Alert.alert("Integration Settings", `Configure ${id} integration settings on the web dashboard for full management.`);
  }

  function handleGenerateApiKey() {
    Alert.alert(
      "Generate API Key",
      "For security, API key generation is only available on the web dashboard. Would you like to open it?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Web", onPress: () => {} },
      ]
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`} edges={["top"]}>
      {/* Header */}
      <View
        className={`flex-row items-center justify-between px-5 py-3.5 border-b ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"}`}
      >
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text className="text-primary-600 text-base font-medium">
            {"<"} Back
          </Text>
        </TouchableOpacity>
        <Text className={`text-lg font-bold ${textPrimary}`}>
          Integrations
        </Text>
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
        {/* Connected Integrations */}
        <Animated.View entering={FadeInDown.duration(400).delay(50)}>
          <Text className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-3 px-1`}>
            Available Integrations
          </Text>
          <View className="gap-3 mb-6">
            {integrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onToggleConnection={() => handleToggleConnection(integration.id)}
                onSyncNow={() => handleSyncNow(integration.id)}
                onOpenSettings={() => handleOpenSettings(integration.id)}
              />
            ))}
          </View>
        </Animated.View>

        {/* API Keys Section */}
        <Animated.View entering={FadeInDown.duration(400).delay(150)}>
          <Text className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-3 px-1`}>
            API Keys
          </Text>
          <View
            className={`${cardBg} rounded-2xl px-4 py-2 mb-2`}
            style={{
              shadowColor: isDark ? "#000" : "#64748B",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDark ? 0.2 : 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            {MOCK_API_KEYS.map((key, index) => (
              <View key={key.id}>
                <View className="flex-row items-center py-3.5">
                  <View className="flex-1">
                    <Text className={`text-sm font-semibold ${textPrimary}`}>
                      {key.name}
                    </Text>
                    <Text className={`text-xs font-mono ${textSecondary} mt-0.5`}>
                      {key.prefix}
                    </Text>
                  </View>
                  <Text className={`text-xs ${textSecondary}`}>
                    {key.createdAt}
                  </Text>
                </View>
                {index < MOCK_API_KEYS.length - 1 && (
                  <View className={`h-px ${isDark ? "bg-slate-700" : "bg-slate-100"}`} />
                )}
              </View>
            ))}
          </View>
          <TouchableOpacity
            className="bg-primary-600 rounded-xl py-3.5 items-center mt-2 mb-6"
            onPress={handleGenerateApiKey}
            activeOpacity={0.8}
          >
            <Text className="text-white text-sm font-semibold">
              Generate New API Key
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Webhooks */}
        <Animated.View entering={FadeInDown.duration(400).delay(250)}>
          <Text className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-3 px-1`}>
            Webhooks
          </Text>
          <WebhookList />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
