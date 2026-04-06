import { useState, useCallback, forwardRef, useImperativeHandle, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import BottomSheet, {
  BottomSheetView,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import DateTimePicker from "@react-native-community/datetimepicker";
import ContactSelector, { type Contact } from "@/components/contact-selector";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecurringInterval = "weekly" | "monthly" | "quarterly" | "yearly";

export interface RecurringPayment {
  id: string;
  contactId: string;
  contactName: string;
  direction: "give" | "receive";
  amount: number;
  currency: string;
  interval: RecurringInterval;
  startDate: string;
  endDate: string | null;
  autoGenerate: boolean;
  isActive: boolean;
  nextDueDate: string;
}

export interface RecurringPaymentFormRef {
  open: (existing?: RecurringPayment) => void;
  close: () => void;
}

interface RecurringPaymentFormProps {
  contacts: Contact[];
  onSave: (data: Omit<RecurringPayment, "id" | "isActive" | "nextDueDate">) => Promise<void>;
  onCreateContact?: (data: Omit<Contact, "id">) => Promise<Contact>;
}

// ---------------------------------------------------------------------------
// Interval chip
// ---------------------------------------------------------------------------

const INTERVAL_OPTIONS: { key: RecurringInterval; label: string }[] = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "yearly", label: "Yearly" },
];

