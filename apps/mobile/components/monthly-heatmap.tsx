import { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

export interface DailySpend {
  date: string; // "YYYY-MM-DD"
  amount: number;
}

interface MonthlyHeatmapProps {
  data: DailySpend[];
  isLoading?: boolean;
  currency?: string;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatAmount(amount: number, currency: string = "INR"): string {
  const symbols: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };
  const symbol = symbols[currency] ?? currency + " ";
  return `${symbol}${amount.toLocaleString("en-IN")}`;
}

function getMonthName(month: number): string {
  const names = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return names[month] ?? "";
}

type IntensityLevel = "none" | "low" | "medium" | "high" | "extreme";

function getIntensity(amount: number, thresholds: { low: number; medium: number; high: number }): IntensityLevel {
  if (amount <= 0) return "none";
  if (amount <= thresholds.low) return "low";
  if (amount <= thresholds.medium) return "medium";
  if (amount <= thresholds.high) return "high";
  return "extreme";
}

function getIntensityColor(intensity: IntensityLevel, isDark: boolean): string {
  const colors: Record<IntensityLevel, string> = {
    none: isDark ? "#334155" : "#E2E8F0",
    low: isDark ? "#166534" : "#BBF7D0",
    medium: isDark ? "#854D0E" : "#FDE68A",
    high: isDark ? "#C2410C" : "#FDBA74",
    extreme: isDark ? "#991B1B" : "#FCA5A5",
  };
  return colors[intensity];
}

function SkeletonHeatmap() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <View className="py-4">
      <View className="flex-row justify-center mb-4">
        <View
          className={`w-32 h-4 rounded ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
        />
      </View>
      {[0, 1, 2, 3, 4].map((row) => (
        <View key={row} className="flex-row justify-center mb-1.5">
          {[0, 1, 2, 3, 4, 5, 6].map((col) => (
            <View
              key={col}
              className={`w-8 h-8 rounded-lg mx-0.5 ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export default function MonthlyHeatmap({
  data,
  isLoading,
  currency = "INR",
}: MonthlyHeatmapProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<{
    date: string;
    amount: number;
  } | null>(null);

  // Build a map of date => amount
  const spendMap = useMemo(() => {
    const map = new Map<string, number>();
    if (data) {
      for (const item of data) {
        map.set(item.date, (map.get(item.date) ?? 0) + item.amount);
      }
    }
    return map;
  }, [data]);

  // Compute thresholds from data
  const thresholds = useMemo(() => {
    const amounts = Array.from(spendMap.values()).filter((a) => a > 0);
    if (amounts.length === 0) return { low: 500, medium: 1500, high: 3000 };
    amounts.sort((a, b) => a - b);
    const p25 = amounts[Math.floor(amounts.length * 0.25)] ?? 500;
    const p50 = amounts[Math.floor(amounts.length * 0.5)] ?? 1500;
    const p75 = amounts[Math.floor(amounts.length * 0.75)] ?? 3000;
    return { low: p25, medium: p50, high: p75 };
  }, [spendMap]);

  // Build calendar grid for the month
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const rows: (number | null)[][] = [];
    let currentRow: (number | null)[] = [];

    // Fill leading empty cells
    for (let i = 0; i < startDayOfWeek; i++) {
      currentRow.push(null);
    }

    // Fill days
    for (let day = 1; day <= daysInMonth; day++) {
      currentRow.push(day);
      if (currentRow.length === 7) {
        rows.push(currentRow);
        currentRow = [];
      }
    }

    // Fill trailing empty cells
    if (currentRow.length > 0) {
      while (currentRow.length < 7) {
        currentRow.push(null);
      }
      rows.push(currentRow);
    }

    return rows;
  }, [currentMonth, currentYear]);

  function navigateMonth(direction: -1 | 1) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDay(null);
    let newMonth = currentMonth + direction;
    let newYear = currentYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  }

  function formatDateKey(day: number): string {
    const m = String(currentMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${currentYear}-${m}-${d}`;
  }

  if (isLoading) {
    return <SkeletonHeatmap />;
  }

  const isCurrentOrFuture =
    currentYear > today.getFullYear() ||
    (currentYear === today.getFullYear() && currentMonth >= today.getMonth());

  return (
    <Animated.View entering={FadeIn.duration(500)}>
      {/* Header with navigation */}
      <View className="flex-row items-center justify-between mb-4 px-2">
        <TouchableOpacity
          onPress={() => navigateMonth(-1)}
          className={`w-8 h-8 rounded-lg items-center justify-center ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
          activeOpacity={0.7}
        >
          <Text
            className={`text-base font-bold ${isDark ? "text-slate-300" : "text-slate-600"}`}
          >
            ‹
          </Text>
        </TouchableOpacity>

        <Text
          className={`text-base font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
        >
          {getMonthName(currentMonth)} {currentYear}
        </Text>

        <TouchableOpacity
          onPress={() => navigateMonth(1)}
          className={`w-8 h-8 rounded-lg items-center justify-center ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
          activeOpacity={0.7}
          disabled={isCurrentOrFuture}
          style={{ opacity: isCurrentOrFuture ? 0.3 : 1 }}
        >
          <Text
            className={`text-base font-bold ${isDark ? "text-slate-300" : "text-slate-600"}`}
          >
            ›
          </Text>
        </TouchableOpacity>
      </View>

      {/* Day of week labels */}
      <View className="flex-row justify-center mb-1.5">
        {DAY_LABELS.map((day) => (
          <View key={day} className="w-9 mx-0.5 items-center">
            <Text
              className={`text-xs font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}
            >
              {day.charAt(0)}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {calendarGrid.map((row, rowIndex) => (
        <View key={rowIndex} className="flex-row justify-center mb-1">
          {row.map((day, colIndex) => {
            if (day === null) {
              return <View key={`empty-${colIndex}`} className="w-9 h-9 mx-0.5" />;
            }

            const dateKey = formatDateKey(day);
            const amount = spendMap.get(dateKey) ?? 0;
            const intensity = getIntensity(amount, thresholds);
            const bgColor = getIntensityColor(intensity, isDark);
            const isToday =
              day === today.getDate() &&
              currentMonth === today.getMonth() &&
              currentYear === today.getFullYear();
            const isSelected = selectedDay?.date === dateKey;

            return (
              <TouchableOpacity
                key={`day-${day}`}
                className={`w-9 h-9 rounded-lg mx-0.5 items-center justify-center ${
                  isSelected ? "border-2 border-primary-500" : ""
                } ${isToday ? "border border-primary-400" : ""}`}
                style={{ backgroundColor: bgColor }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (isSelected) {
                    setSelectedDay(null);
                  } else {
                    setSelectedDay({ date: dateKey, amount });
                  }
                }}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-xs font-medium ${
                    intensity === "none"
                      ? isDark
                        ? "text-slate-500"
                        : "text-slate-400"
                      : intensity === "extreme" || intensity === "high"
                        ? isDark
                          ? "text-red-100"
                          : "text-red-800"
                        : isDark
                          ? "text-slate-200"
                          : "text-slate-700"
                  }`}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Selected day tooltip */}
      {selectedDay && (
        <View
          className={`mt-3 mx-2 p-3 rounded-xl ${isDark ? "bg-slate-700" : "bg-slate-100"}`}
        >
          <View className="flex-row items-center justify-between">
            <Text
              className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}
            >
              {new Date(selectedDay.date + "T00:00:00").toLocaleDateString(
                "en-IN",
                {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                }
              )}
            </Text>
            <Text
              className={`text-sm font-bold ${
                selectedDay.amount > 0
                  ? isDark
                    ? "text-white"
                    : "text-slate-900"
                  : isDark
                    ? "text-slate-400"
                    : "text-slate-500"
              }`}
            >
              {selectedDay.amount > 0
                ? formatAmount(selectedDay.amount, currency)
                : "No spending"}
            </Text>
          </View>
        </View>
      )}

      {/* Legend */}
      <View className="flex-row items-center justify-center mt-4 gap-2">
        <Text
          className={`text-xs mr-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}
        >
          Less
        </Text>
        {(["none", "low", "medium", "high", "extreme"] as IntensityLevel[]).map(
          (level) => (
            <View
              key={level}
              className="w-4 h-4 rounded"
              style={{ backgroundColor: getIntensityColor(level, isDark) }}
            />
          )
        )}
        <Text
          className={`text-xs ml-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}
        >
          More
        </Text>
      </View>
    </Animated.View>
  );
}
