import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  Modal,
} from "react-native";
import Animated, { FadeIn, FadeInDown, SlideInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DatePickerSheetProps {
  visible: boolean;
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DatePickerSheet({
  visible,
  selectedDate,
  onSelect,
  onClose,
}: DatePickerSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const [tempDate, setTempDate] = useState(selectedDate);

  const daysInMonth = useMemo(() => getDaysInMonth(viewYear, viewMonth), [viewYear, viewMonth]);
  const firstDay = useMemo(() => getFirstDayOfMonth(viewYear, viewMonth), [viewYear, viewMonth]);

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    // Empty slots for days before the first
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [daysInMonth, firstDay]);

  const goToPrevMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const goToNextMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth]);

  const handleDayPress = useCallback(
    (day: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newDate = new Date(viewYear, viewMonth, day);
      setTempDate(newDate);
    },
    [viewYear, viewMonth],
  );

  const handleConfirm = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(tempDate);
    onClose();
  }, [tempDate, onSelect, onClose]);

  const handleQuickSelect = useCallback(
    (daysAgo: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      setTempDate(date);
      setViewYear(date.getFullYear());
      setViewMonth(date.getMonth());
    },
    [],
  );

  const bgColor = isDark ? "bg-slate-900" : "bg-white";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={FadeIn.duration(200)}
        className="flex-1 justify-end bg-black/50"
      >
        <TouchableOpacity className="flex-1" onPress={onClose} activeOpacity={1} />
        <Animated.View
          entering={SlideInDown.duration(300).springify().damping(18)}
          className={`${bgColor} rounded-t-3xl pb-8`}
        >
          {/* Handle */}
          <View className="items-center pt-3 pb-2">
            <View
              className={`w-10 h-1 rounded-full ${isDark ? "bg-slate-700" : "bg-slate-300"}`}
            />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pb-3">
            <Text className={`text-lg font-bold ${textPrimary}`}>Select Date</Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-primary-600 font-medium">Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Quick presets */}
          <View className="flex-row px-5 mb-4 gap-2">
            {[
              { label: "Today", days: 0 },
              { label: "Yesterday", days: 1 },
            ].map(({ label, days }) => {
              const presetDate = new Date();
              presetDate.setDate(presetDate.getDate() - days);
              const isActive = isSameDay(tempDate, presetDate);

              return (
                <TouchableOpacity
                  key={label}
                  onPress={() => handleQuickSelect(days)}
                  className={`px-4 py-2 rounded-xl ${
                    isActive
                      ? "bg-primary-600"
                      : isDark
                        ? "bg-slate-800"
                        : "bg-slate-100"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      isActive ? "text-white" : textSecondary
                    }`}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Month navigation */}
          <View className="flex-row items-center justify-between px-5 mb-3">
            <TouchableOpacity
              onPress={goToPrevMonth}
              className={`w-9 h-9 rounded-xl items-center justify-center ${
                isDark ? "bg-slate-800" : "bg-slate-100"
              }`}
              activeOpacity={0.7}
            >
              <Text className={textPrimary}>←</Text>
            </TouchableOpacity>
            <Text className={`text-base font-bold ${textPrimary}`}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity
              onPress={goToNextMonth}
              className={`w-9 h-9 rounded-xl items-center justify-center ${
                isDark ? "bg-slate-800" : "bg-slate-100"
              }`}
              activeOpacity={0.7}
            >
              <Text className={textPrimary}>→</Text>
            </TouchableOpacity>
          </View>

          {/* Day headers */}
          <View className="flex-row px-5 mb-1">
            {DAYS.map((day) => (
              <View key={day} className="flex-1 items-center py-1">
                <Text className={`text-xs font-semibold ${textSecondary}`}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View className="flex-row flex-wrap px-5 mb-4">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <View key={`empty-${index}`} className="w-[14.28%] h-10" />;
              }

              const cellDate = new Date(viewYear, viewMonth, day);
              const isSelected = isSameDay(cellDate, tempDate);
              const isTodayDate = isToday(cellDate);
              const isFuture = cellDate > new Date();

              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => handleDayPress(day)}
                  disabled={isFuture}
                  className="w-[14.28%] h-10 items-center justify-center"
                  activeOpacity={0.7}
                >
                  <View
                    className={`w-9 h-9 rounded-full items-center justify-center ${
                      isSelected
                        ? "bg-primary-600"
                        : isTodayDate
                          ? isDark
                            ? "bg-slate-700"
                            : "bg-slate-200"
                          : ""
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        isSelected
                          ? "text-white"
                          : isFuture
                            ? isDark
                              ? "text-slate-600"
                              : "text-slate-300"
                            : textPrimary
                      }`}
                    >
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Confirm button */}
          <View className="px-5">
            <TouchableOpacity
              onPress={handleConfirm}
              className="bg-primary-600 rounded-2xl py-4 items-center"
              activeOpacity={0.8}
            >
              <Text className="text-white text-base font-bold">
                Done -{" "}
                {tempDate.toLocaleDateString("en-IN", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
