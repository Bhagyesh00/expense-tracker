import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInRight, Layout } from "react-native-reanimated";

// ---- Types ----

interface Contact {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  upiId?: string | null;
  netBalance: number; // positive = they owe you, negative = you owe them
  avatarUrl?: string | null;
}

type SortBy = "name" | "balance";

// ---- Mock Data ----

const MOCK_CONTACTS: Contact[] = [
  {
    id: "c1",
    name: "Rahul Sharma",
    phone: "+91 9876543210",
    email: "rahul@email.com",
    upiId: "rahul@okaxis",
    netBalance: -5000,
  },
  {
    id: "c2",
    name: "Priya Patel",
    phone: "+91 9876543211",
    email: "priya@email.com",
    upiId: "priya@okaxis",
    netBalance: 8000,
  },
  {
    id: "c3",
    name: "Amit Kumar",
    phone: "+91 9876543212",
    email: null,
    upiId: "amit@ybl",
    netBalance: -2500,
  },
  {
    id: "c4",
    name: "Sneha Verma",
    phone: "+91 9876543213",
    email: "sneha@email.com",
    upiId: null,
    netBalance: 8000,
  },
  {
    id: "c5",
    name: "Vikram Singh",
    phone: "+91 9876543214",
    email: null,
    upiId: null,
    netBalance: 2000,
  },
  {
    id: "c6",
    name: "Neha Gupta",
    phone: "+91 9876543215",
    email: "neha@email.com",
    upiId: null,
    netBalance: -1200,
  },
  {
    id: "c7",
    name: "Rohan Mehta",
    phone: "+91 9876543216",
    email: "rohan@email.com",
    upiId: "rohan@paytm",
    netBalance: 4000,
  },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ContactsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [refreshing, setRefreshing] = useState(false);

  const filteredContacts = useMemo(() => {
    let result = MOCK_CONTACTS;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.email?.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return Math.abs(b.netBalance) - Math.abs(a.netBalance);
    });

    return result;
  }, [searchQuery, sortBy]);

  const summary = useMemo(() => {
    const youOwe = MOCK_CONTACTS.filter((c) => c.netBalance < 0).reduce(
      (s, c) => s + Math.abs(c.netBalance),
      0
    );
    const theyOwe = MOCK_CONTACTS.filter((c) => c.netBalance > 0).reduce(
      (s, c) => s + c.netBalance,
      0
    );
    return { youOwe, theyOwe };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(false);
  }, []);

  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const headerBg = isDark ? "bg-slate-800" : "bg-white";
  const cardBg = isDark ? "bg-slate-800" : "bg-white";

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`} edges={["top"]}>
      {/* Header */}
      <View className={`${headerBg} px-5 pt-4 pb-3 border-b border-slate-100`}>
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text className="text-primary-600 text-base font-medium">
              {"\u2190"} Back
            </Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900">Contacts</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-slate-100 rounded-xl px-3 mb-3">
          <Text className="text-slate-400 mr-2">O</Text>
          <TextInput
            className="flex-1 py-2.5 text-sm text-slate-900"
            placeholder="Search contacts..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Text className="text-slate-400 text-xs font-bold">X</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sort toggle */}
        <View className="flex-row gap-2">
          {(["name", "balance"] as SortBy[]).map((s) => (
            <TouchableOpacity
              key={s}
              className={`px-3 py-1.5 rounded-full border ${
                sortBy === s
                  ? "bg-primary-600 border-primary-600"
                  : "bg-white border-slate-200"
              }`}
              onPress={() => {
                setSortBy(s);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.7}
            >
              <Text
                className={`text-xs font-semibold capitalize ${
                  sortBy === s ? "text-white" : "text-slate-600"
                }`}
              >
                By {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Contact List */}
      <FlatList
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100 }}
        data={filteredContacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const isPositive = item.netBalance > 0;
          const isZero = item.netBalance === 0;

          return (
            <Animated.View
              entering={FadeInRight.duration(300).delay(index * 50)}
              layout={Layout.springify()}
            >
              <TouchableOpacity
                className={`${cardBg} rounded-2xl p-4 mb-2 border border-slate-100`}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/contacts/${item.id}`);
                }}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  {/* Avatar */}
                  <View
                    className={`w-11 h-11 rounded-full items-center justify-center mr-3 ${
                      isZero
                        ? "bg-slate-200"
                        : isPositive
                          ? "bg-green-100"
                          : "bg-red-100"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isZero
                          ? "text-slate-600"
                          : isPositive
                            ? "text-green-700"
                            : "text-red-700"
                      }`}
                    >
                      {getInitials(item.name)}
                    </Text>
                  </View>

                  {/* Info */}
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-slate-900">
                      {item.name}
                    </Text>
                    {item.phone && (
                      <Text className="text-xs text-slate-400 mt-0.5">
                        {item.phone}
                      </Text>
                    )}
                  </View>

                  {/* Balance */}
                  <View className="items-end">
                    {isZero ? (
                      <Text className="text-sm font-semibold text-slate-400">
                        Settled
                      </Text>
                    ) : (
                      <>
                        <Text
                          className={`text-sm font-bold ${
                            isPositive ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {isPositive ? "+" : "-"}{"\u20B9"}
                          {Math.abs(item.netBalance).toLocaleString("en-IN")}
                        </Text>
                        <Text className="text-[10px] text-slate-400">
                          {isPositive ? "They owe you" : "You owe"}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          <View className="items-center py-20">
            <View className="w-20 h-20 rounded-full bg-slate-100 items-center justify-center mb-4">
              <Text className="text-3xl text-slate-400">?</Text>
            </View>
            <Text className="text-lg font-semibold text-slate-900">
              No contacts found
            </Text>
            <Text className="text-sm text-slate-500 mt-1">
              {searchQuery
                ? "Try a different search term."
                : "Add your first contact to get started."}
            </Text>
          </View>
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
      <TouchableOpacity
        className="absolute bottom-6 right-5 w-14 h-14 rounded-full bg-primary-600 items-center justify-center"
        style={{
          shadowColor: "#4F46E5",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          // TODO: navigate to add contact or open inline form
          Alert.alert("Add Contact", "Contact creation form will open here.");
        }}
        activeOpacity={0.8}
      >
        <Text className="text-white text-2xl font-light leading-none">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
