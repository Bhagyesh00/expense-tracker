import { View, Text, TouchableOpacity, ActivityIndicator, useColorScheme } from "react-native";
import * as Haptics from "expo-haptics";

// ---- Types ----

interface Integration {
  id: string;
  name: string;
  icon: string;
  description: string;
  connected: boolean;
  lastSyncedAt: string | null;
  syncStatus: "idle" | "syncing" | "success" | "error";
  errorMessage?: string;
}

interface IntegrationCardProps {
  integration: Integration;
  onToggleConnection: () => void;
  onSyncNow: () => void;
  onOpenSettings: () => void;
}

// ---- Helpers ----

function formatLastSynced(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function getSyncStatusLabel(status: Integration["syncStatus"]): { text: string; color: string } {
  switch (status) {
    case "syncing":
      return { text: "Syncing...", color: "#4F46E5" };
    case "success":
      return { text: "Synced", color: "#10B981" };
    case "error":
      return { text: "Error", color: "#EF4444" };
    default:
      return { text: "Not synced", color: "#94A3B8" };
  }
}

// ---- Component ----

export default function IntegrationCard({
  integration,
  onToggleConnection,
  onSyncNow,
  onOpenSettings,
}: IntegrationCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const { connected, syncStatus, lastSyncedAt, errorMessage } = integration;
  const syncInfo = getSyncStatusLabel(syncStatus);

  const cardBg = isDark ? "bg-slate-800" : "bg-white";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <View
      className={`${cardBg} rounded-2xl p-4`}
      style={{
        shadowColor: isDark ? "#000" : "#64748B",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.2 : 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {/* Top row: icon, name, status badge */}
      <View className="flex-row items-center mb-3">
        <View
          className={`w-11 h-11 rounded-xl ${isDark ? "bg-slate-700" : "bg-slate-100"} items-center justify-center mr-3`}
        >
          <Text className="text-xl">{integration.icon}</Text>
        </View>
        <View className="flex-1">
          <Text className={`text-base font-semibold ${textPrimary}`}>
            {integration.name}
          </Text>
          <Text className={`text-xs ${textSecondary} mt-0.5`} numberOfLines={1}>
            {integration.description}
          </Text>
        </View>

        {/* Status badge */}
        <View
          className="rounded-full px-2.5 py-1 ml-2"
          style={{
            backgroundColor: connected
              ? isDark
                ? "#064E3B"
                : "#ECFDF5"
              : isDark
                ? "#1E293B"
                : "#F1F5F9",
          }}
        >
          <Text
            className="text-xs font-semibold"
            style={{ color: connected ? "#10B981" : "#94A3B8" }}
          >
            {connected ? "Connected" : "Disconnected"}
          </Text>
        </View>
      </View>

      {/* Sync status and last synced */}
      {connected && (
        <View className="flex-row items-center mb-3">
          {syncStatus === "syncing" && (
            <ActivityIndicator size="small" color="#4F46E5" style={{ marginRight: 6 }} />
          )}
          <View
            className="w-2 h-2 rounded-full mr-1.5"
            style={{ backgroundColor: syncInfo.color }}
          />
          <Text className="text-xs font-medium" style={{ color: syncInfo.color }}>
            {syncInfo.text}
          </Text>
          <Text className={`text-xs ${textSecondary} ml-2`}>
            Last synced: {formatLastSynced(lastSyncedAt)}
          </Text>
        </View>
      )}

      {/* Error indicator */}
      {syncStatus === "error" && errorMessage && (
        <View className={`${isDark ? "bg-red-900/30" : "bg-red-50"} rounded-xl p-3 mb-3`}>
          <Text className={`text-xs ${isDark ? "text-red-300" : "text-red-600"}`}>
            {errorMessage}
          </Text>
        </View>
      )}

      {/* Actions row */}
      <View className="flex-row items-center gap-2">
        {connected ? (
          <>
            <TouchableOpacity
              className="flex-1 bg-primary-600 rounded-xl py-2.5 items-center"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSyncNow();
              }}
              activeOpacity={0.8}
              disabled={syncStatus === "syncing"}
            >
              <Text className="text-white text-xs font-semibold">
                {syncStatus === "syncing" ? "Syncing..." : "Sync Now"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`w-10 h-10 rounded-xl ${isDark ? "bg-slate-700" : "bg-slate-100"} items-center justify-center`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onOpenSettings();
              }}
              activeOpacity={0.7}
            >
              <Text className="text-base">{"⚙️"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`px-4 py-2.5 rounded-xl border ${isDark ? "border-red-800" : "border-red-200"}`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onToggleConnection();
              }}
              activeOpacity={0.7}
            >
              <Text className={`text-xs font-semibold ${isDark ? "text-red-400" : "text-red-500"}`}>
                Disconnect
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            className="flex-1 bg-primary-600 rounded-xl py-3 items-center"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onToggleConnection();
            }}
            activeOpacity={0.8}
          >
            <Text className="text-white text-sm font-semibold">Connect</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
