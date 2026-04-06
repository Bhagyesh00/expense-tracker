import { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

// ---- Types ----

interface ContactDetail {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  upiId?: string | null;
  avatarUrl?: string | null;
}

interface ContactPayment {
  id: string;
  direction: "give" | "receive";
  amount: number;
  paidAmount: number;
  status: "pending" | "partial" | "overdue" | "settled";
  description: string;
  dueDate: string | null;
}

// ---- Mock Data ----

function useContactDetail(id: string) {
  const contact: ContactDetail = {
    id,
    name: "Priya Patel",
    phone: "+91 9876543211",
    email: "priya@email.com",
    upiId: "priya@okaxis",
  };

  const payments: ContactPayment[] = [
    {
      id: "p1",
      direction: "receive",
      amount: 12000,
      paidAmount: 4000,
      status: "partial",
      description: "Trip expenses",
      dueDate: "2026-03-30",
    },
    {
      id: "p2",
      direction: "give",
      amount: 3000,
      paidAmount: 3000,
      status: "settled",
      description: "Birthday gift",
      dueDate: null,
    },
    {
      id: "p3",
      direction: "receive",
      amount: 1500,
      paidAmount: 0,
      status: "pending",
      description: "Lunch at cafe",
      dueDate: "2026-04-05",
    },
  ];

  return { contact, payments, isLoading: false };
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-amber-100", text: "text-amber-700" },
  partial: { bg: "bg-blue-100", text: "text-blue-700" },
  overdue: { bg: "bg-red-100", text: "text-red-700" },
  settled: { bg: "bg-green-100", text: "text-green-700" },
};

export default function ContactDetailScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { id } = useLocalSearchParams<{ id: string }>();
  const { contact, payments, isLoading } = useContactDetail(id ?? "");

  const netBalance = useMemo(() => {
    return payments.reduce((sum, p) => {
      if (p.status === "settled") return sum;
      const remaining = p.amount - p.paidAmount;
      return sum + (p.direction === "receive" ? remaining : -remaining);
    }, 0);
  }, [payments]);

  const activePayments = payments.filter((p) => p.status !== "settled");
  const settledPayments = payments.filter((p) => p.status === "settled");

  function handleCall() {
    if (contact.phone) Linking.openURL(`tel:${contact.phone}`);
  }

  function handleEmail() {
    if (contact.email) Linking.openURL(`mailto:${contact.email}`);
  }

  function handleMessage() {
    if (contact.phone)
      Linking.openURL(`sms:${contact.phone}`);
  }

  function handleDelete() {
    Alert.alert(
      "Delete Contact",
      `Delete ${contact.name}? This won't delete associated payments.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.back();
          },
        },
      ]
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

  const isPositive = netBalance > 0;
  const isZero = netBalance === 0;

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-slate-100">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text className="text-primary-600 text-base font-medium">
            {"\u2190"} Back
          </Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-900">
          Contact
        </Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // TODO: edit contact
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
        {/* Contact Info Header */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(50)}
          className="items-center mb-6"
        >
          <View
            className={`w-20 h-20 rounded-full items-center justify-center mb-3 ${
              isZero
                ? "bg-slate-200"
                : isPositive
                  ? "bg-green-100"
                  : "bg-red-100"
            }`}
          >
            <Text
              className={`text-2xl font-bold ${
                isZero
                  ? "text-slate-600"
                  : isPositive
                    ? "text-green-700"
                    : "text-red-700"
              }`}
            >
              {getInitials(contact.name)}
            </Text>
          </View>
          <Text className="text-xl font-bold text-slate-900">
            {contact.name}
          </Text>
          {contact.phone && (
            <Text className="text-sm text-slate-500 mt-0.5">
              {contact.phone}
            </Text>
          )}
          {contact.email && (
            <Text className="text-sm text-slate-400">
              {contact.email}
            </Text>
          )}
          {contact.upiId && (
            <View className="flex-row items-center mt-1 bg-violet-50 px-2 py-0.5 rounded-full">
              <Text className="text-xs text-violet-600 font-medium">
                UPI: {contact.upiId}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          className="flex-row gap-2 mb-6"
        >
          {contact.phone && (
            <TouchableOpacity
              className="flex-1 bg-blue-50 rounded-xl py-3 items-center border border-blue-100"
              onPress={handleCall}
              activeOpacity={0.7}
            >
              <Text className="text-sm font-semibold text-blue-600">Call</Text>
            </TouchableOpacity>
          )}
          {contact.phone && (
            <TouchableOpacity
              className="flex-1 bg-green-50 rounded-xl py-3 items-center border border-green-100"
              onPress={handleMessage}
              activeOpacity={0.7}
            >
              <Text className="text-sm font-semibold text-green-600">
                Message
              </Text>
            </TouchableOpacity>
          )}
          {contact.email && (
            <TouchableOpacity
              className="flex-1 bg-orange-50 rounded-xl py-3 items-center border border-orange-100"
              onPress={handleEmail}
              activeOpacity={0.7}
            >
              <Text className="text-sm font-semibold text-orange-600">
                Email
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Net Balance Card */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(150)}
          className={`rounded-2xl p-5 mb-6 border ${
            isZero
              ? "bg-slate-50 border-slate-200"
              : isPositive
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
          }`}
        >
          <Text
            className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
              isZero
                ? "text-slate-500"
                : isPositive
                  ? "text-green-500"
                  : "text-red-500"
            }`}
          >
            Net Balance
          </Text>
          <Text
            className={`text-3xl font-bold ${
              isZero
                ? "text-slate-600"
                : isPositive
                  ? "text-green-700"
                  : "text-red-700"
            }`}
          >
            {isZero
              ? "All Settled"
              : `${isPositive ? "+" : "-"}\u20B9${Math.abs(netBalance).toLocaleString("en-IN")}`}
          </Text>
          {!isZero && (
            <Text
              className={`text-xs mt-1 ${
                isPositive ? "text-green-500" : "text-red-500"
              }`}
            >
              {isPositive
                ? `${contact.name} owes you`
                : `You owe ${contact.name}`}
            </Text>
          )}
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(200)}
          className="flex-row gap-3 mb-6"
        >
          <TouchableOpacity
            className="flex-1 bg-red-500 rounded-xl py-3.5 items-center"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/pending/new");
            }}
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold text-sm">
              Record Give
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-green-500 rounded-xl py-3.5 items-center"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/pending/new");
            }}
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold text-sm">
              Record Receive
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Active Payments */}
        {activePayments.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400).delay(250)}>
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Active Payments ({activePayments.length})
            </Text>
            {activePayments.map((p) => {
              const remaining = p.amount - p.paidAmount;
              const isGive = p.direction === "give";
              const colors = statusColors[p.status] ?? statusColors.pending;

              return (
                <TouchableOpacity
                  key={p.id}
                  className="bg-white rounded-2xl p-4 mb-2 border border-slate-100"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/pending/${p.id}`);
                  }}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center justify-between mb-1">
                    <View className="flex-row items-center gap-2">
                      <View
                        className={`px-1.5 py-0.5 rounded ${
                          isGive ? "bg-red-100" : "bg-green-100"
                        }`}
                      >
                        <Text
                          className={`text-[9px] font-bold ${
                            isGive ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {isGive ? "GIVE" : "GET"}
                        </Text>
                      </View>
                      <Text className="text-sm text-slate-700" numberOfLines={1}>
                        {p.description}
                      </Text>
                    </View>
                    <Text
                      className={`text-sm font-bold ${
                        isGive ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {isGive ? "-" : "+"}{"\u20B9"}
                      {remaining.toLocaleString("en-IN")}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <View className={`px-2 py-0.5 rounded-full ${colors.bg}`}>
                      <Text
                        className={`text-[10px] font-semibold capitalize ${colors.text}`}
                      >
                        {p.status}
                      </Text>
                    </View>
                    {p.dueDate && (
                      <Text className="text-[10px] text-slate-400">
                        Due: {p.dueDate}
                      </Text>
                    )}
                  </View>
                  {p.paidAmount > 0 && (
                    <View className="mt-2">
                      <View className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <View
                          className={`h-full rounded-full ${
                            isGive ? "bg-red-400" : "bg-green-400"
                          }`}
                          style={{
                            width: `${(p.paidAmount / p.amount) * 100}%`,
                          }}
                        />
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        )}

        {/* Settled Payments */}
        {settledPayments.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(300)}
            className="mt-4"
          >
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Settled ({settledPayments.length})
            </Text>
            {settledPayments.map((p) => (
              <View
                key={p.id}
                className="bg-slate-50 rounded-xl p-3 mb-2 border border-slate-100 opacity-60"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-slate-600">{p.description}</Text>
                  <Text className="text-sm text-slate-500">
                    {"\u20B9"}{p.amount.toLocaleString("en-IN")}
                  </Text>
                </View>
                <View className="flex-row items-center mt-1">
                  <View className="px-2 py-0.5 rounded-full bg-green-100">
                    <Text className="text-[10px] font-semibold text-green-700">
                      Settled
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {payments.length === 0 && (
          <View className="items-center py-12">
            <Text className="text-lg font-semibold text-slate-900">
              No payment history
            </Text>
            <Text className="text-sm text-slate-500 mt-1">
              Record a payment to get started.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