function IntervalChip({
  option,
  isSelected,
  onPress,
  isDark,
}: {
  option: { key: RecurringInterval; label: string };
  isSelected: boolean;
  onPress: () => void;
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`px-4 py-2.5 rounded-xl flex-1 items-center ${
        isSelected
          ? "bg-primary-600"
          : isDark
            ? "bg-slate-700"
            : "bg-slate-100"
      }`}
    >
      <Text
        className={`text-xs font-semibold ${
          isSelected ? "text-white" : isDark ? "text-slate-300" : "text-slate-600"
        }`}
      >
        {option.label}
      </Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const RecurringPaymentForm = forwardRef<RecurringPaymentFormRef, RecurringPaymentFormProps>(
  ({ contacts, onSave, onCreateContact }, ref) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const sheetRef = useRef<BottomSheet>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [direction, setDirection] = useState<"give" | "receive">("give");
    const [amount, setAmount] = useState("");
    const [interval, setInterval] = useState<RecurringInterval>("monthly");
    const [startDate, setStartDate] = useState(new Date());
    const [hasEndDate, setHasEndDate] = useState(false);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [autoGenerate, setAutoGenerate] = useState(true);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const successScale = useSharedValue(0);
    const successStyle = useAnimatedStyle(() => ({
      transform: [{ scale: successScale.value }],
      opacity: successScale.value,
    }));

    const open = useCallback((existing?: RecurringPayment) => {
      if (existing) {
        setEditingId(existing.id);
        setDirection(existing.direction);
        setAmount(String(existing.amount));
        setInterval(existing.interval);
        setStartDate(new Date(existing.startDate));
        setHasEndDate(!!existing.endDate);
        setEndDate(existing.endDate ? new Date(existing.endDate) : null);
        setAutoGenerate(existing.autoGenerate);
        const contact = contacts.find((c) => c.id === existing.contactId);
        setSelectedContact(contact ?? null);
      } else {
        setEditingId(null);
        setSelectedContact(null);
        setDirection("give");
        setAmount("");
        setInterval("monthly");
        setStartDate(new Date());
        setHasEndDate(false);
        setEndDate(null);
        setAutoGenerate(true);
      }
      setShowSuccess(false);
      sheetRef.current?.expand();
    }, [contacts]);

    const close = useCallback(() => {
      sheetRef.current?.close();
    }, []);

    useImperativeHandle(ref, () => ({ open, close }), [open, close]);

    const handleSave = useCallback(async () => {
      if (!selectedContact) {
        Alert.alert("Select Contact", "Please select a contact.");
        return;
      }
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        Alert.alert("Invalid Amount", "Enter a valid amount greater than 0.");
        return;
      }

      setIsSaving(true);
      try {
        await onSave({
          contactId: selectedContact.id,
          contactName: selectedContact.name,
          direction,
          amount: numAmount,
          currency: "INR",
          interval,
          startDate: startDate.toISOString().split("T")[0],
          endDate: hasEndDate && endDate ? endDate.toISOString().split("T")[0] : null,
          autoGenerate,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowSuccess(true);
        successScale.value = withSequence(
          withSpring(1.2, { damping: 8 }),
          withSpring(1, { damping: 12 }),
        );
        setTimeout(() => {
          setShowSuccess(false);
          successScale.value = withTiming(0);
          close();
        }, 1200);
      } catch {
        Alert.alert("Error", "Failed to save. Please try again.");
      } finally {
        setIsSaving(false);
      }
    }, [
      selectedContact, amount, direction, interval, startDate,
      hasEndDate, endDate, autoGenerate, onSave, close, successScale,
    ]);

    const bgColor = isDark ? "#0F172A" : "#FFFFFF";
    const cardBg = isDark ? "bg-slate-800" : "bg-slate-50";
    const textPrimary = isDark ? "text-white" : "text-slate-900";
    const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
    const borderColor = isDark ? "border-slate-700" : "border-slate-200";
    const inputBg = isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200";

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={[640]}
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
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
          keyboardShouldPersistTaps="handled"
        >
          {showSuccess ? (
            <Animated.View
              style={successStyle}
              className="items-center justify-center py-16"
            >
              <View className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center mb-4">
                <Text className="text-4xl">✓</Text>
              </View>
              <Text className={`text-lg font-bold ${textPrimary}`}>
                {editingId ? "Updated!" : "Saved!"}
              </Text>
              <Text className={`text-sm ${textSecondary} mt-1`}>
                Recurring payment set up
              </Text>
            </Animated.View>
          ) : (
            <>
              <Text className={`text-lg font-bold ${textPrimary} mb-1 text-center`}>
                {editingId ? "Edit Recurring" : "Add Recurring Payment"}
              </Text>
              <Text className={`text-xs ${textSecondary} mb-5 text-center`}>
                Auto-generate payments on a schedule
              </Text>

              {/* Contact */}
              <View className="mb-4">
                <Text className={`text-xs font-semibold ${textSecondary} mb-1.5`}>
                  Contact
                </Text>
                <ContactSelector
                  contacts={contacts}
                  selectedContact={selectedContact}
                  onSelect={(c) => {
                    setSelectedContact(c);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  onClear={() => setSelectedContact(null)}
                  onCreateContact={
                    onCreateContact ??
                    (async (data) => ({ id: String(Date.now()), ...data }))
                  }
                />
              </View>

              {/* Direction */}
              <View className="mb-4">
                <Text className={`text-xs font-semibold ${textSecondary} mb-1.5`}>
                  Direction
                </Text>
                <View className={`flex-row rounded-xl ${cardBg} p-1 gap-1`}>
                  <TouchableOpacity
                    className={`flex-1 py-3 rounded-lg items-center ${
                      direction === "give" ? "bg-red-500" : ""
                    }`}
                    onPress={() => {
                      setDirection("give");
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        direction === "give" ? "text-white" : textSecondary
                      }`}
                    >
                      I Give (Pay)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 py-3 rounded-lg items-center ${
                      direction === "receive" ? "bg-green-500" : ""
                    }`}
                    onPress={() => {
                      setDirection("receive");
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        direction === "receive" ? "text-white" : textSecondary
                      }`}
                    >
                      I Receive
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Amount */}
              <View className="mb-4">
                <Text className={`text-xs font-semibold ${textSecondary} mb-1.5`}>
                  Amount
                </Text>
                <View
                  className={`flex-row items-center border rounded-2xl px-4 ${inputBg}`}
                >
                  <Text
                    className={`text-xl font-bold mr-2 ${textSecondary}`}
                  >
                    ₹
                  </Text>
                  <TextInput
                    className={`flex-1 py-3.5 text-xl font-bold ${textPrimary}`}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={setAmount}
                    style={{ fontVariant: ["tabular-nums"] }}
                  />
                  <View
                    className={`px-2 py-1 rounded-lg ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
                  >
                    <Text className={`text-xs font-semibold ${textSecondary}`}>
                      INR
                    </Text>
                  </View>
                </View>
              </View>

              {/* Interval */}
              <View className="mb-4">
                <Text className={`text-xs font-semibold ${textSecondary} mb-2`}>
                  Repeat Interval
                </Text>
                <View className="flex-row gap-2">
                  {INTERVAL_OPTIONS.map((opt) => (
                    <IntervalChip
                      key={opt.key}
                      option={opt}
                      isSelected={interval === opt.key}
                      onPress={() => {
                        setInterval(opt.key);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      isDark={isDark}
                    />
                  ))}
                </View>
              </View>

              {/* Start Date */}
              <View className="mb-3">
                <Text className={`text-xs font-semibold ${textSecondary} mb-1.5`}>
                  Start Date
                </Text>
                <TouchableOpacity
                  onPress={() => setShowStartPicker(true)}
                  activeOpacity={0.7}
                  className={`border rounded-2xl px-4 py-3.5 flex-row items-center justify-between ${inputBg}`}
                >
                  <Text className={`text-sm ${textPrimary}`}>
                    {startDate.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>
                  <Text className={textSecondary}>📅</Text>
                </TouchableOpacity>
                {showStartPicker && (
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(_event, d) => {
                      setShowStartPicker(Platform.OS === "ios");
                      if (d) setStartDate(d);
                    }}
                  />
                )}
              </View>

              {/* End Date (optional) */}
              <View
                className={`${cardBg} rounded-2xl px-4 py-3.5 mb-3 border ${borderColor}`}
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className={`text-sm font-semibold ${textPrimary}`}>
                      End Date
                    </Text>
                    <Text className={`text-xs ${textSecondary} mt-0.5`}>
                      {hasEndDate ? "Payments stop after this date" : "Never (ongoing)"}
                    </Text>
                  </View>
                  <Switch
                    value={hasEndDate}
                    onValueChange={(v) => {
                      setHasEndDate(v);
                      if (v && !endDate) {
                        const d = new Date();
                        d.setFullYear(d.getFullYear() + 1);
                        setEndDate(d);
                      }
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    trackColor={{
                      false: isDark ? "#475569" : "#CBD5E1",
                      true: "#A5B4FC",
                    }}
                    thumbColor={hasEndDate ? "#4F46E5" : isDark ? "#64748B" : "#F1F5F9"}
                  />
                </View>
                {hasEndDate && endDate && (
                  <Animated.View entering={FadeInDown.duration(250)} className="mt-3">
                    <TouchableOpacity
                      onPress={() => setShowEndPicker(true)}
                      activeOpacity={0.7}
                      className={`border rounded-xl px-4 py-3 flex-row items-center justify-between ${inputBg}`}
                    >
                      <Text className={`text-sm ${textPrimary}`}>
                        {endDate.toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </Text>
                      <Text className={textSecondary}>📅</Text>
                    </TouchableOpacity>
                    {showEndPicker && (
                      <DateTimePicker
                        value={endDate}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={(_event, d) => {
                          setShowEndPicker(Platform.OS === "ios");
                          if (d) setEndDate(d);
                        }}
                        minimumDate={startDate}
                      />
                    )}
                  </Animated.View>
                )}
              </View>

              {/* Auto-generate toggle */}
              <View
                className={`${cardBg} rounded-2xl px-4 py-4 mb-6 flex-row items-center justify-between border ${borderColor}`}
              >
                <View className="flex-1 mr-3">
                  <Text className={`text-sm font-semibold ${textPrimary}`}>
                    Auto-Generate
                  </Text>
                  <Text className={`text-xs ${textSecondary} mt-0.5`}>
                    Automatically create pending payments
                  </Text>
                </View>
                <Switch
                  value={autoGenerate}
                  onValueChange={(v) => {
                    setAutoGenerate(v);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  trackColor={{
                    false: isDark ? "#475569" : "#CBD5E1",
                    true: "#A5B4FC",
                  }}
                  thumbColor={autoGenerate ? "#4F46E5" : isDark ? "#64748B" : "#F1F5F9"}
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                className={`rounded-2xl py-4 items-center ${
                  isSaving ? "bg-primary-400" : "bg-primary-600"
                }`}
                activeOpacity={0.8}
                style={{
                  shadowColor: "#4F46E5",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-bold text-base">
                    {editingId ? "Update Recurring" : "Create Recurring"}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  },
);

RecurringPaymentForm.displayName = "RecurringPaymentForm";

export default RecurringPaymentForm;
