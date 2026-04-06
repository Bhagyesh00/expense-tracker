import { useState, useCallback, useRef } from "react";
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
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import AIQueryInput from "@/components/ai-query-input";
import InsightCard from "@/components/insight-card";
import AnomalyCard from "@/components/anomaly-card";
import ForecastCard from "@/components/forecast-card";
import {
  callAIQuery,
  getInsights,
  getForecast,
  getMockAnomalies,
  dismissAnomaly,
} from "@/lib/ai-service";
import { useAppStore } from "@/stores/app-store";

import type { AIInsight, Anomaly, CashFlowForecast } from "@/lib/ai-service";

// ---------------------------------------------------------------------------
// Section Header
// ---------------------------------------------------------------------------

function SectionHeader({
  title,
  subtitle,
  isDark,
}: {
  title: string;
  subtitle?: string;
  isDark: boolean;
}) {
  return (
    <View className="mb-3">
      <Text
        className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          className={`text-xs mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Skeleton Loader
// ---------------------------------------------------------------------------

function SkeletonBlock({
  isDark,
  height = 80,
  borderRadius = 16,
}: {
  isDark: boolean;
  height?: number;
  borderRadius?: number;
}) {
  return (
    <View
      style={{
        height,
        borderRadius,
        backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function InsightsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { activeWorkspaceId } = useAppStore();
  const workspaceId = activeWorkspaceId ?? "demo-workspace";

  const [refreshing, setRefreshing] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [anomalies, setAnomalies] = useState<Anomaly[]>(() =>
    getMockAnomalies()
  );
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [forecasts, setForecasts] = useState<
    Record<30 | 60 | 90, CashFlowForecast | null>
  >({ 30: null, 60: null, 90: null });
  const [forecastLoading, setForecastLoading] = useState(false);
  const fetchedForecastPeriods = useRef<Set<30 | 60 | 90>>(new Set());

  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";

  // Fetch insights on first load
  const loadInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const data = await getInsights(workspaceId);
      setInsights(data);
    } catch {
      // errors handled gracefully inside getInsights (returns mock)
    } finally {
      setInsightsLoading(false);
    }
  }, [workspaceId]);

  // Load a specific forecast period
  const loadForecast = useCallback(
    async (period: 30 | 60 | 90) => {
      if (fetchedForecastPeriods.current.has(period)) return;
      fetchedForecastPeriods.current.add(period);
      setForecastLoading(true);
      try {
        const data = await getForecast(workspaceId, period);
        setForecasts((prev) => ({ ...prev, [period]: data }));
      } catch {
        // fallback handled inside getForecast
      } finally {
        setForecastLoading(false);
      }
    },
    [workspaceId]
  );

  // Initial load
  const initialized = useRef(false);
  if (!initialized.current) {
    initialized.current = true;
    loadInsights();
    loadForecast(30);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchedForecastPeriods.current.clear();
    await Promise.all([loadInsights(), loadForecast(30)]);
    setRefreshing(false);
  }, [loadInsights, loadForecast]);

  function handleDismissAnomaly(id: string) {
    setAnomalies((prev) => prev.filter((a) => a.id !== id));
    dismissAnomaly(id);
  }

  function handleDismissInsight(id: string) {
    setInsights((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleAIQuery(question: string) {
    return callAIQuery(question, workspaceId, "user-id");
  }

  function handleForecastPeriodChange(period: 30 | 60 | 90) {
    loadForecast(period);
  }

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`} edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366F1"
            colors={["#6366F1"]}
          />
        }
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(50)}
          className="px-5 pt-4 pb-2 flex-row items-center"
        >
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            className={`w-10 h-10 rounded-full ${isDark ? "bg-slate-800" : "bg-slate-100"} items-center justify-center mr-3`}
            activeOpacity={0.7}
          >
            <Text className={`text-lg ${isDark ? "text-white" : "text-slate-900"}`}>
              ‹
            </Text>
          </TouchableOpacity>
          <View className="flex-1">
            <Text className={`text-2xl font-bold ${textPrimary}`}>
              ✨ AI Insights
            </Text>
            <Text className={`text-xs ${textSecondary} mt-0.5`}>
              Powered by your spending data
            </Text>
          </View>
        </Animated.View>

        {/* Natural Language Query */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(150)}
          className="px-5 mt-4"
        >
          <SectionHeader
            title="Ask AI"
            subtitle="Natural language queries about your finances"
            isDark={isDark}
          />
          <AIQueryInput
            onQuery={handleAIQuery}
            placeholder="Ask about your spending..."
            suggestions={[
              "Top spending categories?",
              "Am I over budget?",
              "Spending trend this month?",
              "Where can I save money?",
            ]}
          />
        </Animated.View>

        {/* AI Insights Cards (horizontal scroll) */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(250)}
          className="mt-8"
        >
          <View className="px-5">
            <SectionHeader
              title="Spending Insights"
              subtitle="AI-generated analysis of your patterns"
              isDark={isDark}
            />
          </View>

          {insightsLoading ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            >
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ width: 260 }}>
                  <SkeletonBlock isDark={isDark} height={180} />
                </View>
              ))}
            </ScrollView>
          ) : insights.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}
            >
              {insights.map((insight, index) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onDismiss={handleDismissInsight}
                  index={index}
                />
              ))}
            </ScrollView>
          ) : (
            <View className="mx-5">
              <View
                className={`${isDark ? "bg-slate-800" : "bg-white"} rounded-2xl p-8 items-center`}
              >
                <Text className="text-4xl mb-3">🔮</Text>
                <Text className={`text-base font-semibold ${textPrimary} mb-1`}>
                  No insights yet
                </Text>
                <Text className={`text-sm ${textSecondary} text-center`}>
                  Add more expenses and we'll surface personalized insights.
                </Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Anomaly Alerts */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(350)}
          className="px-5 mt-8"
        >
          <SectionHeader
            title="Anomaly Alerts"
            subtitle="Unusual spending patterns detected"
            isDark={isDark}
          />

          {anomalies.length > 0 ? (
            <>
              {anomalies.map((anomaly, index) => (
                <AnomalyCard
                  key={anomaly.id}
                  anomaly={anomaly}
                  onDismiss={handleDismissAnomaly}
                  onView={(id) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/expense/${id}`);
                  }}
                  index={index}
                />
              ))}
            </>
          ) : (
            <View
              className={`${isDark ? "bg-slate-800" : "bg-white"} rounded-2xl p-6 items-center`}
            >
              <Text className="text-3xl mb-2">✅</Text>
              <Text className={`text-sm font-semibold ${textPrimary}`}>
                No anomalies detected
              </Text>
              <Text className={`text-xs ${textSecondary} text-center mt-1`}>
                Your spending looks normal this month.
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Cash Flow Forecast */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(450)}
          className="px-5 mt-8"
        >
          <SectionHeader
            title="Cash Flow Forecast"
            subtitle="Projected income and expenses"
            isDark={isDark}
          />
          <ForecastCard
            forecasts={forecasts}
            onPeriodChange={handleForecastPeriodChange}
            isLoading={forecastLoading && !forecasts[30]}
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
