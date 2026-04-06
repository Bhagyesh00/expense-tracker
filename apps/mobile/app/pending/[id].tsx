import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from "@gorhom/bottom-sheet";

import PaymentTimeline, {
  type PaymentTimelineEntry,
} from "@/components/payment-timeline";
import SettlePaymentSheet, {
  type SettlePaymentSheetRef,
} from "@/components/settle-payment-sheet";
import UpiPayButton from "@/components/upi-pay-button";
import ReminderComposer from "@/components/reminder-composer";

// ---- Types ----

interface PendingPaymentDetail {
  id: string;
  direction: "give" | "receive";
  contactName: string;
  contactPhone?: string;
  contactEmail?: string;
  contactUpiId?: string;
  amount: number;
  paidAmount: number;
  status: "pending" | "partial" | "overdue" | "settled";
  description: string;
  dueDate: string | null;
  notes: string;
  createdAt: string;
  timeline: PaymentTimelineEntry[];
}

// ---- Mock data ----

function usePendingPaymentDetail(id: string) {
  const detail: PendingPaymentDetail = {
    id,
    direction: "receive",
    contactName: "Priya Patel",
    contactPhone: "+91 9876543210",
    contactEmail: "priya@email.com",
    contactUpiId: "priya@okaxis",
    amount: 12000,
    paidAmount: 4000,
    status: "partial",
    description: "Trip expenses -- Goa trip shared costs",
    dueDate: "2026-03-30",
    notes: "Includes hotel, food, and transport. Split 50-50.",
    createdAt: "2026-03-15T08:00:00Z",
    timeline: [
      {
        id: "t1",
        type: "created",
        amount: 12000,
        date: "2026-03-15",
        note: "Payment created for Goa trip expenses",
      },
      {
        id: "t2",
        type: "payment",
        amount: 2000,
        date: "2026-03-18",
        method: "upi",
        note: "First installment",
      },
      {
        id: "t3",
        type: "partial",
        amount: 2000,
        date: "2026-03-22",
        method: "cash",
        note: "Second installment -- paid in cash",
      },
    ],
  };

  return { payment: detail, isLoading: false };
}

