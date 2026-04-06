import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, {
  FadeInDown,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NotificationType =
  | "budget_alert"
  | "payment_reminder"
  | "ai_insight"
  | "expense_split"
  | "system";

type FilterType = "all" | "unread" | "budget_alert" | "payment_reminder" | "ai";

interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Mock notifications (shown when the DB table has no data yet)
// ---------------------------------------------------------------------------

const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n1",
    user_id: "u1",
    type: "budget_alert",
    title: "Budget Alert: Food",
    body: "You've used 90% of your Food budget this month. ₹1,000 remaining.",
    data: { type: "budget_alert" },
    read_at: null,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: "n2",
    user_id: "u1",
    type: "payment_reminder",
    title: "Payment Due Tomorrow",
    body: "Rahul Kumar owes you ₹2,500. Payment due date is tomorrow.",
    data: { type: "pending", id: "p1" },
    read_at: null,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "n3",
    user_id: "u1",
    type: "ai_insight",
    title: "New AI Insight Available",
    body: "Your dining spend increased 23% this month. Tap to see recommendations.",
    data: { type: "budget_alert" },
    read_at: null,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "n4",
    user_id: "u1",
    type: "expense_split",
    title: "Split Expense Settled",
    body: "Priya settled ₹1,200 for the dinner split.",
    data: { type: "expense", id: "e1" },
    read_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "n5",
    user_id: "u1",
    type: "budget_alert",
    title: "Budget Alert: Shopping",
    body: "You've exceeded your Shopping budget by ₹500.",
    data: { type: "budget_alert" },
    read_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "n6",
    user_id: "u1",
    type: "system",
    title: "Sync Complete",
    body: "All your data has been synced successfully.",
    data: null,
    read_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case "budget_alert":
      return "⚠️";
    case "payment_reminder":
      return "💸";
    case "ai_insight":
      return "✨";
    case "expense_split":
      return "🤝";
    case "system":
      return "🔔";
    default:
      return "📣";
  }
}

function getNotificationRoute(notification: AppNotification): string | null {
  if (!notification.data) return null;
  const d = notification.data as { type?: string; id?: string };
  switch (d.type) {
    case "expense":
      return d.id ? `/expense/${d.id}` : null;
    case "pending":
      return d.id ? `/pending/${d.id}` : null;
    case "budget_alert":
      return "/reports/";
    default:
      return null;
  }
}

function filterNotifications(
  notifications: AppNotification[],
  filter: FilterType
): AppNotification[] {
  switch (filter) {
    case "unread":
      return notifications.filter((n) => !n.read_at);
    case "budget_alert":
      return notifications.filter((n) => n.type === "budget_alert");
    case "payment_reminder":
      return notifications.filter((n) => n.type === "payment_reminder");
    case "ai":
      return notifications.filter((n) => n.type === "ai_insight");
    default:
      return notifications;
  }
}

// ---------------------------------------------------------------------------
// Skeleton row
// ---------------------------------------------------------------------------

