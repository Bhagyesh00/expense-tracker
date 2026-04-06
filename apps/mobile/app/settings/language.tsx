import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useI18n } from "@/hooks/use-i18n";

// ---- Types ----

type DateFormatOption = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
type NumberFormatOption = "indian" | "western";

interface LanguageOption {
  code: string;
  nativeName: string;
  englishName: string;
}

// ---- Data ----

const LANGUAGES: LanguageOption[] = [
  { code: "en", nativeName: "English", englishName: "English" },
  { code: "hi", nativeName: "\u0939\u093F\u0928\u094D\u0926\u0940", englishName: "Hindi" },
  { code: "ta", nativeName: "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD", englishName: "Tamil" },
  { code: "te", nativeName: "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41", englishName: "Telugu" },
  { code: "kn", nativeName: "\u0C95\u0CA8\u0CCD\u0CA8\u0CA1", englishName: "Kannada" },
  { code: "ml", nativeName: "\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02", englishName: "Malayalam" },
  { code: "bn", nativeName: "\u09AC\u09BE\u0982\u09B2\u09BE", englishName: "Bengali" },
  { code: "mr", nativeName: "\u092E\u0930\u093E\u0920\u0940", englishName: "Marathi" },
  { code: "gu", nativeName: "\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0", englishName: "Gujarati" },
  { code: "pa", nativeName: "\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40", englishName: "Punjabi" },
  { code: "es", nativeName: "Espa\u00F1ol", englishName: "Spanish" },
  { code: "fr", nativeName: "Fran\u00E7ais", englishName: "French" },
  { code: "de", nativeName: "Deutsch", englishName: "German" },
  { code: "ja", nativeName: "\u65E5\u672C\u8A9E", englishName: "Japanese" },
  { code: "zh", nativeName: "\u4E2D\u6587", englishName: "Chinese" },
];

const DATE_FORMATS: { value: DateFormatOption; label: string; example: string }[] = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY", example: "30/03/2026" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY", example: "03/30/2026" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD", example: "2026-03-30" },
];

const NUMBER_FORMATS: { value: NumberFormatOption; label: string; example: string }[] = [
  { value: "indian", label: "Indian (1,00,000)", example: "\u20B91,00,000.00" },
  { value: "western", label: "Western (1,000,000)", example: "\u20B9100,000.00" },
];

// ---- Main Screen ----