export default function PendingPaymentDetailScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { id } = useLocalSearchParams<{ id: string }>();
  const { payment, isLoading } = usePendingPaymentDetail(id ?? "");

  const settleSheetRef = useRef<SettlePaymentSheetRef>(null);
  const reminderSheetRef = useRef<BottomSheet>(null);
  const [showReminder, setShowReminder] = useState(false);

  const remaining = payment.amount - payment.paidAmount;
  const progressPercent = (payment.paidAmount / payment.amount) * 100;
  const isGive = payment.direction === "give";

  const handleRecordPayment = useCallback(async (data: {
    amount: number;
    method: string;
    note: string;
    proofUri: string | null;
  }) => {
    // TODO: Call API to record partial payment
    console.log("Recording payment:", data);
    // Simulate success
    await new Promise((res) => setTimeout(res, 500));
  }, []);

  function handleMarkSettled() {
    Alert.alert(
      "Mark as Settled",
      "Are you sure this payment is fully settled?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Settled",
          style: "default",
          onPress: async () => {
            // TODO: Call API
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          },
        },
      ]
    );
  }

  function handleDelete() {
    Alert.alert(
      "Delete Payment",
      "This action cannot be undone. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // TODO: Call API
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.back();
          },
        },
      ]
    );
  }

  function handleCallContact() {
    if (payment.contactPhone) {
      Linking.openURL(`tel:${payment.contactPhone}`);
    }
  }

  function handleEmailContact() {
    if (payment.contactEmail) {
      Linking.openURL(`mailto:${payment.contactEmail}`);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View
        className={`flex-row items-center justify-between px-5 py-3 border-b ${
          isGive ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100"
        }`}
      >
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text className="text-primary-600 text-base font-medium">
            {"\u2190"} Back
          </Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-900">
          Payment Details
        </Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // TODO: navigate to edit
            }}
            activeOpacity={0.7}
          >
            <Text className="text-primary-600 text-sm font-medium">Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} activeOpacity={0.7}>
            <Text className="text-red-500 text-sm font-medium">Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Header */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(50)}
          className="items-center mb-6"
        >
          <View
            className={`w-16 h-16 rounded-full items-center justify-center mb-3 ${
              isGive ? "bg-red-100" : "bg-green-100"
            }`}
          >
            <Text className="text-3xl">{isGive ? "\u2191" : "\u2193"}</Text>
          </View>
          <Text className="text-sm text-slate-500 mb-1">
            {isGive ? "You owe" : "Owed to you"}
          </Text>
          <Text
            className={`text-4xl font-bold ${
              isGive ? "text-red-600" : "text-green-600"
            }`}
          >
            {"\u20B9"}{remaining.toLocaleString("en-IN")}
          </Text>
          <Text className="text-sm text-slate-400 mt-1">
            of {"\u20B9"}{payment.amount.toLocaleString("en-IN")} total
          </Text>

          {/* Circular Progress Indicator */}
          <View className="mt-4 items-center">
            <View className="relative w-20 h-20 items-center justify-center">
              {/* Background circle */}
              <View
                className="absolute w-20 h-20 rounded-full border-4 border-slate-100"
              />
              {/* Progress visual using a thick border */}
              <View
                className={`absolute w-20 h-20 rounded-full border-4 ${
                  isGive ? "border-red-400" : "border-green-400"
                }`}
                style={{
                  borderTopColor: "transparent",
                  borderRightColor:
                    progressPercent > 25
                      ? isGive
                        ? "#F87171"
                        : "#4ADE80"
                      : "transparent",
                  borderBottomColor:
                    progressPercent > 50
                      ? isGive
                        ? "#F87171"
                        : "#4ADE80"
                      : "transparent",
                  borderLeftColor:
                    progressPercent > 75
                      ? isGive
                        ? "#F87171"
                        : "#4ADE80"
                      : "transparent",
                  transform: [{ rotate: "-45deg" }],
                }}
              />
              <Text className="text-base font-bold text-slate-700">
                {progressPercent.toFixed(0)}%
              </Text>
            </View>
            <Text className="text-xs text-slate-400 mt-1.5">
              Paid: {"\u20B9"}{payment.paidAmount.toLocaleString("en-IN")} | Remaining: {"\u20B9"}
              {remaining.toLocaleString("en-IN")}
            </Text>
          </View>
        </Animated.View>

        {/* Contact Card */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(150)}
          className={`rounded-2xl p-4 mb-4 border ${
            isGive ? "bg-red-50/50 border-red-100" : "bg-green-50/50 border-green-100"
          }`}
        >
          <View className="flex-row items-center mb-3">
            <View
              className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
                isGive ? "bg-red-200" : "bg-green-200"
              }`}
            >
              <Text
                className={`text-base font-bold ${
                  isGive ? "text-red-700" : "text-green-700"
                }`}
              >
                {payment.contactName
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-slate-900">
                {payment.contactName}
              </Text>
              <View
                className={`self-start px-1.5 py-0.5 rounded mt-0.5 ${
                  isGive ? "bg-red-100" : "bg-green-100"
                }`}
              >
                <Text
                  className={`text-[9px] font-bold ${
                    isGive ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {isGive ? "I OWE THEM" : "THEY OWE ME"}
                </Text>
              </View>
            </View>
          </View>

          {/* Contact actions */}
          <View className="flex-row gap-2">
            {payment.contactPhone && (
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center py-2 bg-white rounded-lg border border-slate-200"
                onPress={handleCallContact}
                activeOpacity={0.7}
              >
                <Text className="text-xs font-medium text-slate-700">
                  Call
                </Text>
              </TouchableOpacity>
            )}
            {payment.contactEmail && (
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center py-2 bg-white rounded-lg border border-slate-200"
                onPress={handleEmailContact}
                activeOpacity={0.7}
              >
                <Text className="text-xs font-medium text-slate-700">
                  Email
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Info Card */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(200)}
          className="bg-slate-50 rounded-2xl p-4 mb-4"
        >
          <DetailRow label="Description" value={payment.description} />
          <View className="h-px bg-slate-200 my-3" />
          <DetailRow
            label="Due Date"
            value={
              payment.dueDate
                ? new Date(payment.dueDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "No due date"
            }
          />
          <View className="h-px bg-slate-200 my-3" />
          <DetailRow label="Status" value={payment.status} capitalize />
          <View className="h-px bg-slate-200 my-3" />
          <DetailRow
            label="Created"
            value={new Date(payment.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          />
        </Animated.View>

        {/* Notes */}
        {payment.notes ? (
          <Animated.View
            entering={FadeInDown.duration(400).delay(250)}
            className="bg-slate-50 rounded-2xl p-4 mb-4"
          >
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Notes
            </Text>
            <Text className="text-sm text-slate-700 leading-5">
              {payment.notes}
            </Text>
          </Animated.View>
        ) : null}

        {/* Action Buttons Row */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(300)}
          className="gap-3 mb-5"
        >
          <TouchableOpacity
            className="bg-primary-600 rounded-xl py-4 items-center"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              settleSheetRef.current?.open();
            }}
            activeOpacity={0.8}
            style={{
              shadowColor: "#4F46E5",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.2,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <Text className="text-white font-bold text-base">
              Record Payment
            </Text>
          </TouchableOpacity>

          {isGive && payment.contactUpiId && (
            <UpiPayButton
              upiId={payment.contactUpiId}
              payeeName={payment.contactName}
              amount={remaining}
              description={payment.description}
              onUpiIdAdded={(upiId) => {
                // TODO: update contact UPI ID via API
                console.log("UPI ID added:", upiId);
              }}
            />
          )}

          {isGive && !payment.contactUpiId && (
            <UpiPayButton
              upiId={null}
              payeeName={payment.contactName}
              amount={remaining}
              description={payment.description}
              onUpiIdAdded={(upiId) => {
                console.log("UPI ID added:", upiId);
              }}
            />
          )}

          {!isGive && (
            <TouchableOpacity
              className="bg-blue-500 rounded-xl py-4 items-center"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowReminder(true);
                reminderSheetRef.current?.expand();
              }}
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold">Send Reminder</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            className={`border rounded-xl py-3.5 items-center ${
              isGive
                ? "border-green-400 bg-green-50"
                : "border-green-400 bg-green-50"
            }`}
            onPress={handleMarkSettled}
            activeOpacity={0.7}
          >
            <Text className="text-green-700 font-semibold">
              Mark as Settled
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Payment Timeline */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(350)}
          className="bg-slate-50 rounded-2xl p-4 mb-4"
        >
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Payment History
          </Text>
          <PaymentTimeline
            payments={payment.timeline}
            totalAmount={payment.amount}
          />
        </Animated.View>
      </ScrollView>

      {/* Settle Payment Sheet */}
      <SettlePaymentSheet
        ref={settleSheetRef}
        contactName={payment.contactName}
        totalAmount={payment.amount}
        paidAmount={payment.paidAmount}
        onRecord={handleRecordPayment}
      />

      {/* Reminder Sheet */}
      <BottomSheet
        ref={reminderSheetRef}
        index={-1}
        snapPoints={[480]}
        enablePanDownToClose
        onClose={() => setShowReminder(false)}
        backgroundStyle={{
          borderRadius: 28,
          backgroundColor: "#FFFFFF",
        }}
        handleIndicatorStyle={{
          backgroundColor: "#CBD5E1",
          width: 40,
          height: 4,
          borderRadius: 2,
        }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}
        >
          {showReminder && (
            <ReminderComposer
              contactName={payment.contactName}
              contactPhone={payment.contactPhone}
              contactEmail={payment.contactEmail}
              amount={remaining}
              description={payment.description}
              onClose={() => {
                reminderSheetRef.current?.close();
                setShowReminder(false);
              }}
            />
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <View>
      <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
        {label}
      </Text>
      <Text
        className={`text-sm text-slate-900 ${capitalize ? "capitalize" : ""}`}
      >
        {value}
      </Text>
    </View>
  );
}
