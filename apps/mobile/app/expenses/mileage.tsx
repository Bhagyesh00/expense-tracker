import { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Switch,
  Share,
  useColorScheme,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import BottomSheet, {
  BottomSheetView,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MileageTrip {
  id: string;
  date: string;
  from: string;
  to: string;
  distanceKm: number;
  ratePerKm: number;
  purpose: string;
  amountReimbursed: number;
  expenseCreated: boolean;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const DEFAULT_RATE = 14; // ₹/km (Indian govt rate)

const MOCK_TRIPS: MileageTrip[] = [
  {
    id: "1",
    date: "2026-03-27",
    from: "Home, Bandra",
    to: "Office, BKC",
    distanceKm: 12.5,
    ratePerKm: DEFAULT_RATE,
    purpose: "Office commute",
    amountReimbursed: 175,
    expenseCreated: true,
  },
  {
    id: "2",
    date: "2026-03-26",
    from: "Office, BKC",
    to: "Client Site, Nariman Point",
    distanceKm: 8.2,
    ratePerKm: DEFAULT_RATE,
    purpose: "Client meeting",
    amountReimbursed: 114.8,
    expenseCreated: false,
  },
  {
    id: "3",
    date: "2026-03-25",
    from: "Home, Bandra",
    to: "Airport, T2",
    distanceKm: 22.0,
    ratePerKm: DEFAULT_RATE,
    purpose: "Business travel",
    amountReimbursed: 308,
    expenseCreated: true,
  },
  {
    id: "4",
    date: "2026-03-24",
    from: "Office, BKC",
    to: "Supplier, Dharavi",
    distanceKm: 6.7,
    ratePerKm: DEFAULT_RATE,
    purpose: "Procurement visit",
    amountReimbursed: 93.8,
    expenseCreated: false,
  },
  {
    id: "5",
    date: "2026-03-23",
    from: "Home, Bandra",
    to: "Office, BKC",
    distanceKm: 12.5,
    ratePerKm: DEFAULT_RATE,
    purpose: "Office commute",
    amountReimbursed: 175,
    expenseCreated: true,
  },
];

// ---------------------------------------------------------------------------
// Swipeable trip row
// ---------------------------------------------------------------------------

function SwipeableTripRow({
  trip,
  onDelete,
  isDark,
}: {
  trip: MileageTrip;
  onDelete: (id: string) => void;
  isDark: boolean;
}) {
  const translateX = useSharedValue(0);
  const rowHeight = useSharedValue(1);
  const rowOpacity = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      if (e.translationX < 0) {
        translateX.value = Math.max(e.translationX, -100);
      }
    })
    .onEnd(() => {
      if (translateX.value < -60) {
        translateX.value = withSpring(-100);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const deleteStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, -50, -100], [0, 0.5, 1]),
    width: Math.abs(Math.min(translateX.value, 0)),
  }));
  const containerStyle = useAnimatedStyle(() => ({
    height: rowHeight.value === 1 ? undefined : rowHeight.value,
    opacity: rowOpacity.value,
    overflow: "hidden",
  }));

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Delete Trip",
      `Delete trip to "${trip.to}"?`,
      [
        {
          text: "Cancel",
          onPress: () => { translateX.value = withSpring(0); },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            rowHeight.value = withTiming(0, { duration: 300 });
            rowOpacity.value = withTiming(0, { duration: 300 });
            setTimeout(() => onDelete(trip.id), 300);
          },
        },
      ],
    );
  }, [trip, onDelete, translateX, rowHeight, rowOpacity]);

  const cardBg = isDark ? "bg-slate-800" : "bg-white";
  const borderColor = isDark ? "border-slate-700" : "border-slate-100";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <Animated.View style={containerStyle} className="mb-2">
      <View className="flex-row">
        <Animated.View
          style={deleteStyle}
          className="absolute right-0 top-0 bottom-0 bg-red-500 rounded-2xl items-center justify-center"
        >
          <TouchableOpacity
            onPress={handleDelete}
            className="flex-1 items-center justify-center px-4"
            activeOpacity={0.8}
          >
            <Text className="text-white text-xs font-bold">🗑</Text>
          </TouchableOpacity>
        </Animated.View>

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[rowStyle, { width: "100%" }]}
            className={`rounded-2xl p-4 border ${cardBg} ${borderColor}`}
          >
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1 mr-3">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <Text
                    className={`text-xs font-medium ${isDark ? "text-white" : "text-slate-900"}`}
                    numberOfLines={1}
                  >
                    {trip.from}
                  </Text>
                  <Text className={`text-xs ${textSecondary}`}>→</Text>
                  <Text
                    className={`text-xs font-medium ${isDark ? "text-white" : "text-slate-900"} flex-1`}
                    numberOfLines={1}
                  >
                    {trip.to}
                  </Text>
                </View>
                <Text className={`text-xs ${textSecondary}`}>
                  {trip.purpose}
                </Text>
              </View>
              <View className="items-end">
                <Text
                  className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}
                >
                  ₹{trip.amountReimbursed.toFixed(0)}
                </Text>
                <Text className={`text-[10px] ${textSecondary}`}>
                  {trip.distanceKm} km
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between">
              <Text className={`text-[11px] ${textSecondary}`}>
                {new Date(trip.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
              <View className="flex-row items-center gap-2">
                <Text className={`text-[10px] ${textSecondary}`}>
                  @₹{trip.ratePerKm}/km
                </Text>
                {trip.expenseCreated && (
                  <View className="bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-semibold text-green-700 dark:text-green-400">
                      Expense logged
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Log Trip Sheet
// ---------------------------------------------------------------------------

interface LogTripSheetProps {
  sheetRef: React.RefObject<BottomSheet>;
  defaultRate: number;
  isDark: boolean;
  onSave: (trip: Omit<MileageTrip, "id">) => void;
}

function LogTripSheet({ sheetRef, defaultRate, isDark, onSave }: LogTripSheetProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [distance, setDistance] = useState("");
  const [rate, setRate] = useState(String(defaultRate));
  const [purpose, setPurpose] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [createExpense, setCreateExpense] = useState(true);

  const amount = useMemo(() => {
    const d = parseFloat(distance);
    const r = parseFloat(rate);
    if (isNaN(d) || isNaN(r)) return 0;
    return d * r;
  }, [distance, rate]);

  const bgColor = isDark ? "#0F172A" : "#FFFFFF";
  const cardBg = isDark ? "bg-slate-800" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const inputBg = isDark
    ? "bg-slate-800 border-slate-700"
    : "bg-slate-50 border-slate-200";

  const handleSave = useCallback(() => {
    if (!from.trim()) {
      Alert.alert("Missing From", "Enter the starting location.");
      return;
    }
    if (!to.trim()) {
      Alert.alert("Missing Destination", "Enter the destination.");
      return;
    }
    const d = parseFloat(distance);
    if (isNaN(d) || d <= 0) {
      Alert.alert("Invalid Distance", "Enter a valid distance in km.");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({
      date: date.toISOString().split("T")[0],
      from: from.trim(),
      to: to.trim(),
      distanceKm: d,
      ratePerKm: parseFloat(rate) || defaultRate,
      purpose: purpose.trim() || "Business trip",
      amountReimbursed: amount,
      expenseCreated: createExpense,
    });
    // Reset
    setFrom("");
    setTo("");
    setDistance("");
    setPurpose("");
    setDate(new Date());
    sheetRef.current?.close();
  }, [from, to, distance, rate, purpose, date, amount, createExpense, defaultRate, onSave, sheetRef]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={[600]}
      enablePanDownToClose
      backgroundStyle={{
        borderRadius: 28,
        backgroundColor: bgColor,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: isDark ? 0.3 : 0.1,
        shadowRadius: 16,
        elevation: 16,
      }}
      handleIndicatorStyle={{
        backgroundColor: isDark ? "#475569" : "#CBD5E1",
        width: 40,
        height: 4,
        borderRadius: 2,
      }}
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className={`text-lg font-bold ${textPrimary} mb-1 text-center`}>
          Log a Trip
        </Text>
        <Text className={`text-xs ${textSecondary} mb-5 text-center`}>
          Track mileage for reimbursement
        </Text>

        {/* From */}
        <View className="mb-3">
          <Text className={`text-xs font-semibold ${textSecondary} mb-1.5`}>
            From
          </Text>
          <TextInput
            className={`border rounded-2xl px-4 py-3.5 text-sm ${textPrimary} ${inputBg}`}
            placeholder="Starting location"
            placeholderTextColor="#94A3B8"
            value={from}
            onChangeText={setFrom}
          />
        </View>

        {/* To */}
        <View className="mb-3">
          <Text className={`text-xs font-semibold ${textSecondary} mb-1.5`}>
            To
          </Text>
          <TextInput
            className={`border rounded-2xl px-4 py-3.5 text-sm ${textPrimary} ${inputBg}`}
            placeholder="Destination"
            placeholderTextColor="#94A3B8"
            value={to}
            onChangeText={setTo}
          />
        </View>

        {/* Distance + Rate */}
        <View className="flex-row gap-3 mb-3">
          <View className="flex-1">
            <Text className={`text-xs font-semibold ${textSecondary} mb-1.5`}>
              Distance (km)
            </Text>
            <TextInput
              className={`border rounded-2xl px-4 py-3.5 text-sm ${textPrimary} ${inputBg}`}
              placeholder="0.0"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              value={distance}
              onChangeText={setDistance}
            />
          </View>
          <View className="flex-1">
            <Text className={`text-xs font-semibold ${textSecondary} mb-1.5`}>
              Rate (₹/km)
            </Text>
            <TextInput
              className={`border rounded-2xl px-4 py-3.5 text-sm ${textPrimary} ${inputBg}`}
              placeholder={String(defaultRate)}
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              value={rate}
              onChangeText={setRate}
            />
          </View>
        </View>

        {/* Auto-calculated amount */}
        <View
          className={`${cardBg} rounded-2xl px-5 py-4 mb-3 items-center border ${
            isDark ? "border-slate-700" : "border-slate-200"
          }`}
        >
          <Text className={`text-xs ${textSecondary} mb-1`}>
            Calculated Amount
          </Text>
          <Text
            className={`text-3xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}
          >
            ₹{amount.toFixed(2)}
          </Text>
          {distance && rate && (
            <Text className={`text-xs ${textSecondary} mt-0.5`}>
              {distance} km × ₹{rate}/km
            </Text>
          )}
        </View>

        {/* Date */}
        <View className="mb-3">
          <Text className={`text-xs font-semibold ${textSecondary} mb-1.5`}>
            Date
          </Text>
          <TouchableOpacity
            className={`border rounded-2xl px-4 py-3.5 flex-row items-center justify-between ${inputBg}`}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text className={`text-sm ${textPrimary}`}>
              {date.toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Text>
            <Text className={textSecondary}>📅</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_event, selectedDate) => {
                setShowDatePicker(Platform.OS === "ios");
                if (selectedDate) setDate(selectedDate);
              }}
              maximumDate={new Date()}
            />
          )}
        </View>

        {/* Purpose */}
        <View className="mb-4">
          <Text className={`text-xs font-semibold ${textSecondary} mb-1.5`}>
            Purpose
          </Text>
          <TextInput
            className={`border rounded-2xl px-4 py-3.5 text-sm ${textPrimary} ${inputBg}`}
            placeholder="Office commute, client meeting..."
            placeholderTextColor="#94A3B8"
            value={purpose}
            onChangeText={setPurpose}
          />
        </View>

        {/* Create expense toggle */}
        <View
          className={`${cardBg} rounded-2xl px-4 py-4 mb-6 flex-row items-center justify-between border ${
            isDark ? "border-slate-700" : "border-slate-200"
          }`}
        >
          <View className="flex-1 mr-3">
            <Text className={`text-sm font-semibold ${textPrimary}`}>
              Also Create Expense
            </Text>
            <Text className={`text-xs ${textSecondary} mt-0.5`}>
              Log this as a transport expense
            </Text>
          </View>
          <Switch
            value={createExpense}
            onValueChange={(v) => {
              setCreateExpense(v);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            trackColor={{
              false: isDark ? "#475569" : "#CBD5E1",
              true: "#A5B4FC",
            }}
            thumbColor={createExpense ? "#4F46E5" : isDark ? "#64748B" : "#F1F5F9"}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          className="bg-primary-600 rounded-2xl py-4 items-center"
          activeOpacity={0.8}
          style={{
            shadowColor: "#4F46E5",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Text className="text-white font-bold text-base">Save Trip</Text>
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function MileageTrackerScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [trips, setTrips] = useState<MileageTrip[]>(MOCK_TRIPS);
  const [refreshing, setRefreshing] = useState(false);
  const sheetRef = useRef<BottomSheet>(null);

  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const cardBg = isDark ? "bg-slate-800" : "bg-white";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const borderColor = isDark ? "border-slate-800" : "border-slate-100";

  // This month summary
  const thisMonth = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTrips = trips.filter((t) => new Date(t.date) >= monthStart);
    const totalKm = monthTrips.reduce((sum, t) => sum + t.distanceKm, 0);
    const totalAmount = monthTrips.reduce((sum, t) => sum + t.amountReimbursed, 0);
    return { trips: monthTrips.length, totalKm, totalAmount };
  }, [trips]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setRefreshing(false);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleSaveTrip = useCallback((trip: Omit<MileageTrip, "id">) => {
    const newTrip: MileageTrip = {
      ...trip,
      id: String(Date.now()),
    };
    setTrips((prev) => [newTrip, ...prev]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleExport = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const header = "Date,From,To,Distance(km),Rate(₹/km),Amount(₹),Purpose\n";
    const rows = trips
      .map(
        (t) =>
          `${t.date},"${t.from}","${t.to}",${t.distanceKm},${t.ratePerKm},${t.amountReimbursed.toFixed(2)},"${t.purpose}"`,
      )
      .join("\n");

    try {
      await Share.share({
        message: header + rows,
        title: "Mileage Log Export",
      });
    } catch {
      // User cancelled
    }
  }, [trips]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className={`flex-1 ${bgColor}`}>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          className={`flex-row items-center justify-between px-5 py-3 border-b ${borderColor} ${
            isDark ? "bg-slate-900" : "bg-white"
          }`}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className={`w-9 h-9 rounded-xl items-center justify-center ${
              isDark ? "bg-slate-800" : "bg-slate-100"
            }`}
          >
            <Text className={textPrimary}>←</Text>
          </TouchableOpacity>
          <Text className={`text-lg font-bold ${textPrimary}`}>
            Mileage Tracker
          </Text>
          <TouchableOpacity
            onPress={handleExport}
            activeOpacity={0.7}
            className={`w-9 h-9 rounded-xl items-center justify-center ${
              isDark ? "bg-slate-800" : "bg-slate-100"
            }`}
          >
            <Text className="text-sm">↗</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Summary Card */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          className="px-5 pt-4 pb-2"
        >
          <View
            className={`${cardBg} rounded-2xl p-5 border ${borderColor}`}
            style={{
              shadowColor: isDark ? "#000" : "#64748B",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.15 : 0.06,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <Text
              className={`text-xs font-bold uppercase tracking-wider ${textSecondary} mb-3`}
            >
              This Month
            </Text>
            <View className="flex-row gap-4">
              <View className="flex-1 items-center">
                <Text
                  className={`text-2xl font-bold ${textPrimary}`}
                >
                  {thisMonth.totalKm.toFixed(1)}
                </Text>
                <Text className={`text-xs ${textSecondary} mt-0.5`}>km driven</Text>
              </View>
              <View
                className={`w-px ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
              />
              <View className="flex-1 items-center">
                <Text className="text-2xl font-bold text-primary-600">
                  ₹{thisMonth.totalAmount.toFixed(0)}
                </Text>
                <Text className={`text-xs ${textSecondary} mt-0.5`}>
                  reimbursable
                </Text>
              </View>
              <View
                className={`w-px ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
              />
              <View className="flex-1 items-center">
                <Text
                  className={`text-2xl font-bold ${textPrimary}`}
                >
                  {thisMonth.trips}
                </Text>
                <Text className={`text-xs ${textSecondary} mt-0.5`}>trips</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Trips List */}
        <FlatList
          className="flex-1 mt-3"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 100,
          }}
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SwipeableTripRow
              trip={item}
              onDelete={handleDelete}
              isDark={isDark}
            />
          )}
          ListHeaderComponent={
            <Animated.View
              entering={FadeIn.duration(300)}
              className="mb-2"
            >
              <Text
                className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}
              >
                {trips.length} Trip{trips.length !== 1 ? "s" : ""} — Swipe Left to Delete
              </Text>
            </Animated.View>
          }
          ListEmptyComponent={
            <Animated.View
              entering={FadeInDown.duration(500).delay(200)}
              className="items-center py-20"
            >
              <Text className="text-5xl mb-4">🚗</Text>
              <Text className={`text-lg font-bold ${textPrimary} mb-1`}>
                No Trips Yet
              </Text>
              <Text className={`text-sm ${textSecondary} text-center px-8`}>
                Tap + to log your first mileage trip
              </Text>
            </Animated.View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4F46E5"
              colors={["#4F46E5"]}
            />
          }
          showsVerticalScrollIndicator={false}
        />

        {/* FAB */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(400)}
          className="absolute bottom-8 right-5"
          style={{
            shadowColor: "#4F46E5",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 10,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              sheetRef.current?.expand();
            }}
            activeOpacity={0.85}
            className="flex-row items-center gap-2 bg-primary-600 rounded-full px-5 py-4"
          >
            <Text className="text-white text-lg font-light leading-none">+</Text>
            <Text className="text-white text-sm font-bold">Log Trip</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Log Trip Bottom Sheet */}
        <LogTripSheet
          sheetRef={sheetRef}
          defaultRate={DEFAULT_RATE}
          isDark={isDark}
          onSave={handleSaveTrip}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