export default function LanguageScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { locale, setLocale } = useI18n();

  const [selectedLanguage, setSelectedLanguage] = useState(locale || "en");
  const [dateFormat, setDateFormat] = useState<DateFormatOption>("DD/MM/YYYY");
  const [numberFormat, setNumberFormat] = useState<NumberFormatOption>("indian");

  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardBg = isDark ? "bg-slate-800" : "bg-white";

  function handleSelectLanguage(code: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLanguage(code);
    setLocale(code);
  }

  function handleSelectDateFormat(format: DateFormatOption) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDateFormat(format);
  }

  function handleSelectNumberFormat(format: NumberFormatOption) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNumberFormat(format);
  }

  const selectedDateExample = DATE_FORMATS.find((f) => f.value === dateFormat)?.example ?? "";
  const selectedNumberExample = NUMBER_FORMATS.find((f) => f.value === numberFormat)?.example ?? "";

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`} edges={["top"]}>
      {/* Header */}
      <View
        className={`flex-row items-center justify-between px-5 py-3.5 border-b ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"}`}
      >
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text className="text-primary-600 text-base font-medium">{"<"} Back</Text>
        </TouchableOpacity>
        <Text className={`text-lg font-bold ${textPrimary}`}>Language & Region</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-4 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Language Selection */}
        <Animated.View entering={FadeInDown.duration(400).delay(50)}>
          <Text className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-3 px-1`}>
            Select Language
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
            {LANGUAGES.map((lang, index) => {
              const isSelected = selectedLanguage === lang.code;
              return (
                <View key={lang.code}>
                  <TouchableOpacity
                    className="flex-row items-center py-3.5"
                    onPress={() => handleSelectLanguage(lang.code)}
                    activeOpacity={0.7}
                  >
                    <View className="flex-1">
                      <Text className={`text-sm font-semibold ${textPrimary}`}>
                        {lang.nativeName}
                      </Text>
                      <Text className={`text-xs ${textSecondary} mt-0.5`}>
                        {lang.englishName}
                      </Text>
                    </View>
                    {isSelected && (
                      <View className="w-6 h-6 rounded-full bg-primary-600 items-center justify-center">
                        <Text className="text-white text-xs font-bold">{"\u2713"}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {index < LANGUAGES.length - 1 && (
                    <View className={`h-px ${isDark ? "bg-slate-700" : "bg-slate-100"}`} />
                  )}
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Date Format */}
        <Animated.View entering={FadeInDown.duration(400).delay(150)} className="mt-6">
          <Text className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-3 px-1`}>
            Date Format
          </Text>
          <View
            className={`${cardBg} rounded-2xl p-1`}
            style={{
              shadowColor: isDark ? "#000" : "#64748B",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDark ? 0.2 : 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View className="flex-row">
              {DATE_FORMATS.map((format) => {
                const active = dateFormat === format.value;
                return (
                  <TouchableOpacity
                    key={format.value}
                    className={`flex-1 py-3 items-center rounded-xl ${active ? (isDark ? "bg-slate-700" : "bg-primary-50") : ""}`}
                    onPress={() => handleSelectDateFormat(format.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={`text-xs font-semibold ${active ? "text-primary-600" : textSecondary}`}
                    >
                      {format.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* Number Format */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)} className="mt-6">
          <Text className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-3 px-1`}>
            Number Format
          </Text>
          <View
            className={`${cardBg} rounded-2xl p-1`}
            style={{
              shadowColor: isDark ? "#000" : "#64748B",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDark ? 0.2 : 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View className="flex-row">
              {NUMBER_FORMATS.map((format) => {
                const active = numberFormat === format.value;
                return (
                  <TouchableOpacity
                    key={format.value}
                    className={`flex-1 py-3 items-center rounded-xl ${active ? (isDark ? "bg-slate-700" : "bg-primary-50") : ""}`}
                    onPress={() => handleSelectNumberFormat(format.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={`text-xs font-semibold ${active ? "text-primary-600" : textSecondary}`}
                    >
                      {format.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* Preview Section */}
        <Animated.View entering={FadeInDown.duration(400).delay(250)} className="mt-6">
          <Text className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-3 px-1`}>
            Preview
          </Text>
          <View
            className={`${isDark ? "bg-indigo-900/30 border-indigo-800" : "bg-indigo-50 border-indigo-100"} border rounded-2xl p-4`}
          >
            <View className="gap-2.5">
              <View className="flex-row items-center justify-between">
                <Text className={`text-xs ${isDark ? "text-indigo-300/70" : "text-indigo-600"}`}>
                  Language
                </Text>
                <Text className={`text-sm font-semibold ${isDark ? "text-indigo-200" : "text-indigo-800"}`}>
                  {LANGUAGES.find((l) => l.code === selectedLanguage)?.nativeName ?? "English"}
                </Text>
              </View>
              <View className={`h-px ${isDark ? "bg-indigo-800" : "bg-indigo-200"}`} />
              <View className="flex-row items-center justify-between">
                <Text className={`text-xs ${isDark ? "text-indigo-300/70" : "text-indigo-600"}`}>
                  Date
                </Text>
                <Text className={`text-sm font-semibold ${isDark ? "text-indigo-200" : "text-indigo-800"}`}>
                  {selectedDateExample}
                </Text>
              </View>
              <View className={`h-px ${isDark ? "bg-indigo-800" : "bg-indigo-200"}`} />
              <View className="flex-row items-center justify-between">
                <Text className={`text-xs ${isDark ? "text-indigo-300/70" : "text-indigo-600"}`}>
                  Currency
                </Text>
                <Text className={`text-sm font-semibold ${isDark ? "text-indigo-200" : "text-indigo-800"}`}>
                  {selectedNumberExample}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
