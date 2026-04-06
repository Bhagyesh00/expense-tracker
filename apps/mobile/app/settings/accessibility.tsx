import { View, Text, ScrollView, TouchableOpacity, Switch, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useAccessibility, type FontScale } from "@/hooks/use-accessibility";

// ---- Font Scale Options ----

const FONT_SCALES: { value: FontScale; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "normal", label: "Normal" },
  { value: "large", label: "Large" },
  { value: "extra_large", label: "Extra Large" },
];

// ---- Main Screen ----

export default function AccessibilityScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const {
    highContrast,
    reduceMotion,
    fontScale,
    screenReaderOptimizations,
    screenReaderActive,
    fontScaleMultiplier,
    setHighContrast,
    setReduceMotion,
    setFontScale,
    setScreenReaderOptimizations,
  } = useAccessibility();

  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardBg = isDark ? "bg-slate-800" : "bg-white";

  // Contrast-aware border
  const contrastBorder = highContrast
    ? isDark ? "border-white" : "border-black"
    : isDark ? "border-slate-700" : "border-slate-200";

  function handleToggle(
    setter: (value: boolean) => Promise<void>,
    value: boolean
  ) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setter(value);
  }

  function handleFontScaleSelect(scale: FontScale) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFontScale(scale);
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
        <Text className={`text-lg font-bold ${textPrimary}`}>Accessibility</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-4 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Screen Reader Status */}
        {screenReaderActive && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View
              className={`${isDark ? "bg-indigo-900/30 border-indigo-800" : "bg-indigo-50 border-indigo-100"} border rounded-xl p-3 mb-4`}
            >
              <Text className={`text-xs font-medium ${isDark ? "text-indigo-300" : "text-indigo-700"}`}>
                Screen reader is active. Enhanced accessibility features are available.
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Visual Settings */}
        <Animated.View entering={FadeInDown.duration(400).delay(50)}>
          <Text className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-3 px-1`}>
            Visual
          </Text>
          <View
            className={`${cardBg} rounded-2xl px-4 ${highContrast ? `border ${contrastBorder}` : ""}`}
            style={{
              shadowColor: isDark ? "#000" : "#64748B",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDark ? 0.2 : 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            {/* High Contrast */}
            <View className="flex-row items-center py-3.5"
              accessible
              accessibilityRole="switch"
              accessibilityLabel="High contrast mode"
              accessibilityState={{ checked: highContrast }}
            >
              <View className="flex-1 mr-3">
                <Text className={`text-sm font-semibold ${textPrimary}`}>
                  High Contrast Mode
                </Text>
                <Text className={`text-xs ${textSecondary} mt-0.5`}>
                  Increase contrast for better visibility
                </Text>
              </View>
              <Switch
                value={highContrast}
                onValueChange={(v) => handleToggle(setHighContrast, v)}
                trackColor={{ false: "#CBD5E1", true: "#A5B4FC" }}
                thumbColor={highContrast ? "#4F46E5" : "#F1F5F9"}
              />
            </View>

            <View className={`h-px ${isDark ? "bg-slate-700" : "bg-slate-100"}`} />

            {/* Reduce Motion */}
            <View className="flex-row items-center py-3.5"
              accessible
              accessibilityRole="switch"
              accessibilityLabel="Reduce motion"
              accessibilityState={{ checked: reduceMotion }}
            >
              <View className="flex-1 mr-3">
                <Text className={`text-sm font-semibold ${textPrimary}`}>
                  Reduce Motion
                </Text>
                <Text className={`text-xs ${textSecondary} mt-0.5`}>
                  Minimize animations and transitions
                </Text>
              </View>
              <Switch
                value={reduceMotion}
                onValueChange={(v) => handleToggle(setReduceMotion, v)}
                trackColor={{ false: "#CBD5E1", true: "#A5B4FC" }}
                thumbColor={reduceMotion ? "#4F46E5" : "#F1F5F9"}
              />
            </View>
          </View>
        </Animated.View>

        {/* Font Size */}
        <Animated.View entering={FadeInDown.duration(400).delay(150)} className="mt-6">
          <Text className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-3 px-1`}>
            Font Size
          </Text>
          <View
            className={`${cardBg} rounded-2xl p-4 ${highContrast ? `border ${contrastBorder}` : ""}`}
            style={{
              shadowColor: isDark ? "#000" : "#64748B",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDark ? 0.2 : 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View className="flex-row gap-2">
              {FONT_SCALES.map((scale) => {
                const active = fontScale === scale.value;
                return (
                  <TouchableOpacity
                    key={scale.value}
                    className={`flex-1 py-3 items-center rounded-xl ${
                      active
                        ? "bg-primary-600"
                        : isDark ? "bg-slate-700" : "bg-slate-100"
                    }`}
                    onPress={() => handleFontScaleSelect(scale.value)}
                    activeOpacity={0.7}
                    accessible
                    accessibilityRole="radio"
                    accessibilityLabel={`Font size ${scale.label}`}
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      className={`text-[10px] font-semibold ${
                        active ? "text-white" : textSecondary
                      }`}
                    >
                      {scale.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Font size indicator */}
            <View className="flex-row items-center justify-center mt-3">
              <Text className={`text-xs ${textSecondary}`}>
                Scale: {fontScaleMultiplier.toFixed(2)}x
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Screen Reader */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)} className="mt-6">
          <Text className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-3 px-1`}>
            Screen Reader
          </Text>
          <View
            className={`${cardBg} rounded-2xl px-4 ${highContrast ? `border ${contrastBorder}` : ""}`}
            style={{
              shadowColor: isDark ? "#000" : "#64748B",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDark ? 0.2 : 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View className="flex-row items-center py-3.5"
              accessible
              accessibilityRole="switch"
              accessibilityLabel="Screen reader optimizations"
              accessibilityState={{ checked: screenReaderOptimizations }}
            >
              <View className="flex-1 mr-3">
                <Text className={`text-sm font-semibold ${textPrimary}`}>
                  Screen Reader Optimizations
                </Text>
                <Text className={`text-xs ${textSecondary} mt-0.5`}>
                  Enhanced labels and descriptions for VoiceOver/TalkBack
                </Text>
              </View>
              <Switch
                value={screenReaderOptimizations}
                onValueChange={(v) => handleToggle(setScreenReaderOptimizations, v)}
                trackColor={{ false: "#CBD5E1", true: "#A5B4FC" }}
                thumbColor={screenReaderOptimizations ? "#4F46E5" : "#F1F5F9"}
              />
            </View>
          </View>
        </Animated.View>

        {/* Preview */}
        <Animated.View entering={FadeInDown.duration(400).delay(250)} className="mt-6">
          <Text className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-3 px-1`}>
            Preview
          </Text>
          <View
            className={`${isDark ? "bg-indigo-900/30 border-indigo-800" : "bg-indigo-50 border-indigo-100"} border rounded-2xl p-4 ${highContrast ? `border-2 ${contrastBorder}` : ""}`}
          >
            <Text
              className={`font-bold ${isDark ? "text-indigo-200" : "text-indigo-900"} mb-2`}
              style={{ fontSize: 16 * fontScaleMultiplier }}
              accessible
              accessibilityLabel="Preview heading text at current font size"
            >
              Preview Heading
            </Text>
            <Text
              className={`${isDark ? "text-indigo-300/70" : "text-indigo-700"} leading-5`}
              style={{ fontSize: 14 * fontScaleMultiplier }}
              accessible
              accessibilityLabel="Preview body text at current font size"
            >
              This text shows how your content will appear with the current accessibility settings. Adjust the options above to customize your experience.
            </Text>
            <View className="flex-row gap-2 mt-3">
              <View
                className={`rounded-lg px-3 py-1.5 ${highContrast ? "bg-black dark:bg-white" : "bg-primary-600"}`}
              >
                <Text
                  className={`font-semibold ${highContrast ? "text-white dark:text-black" : "text-white"}`}
                  style={{ fontSize: 12 * fontScaleMultiplier }}
                >
                  Primary Button
                </Text>
              </View>
              <View
                className={`rounded-lg px-3 py-1.5 border ${highContrast ? `border-2 ${contrastBorder}` : isDark ? "border-indigo-700" : "border-indigo-300"}`}
              >
                <Text
                  className={`font-semibold ${isDark ? "text-indigo-300" : "text-indigo-600"}`}
                  style={{ fontSize: 12 * fontScaleMultiplier }}
                >
                  Secondary
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
