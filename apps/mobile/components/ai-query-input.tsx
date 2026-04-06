import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Keyboard,
  useColorScheme,
  Platform,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import type { AIQueryResult } from "@/lib/ai-service";

// ---------------------------------------------------------------------------
// Loading Dots
// ---------------------------------------------------------------------------

function LoadingDots() {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  const animateDot = useCallback(
    (sv: Animated.SharedValue<number>, delay: number) => {
      sv.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(-6, { duration: 300 }),
            withTiming(0, { duration: 300 })
          ),
          -1,
          false
        )
      );
    },
    []
  );

  // Kick off animations immediately on mount via inline effect pattern
  const started = useRef(false);
  if (!started.current) {
    started.current = true;
    animateDot(dot1, 0);
    animateDot(dot2, 150);
    animateDot(dot3, 300);
  }

  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot1.value }],
  }));
  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot2.value }],
  }));
  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot3.value }],
  }));

  return (
    <View className="flex-row items-center gap-1.5 py-2">
      <Animated.View
        style={dot1Style}
        className="w-2 h-2 rounded-full bg-indigo-500"
      />
      <Animated.View
        style={dot2Style}
        className="w-2 h-2 rounded-full bg-indigo-500"
      />
      <Animated.View
        style={dot3Style}
        className="w-2 h-2 rounded-full bg-indigo-500"
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Response Card
// ---------------------------------------------------------------------------

interface ResponseCardProps {
  result: AIQueryResult;
  isDark: boolean;
  onFollowUp: (question: string) => void;
}

function ResponseCard({ result, isDark, onFollowUp }: ResponseCardProps) {
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const metricBg = isDark ? "bg-slate-700" : "bg-slate-50";

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify()}
      className={`${cardBg} border rounded-2xl p-4 mt-3`}
    >
      {/* AI label */}
      <View className="flex-row items-center gap-2 mb-3">
        <Text className="text-base">✨</Text>
        <Text
          className={`text-xs font-semibold ${isDark ? "text-indigo-400" : "text-indigo-600"}`}
        >
          AI Response
        </Text>
        {result.confidence !== undefined && (
          <View className="ml-auto bg-emerald-100 dark:bg-emerald-900/40 rounded-full px-2 py-0.5">
            <Text className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              {result.confidence}% confident
            </Text>
          </View>
        )}
      </View>

      {/* Answer text */}
      <Text
        className={`text-sm ${textPrimary} leading-5 mb-3`}
        selectable
      >
        {result.answer}
      </Text>

      {/* Supporting data metrics */}
      {result.data && result.data.length > 0 && (
        <View className={`${metricBg} rounded-xl p-3 mb-3`}>
          <View className="flex-row flex-wrap gap-2">
            {result.data.map((item, index) => (
              <View key={index} className="items-center min-w-[80px]">
                <Text
                  className={`text-base font-bold ${isDark ? "text-indigo-300" : "text-indigo-700"}`}
                >
                  {item.value}
                </Text>
                <Text className={`text-xs ${textSecondary} mt-0.5 text-center`}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Follow-up suggestions */}
      {result.followUpSuggestions && result.followUpSuggestions.length > 0 && (
        <View>
          <Text className={`text-xs font-medium ${textSecondary} mb-2`}>
            Follow-up questions:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {result.followUpSuggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                className={`${isDark ? "bg-indigo-900/40 border-indigo-700" : "bg-indigo-50 border-indigo-200"} border rounded-full px-3 py-1.5`}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onFollowUp(suggestion);
                }}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-xs font-medium ${isDark ? "text-indigo-300" : "text-indigo-700"}`}
                >
                  {suggestion}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface AIQueryInputProps {
  onQuery: (question: string) => Promise<AIQueryResult>;
  placeholder?: string;
  suggestions?: string[];
}

export default function AIQueryInput({
  onQuery,
  placeholder = "Ask about your spending...",
  suggestions = [
    "Top spending categories?",
    "Am I over budget?",
    "Spending trend this month?",
  ],
}: AIQueryInputProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AIQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const inputBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const placeholderColor = isDark ? "#64748B" : "#94A3B8";
  const chipBg = isDark
    ? "bg-slate-800 border-slate-700"
    : "bg-white border-slate-200";
  const chipText = isDark ? "text-slate-300" : "text-slate-600";

  async function handleSubmit(questionOverride?: string) {
    const question = (questionOverride ?? query).trim();
    if (!question || isLoading) return;

    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setIsLoading(true);
    setError(null);
    setResult(null);

    if (!questionOverride) {
      setQuery("");
    }

    try {
      const res = await onQuery(question);
      setResult(res);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong. Try again.";
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSuggestion(suggestion: string) {
    setQuery(suggestion);
    handleSubmit(suggestion);
  }

  function handleFollowUp(followUp: string) {
    setQuery(followUp);
    handleSubmit(followUp);
  }

  const canSubmit = query.trim().length > 0 && !isLoading;

  return (
    <View>
      {/* Input Row */}
      <View
        className={`flex-row items-center ${inputBg} border rounded-2xl px-4 py-3 gap-3`}
        style={{
          shadowColor: isDark ? "#000" : "#6366F1",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.2 : 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <Text className="text-lg">✨</Text>
        <TextInput
          ref={inputRef}
          className={`flex-1 text-sm ${textPrimary}`}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => handleSubmit()}
          returnKeyType="send"
          multiline={false}
          style={{ paddingVertical: Platform.OS === "ios" ? 2 : 0 }}
        />
        <TouchableOpacity
          onPress={() => handleSubmit()}
          disabled={!canSubmit}
          activeOpacity={0.7}
          className={`w-9 h-9 rounded-xl items-center justify-center ${
            canSubmit
              ? "bg-indigo-600"
              : isDark
              ? "bg-slate-700"
              : "bg-slate-100"
          }`}
        >
          {isLoading ? (
            <Text className="text-sm">⏳</Text>
          ) : (
            <Text
              className={`text-sm ${canSubmit ? "text-white" : isDark ? "text-slate-500" : "text-slate-300"}`}
            >
              ↑
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Suggestion Chips */}
      {!result && !isLoading && (
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
          >
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                className={`${chipBg} border rounded-full px-3 py-2`}
                onPress={() => handleSuggestion(suggestion)}
                activeOpacity={0.7}
              >
                <Text className={`text-xs font-medium ${chipText}`}>
                  {suggestion}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Loading */}
      {isLoading && (
        <Animated.View
          entering={FadeInUp.duration(200)}
          exiting={FadeOut.duration(200)}
          className={`${isDark ? "bg-slate-800" : "bg-white"} rounded-2xl p-4 mt-3 flex-row items-center gap-3`}
        >
          <LoadingDots />
          <Text className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Analyzing your data...
          </Text>
        </Animated.View>
      )}

      {/* Error */}
      {error && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl p-4 mt-3"
        >
          <Text className="text-sm text-red-700 dark:text-red-300">{error}</Text>
          <TouchableOpacity
            onPress={() => setError(null)}
            className="mt-2"
            activeOpacity={0.7}
          >
            <Text className="text-xs font-medium text-red-600 dark:text-red-400">
              Dismiss
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Response */}
      {result && !isLoading && (
        <ResponseCard
          result={result}
          isDark={isDark}
          onFollowUp={handleFollowUp}
        />
      )}
    </View>
  );
}