function SkeletonRow({ isDark }: { isDark: boolean }) {
  return (
    <View
      style={{
        flexDirection: "row",
        padding: 16,
        gap: 12,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
        }}
      />
      <View style={{ flex: 1, gap: 8 }}>
        <View
          style={{
            height: 14,
            borderRadius: 7,
            backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
            width: "70%",
          }}
        />
        <View
          style={{
            height: 11,
            borderRadius: 5,
            backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
            width: "90%",
          }}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Notification Row
// ---------------------------------------------------------------------------

interface NotificationRowProps {
  notification: AppNotification;
  isDark: boolean;
  onPress: (notification: AppNotification) => void;
  onDismiss: (id: string) => void;
}

function NotificationRow({
  notification,
  isDark,
  onPress,
  onDismiss,
}: NotificationRowProps) {
  const isUnread = !notification.read_at;
  const translateX = useSharedValue(0);
  const rowOpacity = useSharedValue(1);
  const [visible, setVisible] = useState(true);

  const unreadBg = isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.04)";
  const readBg = isDark ? "transparent" : "transparent";
  const textPrimary = isDark ? "#F1F5F9" : "#0F172A";
  const textSecondary = isDark ? "#94A3B8" : "#64748B";
  const borderColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";

  function dismiss() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    rowOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(setVisible)(false);
        runOnJS(onDismiss)(notification.id);
      }
    });
  }

  const swipeGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationX < 0) translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX < -80) {
        translateX.value = withTiming(-400, { duration: 250 });
        runOnJS(dismiss)();
      } else {
        translateX.value = withTiming(0, { duration: 200 });
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: rowOpacity.value,
  }));

  if (!visible) return null;

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
  });

  return (
    <Animated.View exiting={FadeOut.duration(200)}>
      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={rowStyle}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onPress(notification)}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              padding: 16,
              backgroundColor: isUnread ? unreadBg : readBg,
              borderBottomWidth: 1,
              borderBottomColor: borderColor,
            }}
          >
            {/* Unread indicator */}
            {isUnread && (
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: "#6366F1",
                  marginTop: 5,
                  marginRight: 10,
                  marginLeft: -2,
                }}
              />
            )}
            {!isUnread && <View style={{ width: 15 }} />}

            {/* Icon */}
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Text style={{ fontSize: 20 }}>
                {getNotificationIcon(notification.type)}
              </Text>
            </View>

            {/* Content */}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: isUnread ? "700" : "500",
                  color: isUnread ? textPrimary : textSecondary,
                  marginBottom: 3,
                  lineHeight: 18,
                }}
                numberOfLines={2}
              >
                {notification.title}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: textSecondary,
                  lineHeight: 17,
                  marginBottom: 4,
                }}
                numberOfLines={2}
              >
                {notification.body}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  color: isDark ? "#475569" : "#CBD5E1",
                }}
              >
                {timeAgo}
              </Text>
            </View>

            {/* Chevron */}
            {getNotificationRoute(notification) && (
              <Text
                style={{
                  color: isDark ? "#475569" : "#CBD5E1",
                  fontSize: 18,
                  marginLeft: 8,
                  marginTop: 2,
                }}
              >
                ›
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Filter Chip
// ---------------------------------------------------------------------------

function FilterChip({
  label,
  active,
  count,
  onPress,
  isDark,
}: {
  label: string;
  active: boolean;
  count?: number;
  onPress: () => void;
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: active
          ? "#6366F1"
          : isDark
          ? "#1E293B"
          : "#F1F5F9",
        marginRight: 8,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: active ? "#fff" : isDark ? "#94A3B8" : "#64748B",
        }}
      >
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View
          style={{
            backgroundColor: active ? "rgba(255,255,255,0.3)" : "#6366F1",
            borderRadius: 10,
            minWidth: 18,
            height: 18,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 4,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: "#fff",
            }}
          >
            {count > 99 ? "99+" : count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function NotificationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [notifications, setNotifications] =
    useState<AppNotification[]>(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState<FilterType>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const cardBg = isDark ? "#0F172A" : "#FFFFFF";
  const textPrimary = isDark ? "#F1F5F9" : "#0F172A";
  const textSecondary = isDark ? "#94A3B8" : "#64748B";

  const filteredNotifications = useMemo(
    () => filterNotifications(notifications, filter),
    [notifications, filter]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read_at).length,
    [notifications]
  );

  const budgetCount = useMemo(
    () => notifications.filter((n) => n.type === "budget_alert" && !n.read_at).length,
    [notifications]
  );

  const paymentCount = useMemo(
    () =>
      notifications.filter((n) => n.type === "payment_reminder" && !n.read_at).length,
    [notifications]
  );

  const aiCount = useMemo(
    () => notifications.filter((n) => n.type === "ai_insight" && !n.read_at).length,
    [notifications]
  );

  async function fetchNotifications() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setNotifications(MOCK_NOTIFICATIONS);
        return;
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error || !data || data.length === 0) {
        setNotifications(MOCK_NOTIFICATIONS);
      } else {
        setNotifications(data as unknown as AppNotification[]);
      }
    } catch {
      setNotifications(MOCK_NOTIFICATIONS);
    }
  }

  async function markAllRead() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? now }))
    );

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("notifications")
          .update({ is_read: true } as any)
          .eq("user_id", user.id)
          .is("read_at", null);
      }
    } catch {
      // silently fail — optimistic update is already applied
    }
  }

  async function markRead(id: string) {
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? now } : n))
    );

    try {
      await supabase
        .from("notifications")
        .update({ is_read: true } as any)
        .eq("id", id);
    } catch {
      // silently fail
    }
  }

  function handleNotificationPress(notification: AppNotification) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markRead(notification.id);
    const route = getNotificationRoute(notification);
    if (route) router.push(route as Parameters<typeof router.push>[0]);
  }

  function handleDismiss(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fetchNotifications();
    setRefreshing(false);
  }, []);

  const filterOptions: { key: FilterType; label: string; count?: number }[] = [
    { key: "all", label: "All", count: unreadCount },
    { key: "unread", label: "Unread", count: unreadCount },
    { key: "budget_alert", label: "Budget Alerts", count: budgetCount },
    { key: "payment_reminder", label: "Payments", count: paymentCount },
    { key: "ai", label: "AI", count: aiCount },
  ];

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`} edges={["top"]}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(50)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 18, color: textPrimary }}>‹</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: textPrimary }}>
            Notifications
          </Text>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={markAllRead}
            activeOpacity={0.7}
            style={{
              backgroundColor: isDark ? "#1E293B" : "#EEF2FF",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: "#6366F1",
              }}
            >
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Filter chips */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(100)}
        style={{ paddingBottom: 12 }}
      >
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterOptions}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          renderItem={({ item }) => (
            <FilterChip
              label={item.label}
              active={filter === item.key}
              count={item.count}
              onPress={() => setFilter(item.key)}
              isDark={isDark}
            />
          )}
        />
      </Animated.View>

      {/* Notifications List */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(150)}
        style={{
          flex: 1,
          backgroundColor: cardBg,
          marginHorizontal: 0,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: "hidden",
        }}
      >
        {isLoading ? (
          // Skeleton
          <View>
            {[0, 1, 2, 3, 4].map((i) => (
              <SkeletonRow key={i} isDark={isDark} />
            ))}
          </View>
        ) : filteredNotifications.length === 0 ? (
          // Empty state
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingBottom: 80,
            }}
          >
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🎉</Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: textPrimary,
                marginBottom: 8,
              }}
            >
              You're all caught up!
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: textSecondary,
                textAlign: "center",
                maxWidth: 240,
                lineHeight: 20,
              }}
            >
              No notifications here. We'll let you know when something needs
              your attention.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredNotifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <NotificationRow
                notification={item}
                isDark={isDark}
                onPress={handleNotificationPress}
                onDismiss={handleDismiss}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#6366F1"
                colors={["#6366F1"]}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
}
