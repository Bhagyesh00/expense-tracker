import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Platform,
  useColorScheme,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import DateTimePicker from "@react-native-community/datetimepicker";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PerDiemData {
  enabled: boolean;
  startDate: Date;
  endDate: Date;
  dailyRate: string;
  city: string;
  totalAmount: number;
  totalDays: number;
}

interface PerDiemToggleProps {
  value: PerDiemData;
  onChange: (data: PerDiemData) => void;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function daysBetween(start: Date, end: Date): number {
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
}

// ---------------------------------------------------------------------------
// Date Picker Row
// ---------------------------------------------------------------------------

function DateRow({
  label,
  date,
  onPress,
  isDark,
}: {
  label: string;
  date: Date;
  onPress: () => void;
  isDark: boolean;
}) {
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const inputBg = isDark ? "bg-slate-700 border-slate-600" : "bg-white border-slate-200";

  return (
    <View className="flex-1">
      <Text className={`text-xs ${textSecondary} mb-1`}>{label}</Text>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className={`border rounded-xl px-3 py-2.5 flex-row items-center justify-between ${inputBg}`}
      >
        <Text className={`text-xs font-medium ${isDark ? "text-white" : "text-slate-900"}`}>
          {date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </Text>
        <Text className={`text-xs ${textSecondary}`}>📅</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PerDiemToggle({ value, onChange }: PerDiemToggleProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const expandHeight = useSharedValue(0);
  const expandOpacity = useSharedValue(0);

  const expandStyle = useAnimatedStyle(() => ({
    maxHeight: expandHeight.value,
    opacity: expandOpacity.value,
    overflow: "hidden",
  }));

  const handleToggle = useCallback(
    (enabled: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (enabled) {
        expandHeight.value = withSpring(600, { damping: 20 });
        expandOpacity.value = withTiming(1, { duration: 300 });
      } else {
        expandHeight.value = withTiming(0, { duration: 250 });
        expandOpacity.value = withTiming(0, { duration: 200 });
      }
      onChange({ ...value, enabled });
    },
    [value, onChange, expandHeight, expandOpacity],
  );

  const days = useMemo(
    () => daysBetween(value.startDate, value.endDate),
    [value.startDate, value.endDate],
  );

  const totalAmount = useMemo(() => {
    const rate = parseFloat(value.dailyRate);
    if (isNaN(rate) || rate <= 0) return 0;
    return days * rate;
  }, [days, value.dailyRate]);

  const handleStartDateChange = useCallback(
    (_event: any, selectedDate?: Date) => {
      setShowStartPicker(Platform.OS === "ios");
      if (selectedDate) {
        const newEnd =
          selectedDate > value.endDate ? selectedDate : value.endDate;
        onChange({ ...value, startDate: selectedDate, endDate: newEnd, totalAmount, totalDays: days });
      }
    },
    [value, onChange, totalAmount, days],
  );

  const handleEndDateChange = useCallback(
    (_event: any, selectedDate?: Date) => {
      setShowEndPicker(Platform.OS === "ios");
      if (selectedDate && selectedDate >= value.startDate) {
        onChange({ ...value, endDate: selectedDate, totalAmount, totalDays: days });
      }
    },
    [value, onChange, totalAmount, days],
  );

  const cardBg = isDark ? "bg-slate-800" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const borderColor = isDark ? "border-slate-700" : "border-slate-200";
  const inputBg = isDark ? "bg-slate-700 border-slate-600" : "bg-white border-slate-200";

  return (
    <View className={`${cardBg} rounded-2xl px-4 py-4 border ${borderColor}`}>
      {/* Toggle row */}
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <Text className={`text-sm font-semibold ${textPrimary}`}>
            Per-Diem Expense
          </Text>
          <Text className={`text-xs ${textSecondary} mt-0.5`}>
            Daily allowance across multiple days
          </Text>
        </View>
        <Switch
          value={value.enabled}
          onValueChange={handleToggle}
          trackColor={{
            false: isDark ? "#475569" : "#CBD5E1",
            true: "#A5B4FC",
          }}
          thumbColor={value.enabled ? "#4F46E5" : isDark ? "#64748B" : "#F1F5F9"}
        />
      </View>

      {/* Expanded content */}
      <Animated.View style={expandStyle}>
        <View
          className={`pt-4 mt-3 border-t ${isDark ? "border-slate-700" : "border-slate-200"}`}
        >
          {/* Date range */}
          <View className="flex-row gap-3 mb-4">
            <DateRow
              label="Start Date"
              date={value.startDate}
              onPress={() => setShowStartPicker(true)}
              isDark={isDark}
            />
            <DateRow
              label="End Date"
              date={value.endDate}
              onPress={() => setShowEndPicker(true)}
              isDark={isDark}
            />
          </View>

          {showStartPicker && (
            <DateTimePicker
              value={value.startDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleStartDateChange}
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              value={value.endDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleEndDateChange}
              minimumDate={value.startDate}
            />
          )}

          {/* Days calculated */}
          <View
            className={`flex-row items-center justify-center gap-2 mb-4 py-2 rounded-xl ${
              isDark ? "bg-slate-700" : "bg-primary-50"
            }`}
          >
            <Text className="text-lg">📆</Text>
            <Text
              className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-primary-700"}`}
            >
              {days} day{days !== 1 ? "s" : ""}
            </Text>
          </View>

          {/* Daily rate */}
          <View className="mb-4">
            <Text className={`text-xs font-semibold ${textSecondary} mb-1.5`}>
              Daily Rate (₹/day)
            </Text>
            <View
              className={`flex-row items-center border rounded-xl px-3 ${inputBg}`}
            >
              <Text
                className={`text-base font-semibold ${textSecondary} mr-2`}
              >
                ₹
              </Text>
              <TextInput
                className={`flex-1 py-3 text-base font-semibold ${textPrimary}`}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                value={value.dailyRate}
                onChangeText={(text) =>
                  onChange({ ...value, dailyRate: text, totalAmount, totalDays: days })
                }
              />
              <Text className={`text-xs ${textSecondary}`}>/day</Text>
            </View>
          </View>

          {/* Auto-calculated total */}
          {totalAmount > 0 && (
            <Animated.View
              entering={FadeInDown.duration(300)}
              className={`flex-row items-center justify-between px-4 py-3 rounded-xl mb-4 ${
                isDark ? "bg-slate-700" : "bg-green-50"
              } border ${isDark ? "border-slate-600" : "border-green-100"}`}
            >
              <View>
                <Text
                  className={`text-xs font-semibold ${
                    isDark ? "text-slate-300" : "text-green-700"
                  }`}
                >
                  Total Per Diem
                </Text>
                <Text
                  className={`text-xs ${isDark ? "text-slate-500" : "text-green-500"} mt-0.5`}
                >
                  {days}d × ₹{value.dailyRate || "0"}
                </Text>
              </View>
              <Text
                className={`text-xl font-bold ${
                  isDark ? "text-white" : "text-green-700"
                }`}
              >
                ₹{totalAmount.toLocaleString("en-IN")}
              </Text>
            </Animated.View>
          )}

          {/* City / Location */}
          <View>
            <Text className={`text-xs font-semibold ${textSecondary} mb-1.5`}>
              City / Location
            </Text>
            <TextInput
              className={`border rounded-xl px-3 py-3 text-sm ${textPrimary} ${inputBg}`}
              placeholder="e.g. Mumbai, Delhi"
              placeholderTextColor="#94A3B8"
              value={value.city}
              onChangeText={(text) => onChange({ ...value, city: text })}
            />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
