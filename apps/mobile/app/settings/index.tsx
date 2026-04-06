import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Modal,
  Share,
  useColorScheme,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/stores/app-store";
import {
  useOfflineSyncStore,
  triggerManualSync,
  getSyncStatusText,
} from "@/lib/offline-sync";

// ---- Types ----

type ThemeMode = "light" | "dark" | "system";
type DateFormat = "DD/MM/YYYY" | "MM/DD/YYYY";
type AutoLockTimer = "immediately" | "1min" | "5min" | "15min";

// ---- Constants ----

const CURRENCIES = [
  { code: "INR", symbol: "₹", flag: "🇮🇳", name: "Indian Rupee" },
  { code: "USD", symbol: "$", flag: "🇺🇸", name: "US Dollar" },
  { code: "EUR", symbol: "€", flag: "🇪🇺", name: "Euro" },
  { code: "GBP", symbol: "£", flag: "🇬🇧", name: "British Pound" },
  { code: "JPY", symbol: "¥", flag: "🇯🇵", name: "Japanese Yen" },
  { code: "AED", symbol: "د.إ", flag: "🇦🇪", name: "UAE Dirham" },
  { code: "SGD", symbol: "S$", flag: "🇸🇬", name: "Singapore Dollar" },
  { code: "CAD", symbol: "C$", flag: "🇨🇦", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", flag: "🇦🇺", name: "Australian Dollar" },
] as const;

const AUTO_LOCK_OPTIONS: { value: AutoLockTimer; label: string }[] = [
  { value: "immediately", label: "Immediately" },
  { value: "1min", label: "1 minute" },
  { value: "5min", label: "5 minutes" },
  { value: "15min", label: "15 minutes" },
];

// ---- Sub-components ----

function SectionLabel({ title, isDark }: { title: string; isDark: boolean }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: "700",
        color: isDark ? "#64748B" : "#94A3B8",
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginBottom: 8,
        marginLeft: 4,
        marginTop: 4,
      }}
    >
      {title}
    </Text>
  );
}

function Card({
  children,
  isDark,
}: {
  children: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
        borderRadius: 16,
        paddingHorizontal: 16,
        shadowColor: isDark ? "#000" : "#64748B",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.2 : 0.06,
        shadowRadius: 4,
        elevation: 2,
        marginBottom: 20,
      }}
    >
      {children}
    </View>
  );
}

function Divider({ isDark }: { isDark: boolean }) {
  return (
    <View style={{ height: 1, backgroundColor: isDark ? "#334155" : "#F1F5F9" }} />
  );
}

function RowLink({
  label,
  value,
  subtitle,
  onPress,
  destructive,
  isDark,
  badge,
}: {
  label: string;
  value?: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
  isDark: boolean;
  badge?: string;
}) {
  return (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.6}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: destructive ? "#EF4444" : isDark ? "#F8FAFC" : "#0F172A",
          }}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text
            style={{
              fontSize: 12,
              color: isDark ? "#64748B" : "#94A3B8",
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {badge ? (
        <View
          style={{
            backgroundColor: isDark ? "#312E81" : "#EEF2FF",
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 3,
            marginRight: 8,
          }}
        >
          <Text style={{ color: "#4F46E5", fontSize: 12, fontWeight: "600" }}>
            {badge}
          </Text>
        </View>
      ) : null}
      {value ? (
        <Text style={{ color: isDark ? "#64748B" : "#94A3B8", fontSize: 14, marginRight: 6 }}>
          {value}
        </Text>
      ) : null}
      {!destructive && (
        <Text style={{ color: isDark ? "#475569" : "#CBD5E1", fontSize: 20 }}>›</Text>
      )}
    </TouchableOpacity>
  );
}

function RowToggle({
  label,
  subtitle,
  value,
  onValueChange,
  disabled,
  isDark,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  isDark: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 13,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: isDark ? "#F8FAFC" : "#0F172A",
          }}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text
            style={{
              fontSize: 12,
              color: isDark ? "#64748B" : "#94A3B8",
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onValueChange(v);
        }}
        trackColor={{ false: "#CBD5E1", true: "#A5B4FC" }}
        thumbColor={value ? "#4F46E5" : "#F1F5F9"}
        disabled={disabled}
      />
    </View>
  );
}

// ---- Segmented Control ----

function SegmentedControl({
  options,
  selected,
  onSelect,
  isDark,
}: {
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (v: string) => void;
  isDark: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: isDark ? "#0F172A" : "#F1F5F9",
        borderRadius: 10,
        padding: 3,
        marginVertical: 10,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === selected;
        return (
          <TouchableOpacity
            key={opt.value}
            style={{
              flex: 1,
              paddingVertical: 8,
              alignItems: "center",
              borderRadius: 8,
              backgroundColor: active ? (isDark ? "#1E293B" : "#FFFFFF") : "transparent",
              shadowColor: active ? "#000" : "transparent",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: active ? 0.1 : 0,
              shadowRadius: 2,
              elevation: active ? 2 : 0,
            }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(opt.value);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: active ? "700" : "500",
                color: active ? (isDark ? "#F8FAFC" : "#0F172A") : isDark ? "#64748B" : "#94A3B8",
              }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ---- Delete Account Modal ----

function DeleteAccountModal({
  visible,
  onCancel,
  onConfirm,
  isDark,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isDark: boolean;
}) {
  const [confirmText, setConfirmText] = useState("");
  const canDelete = confirmText.trim() === "DELETE";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
            borderRadius: 20,
            padding: 24,
            width: "100%",
            maxWidth: 380,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#EF4444",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Delete Account
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: isDark ? "#94A3B8" : "#64748B",
              textAlign: "center",
              marginBottom: 20,
              lineHeight: 20,
            }}
          >
            This will permanently delete your account and ALL data. This action
            cannot be undone.
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: isDark ? "#CBD5E1" : "#475569",
              marginBottom: 8,
            }}
          >
            Type DELETE to confirm:
          </Text>
          <TextInput
            style={{
              borderWidth: 1.5,
              borderColor: canDelete ? "#EF4444" : isDark ? "#334155" : "#E2E8F0",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 11,
              fontSize: 15,
              fontWeight: "700",
              color: isDark ? "#F8FAFC" : "#0F172A",
              backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
              marginBottom: 20,
              letterSpacing: 1,
            }}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="Type DELETE"
            placeholderTextColor={isDark ? "#475569" : "#CBD5E1"}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={{
              backgroundColor: canDelete ? "#EF4444" : isDark ? "#334155" : "#E2E8F0",
              borderRadius: 12,
              paddingVertical: 13,
              alignItems: "center",
              marginBottom: 10,
            }}
            onPress={onConfirm}
            disabled={!canDelete}
            activeOpacity={0.8}
          >
            <Text
              style={{
                color: canDelete ? "#FFFFFF" : isDark ? "#64748B" : "#94A3B8",
                fontSize: 15,
                fontWeight: "700",
              }}
            >
              Delete My Account
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              paddingVertical: 13,
              alignItems: "center",
            }}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text
              style={{
                color: "#4F46E5",
                fontSize: 15,
                fontWeight: "600",
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ---- Main Screen ----

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const {
    isPinEnabled,
    setIsPinEnabled,
    setStoredPin,
    isBiometricEnabled,
    setIsBiometricEnabled,
    themeMode,
    setThemeMode,
    defaultCurrency,
    setDefaultCurrency,
  } = useAppStore();

  const { isOnline, syncStatus, lastSyncAt, mutationQueue } = useOfflineSyncStore();

  // Local pref state
  const [dateFormat, setDateFormat] = useState<DateFormat>("DD/MM/YYYY");
  const [autoLock, setAutoLock] = useState<AutoLockTimer>("1min");

  // Notification prefs
  const [notifPush, setNotifPush] = useState(true);
  const [notifReminders, setNotifReminders] = useState(true);
  const [notifBudget, setNotifBudget] = useState(true);
  const [notifDigest, setNotifDigest] = useState(false);

  // UI state
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const selectedCurrency = CURRENCIES.find((c) => c.code === defaultCurrency) ?? CURRENCIES[0];
  const pendingCount = mutationQueue.length;
  const syncLabel = getSyncStatusText(syncStatus, lastSyncAt, pendingCount);

  // ---- Theme ----

  function handleThemeChange(value: string) {
    setThemeMode(value as ThemeMode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // ---- Currency ----

  function handleCurrencyChange() {
    Alert.alert(
      "Default Currency",
      "Select your default currency:",
      [
        ...CURRENCIES.map((c) => ({
          text: `${c.flag}  ${c.code} — ${c.name}`,
          onPress: () => {
            setDefaultCurrency(c.code);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        })),
        { text: "Cancel", style: "cancel" as const },
      ]
    );
  }

  // ---- Date Format ----

  function handleDateFormatChange(value: string) {
    setDateFormat(value as DateFormat);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // ---- Auto Lock ----

  function handleAutoLockChange() {
    Alert.alert(
      "Auto-lock Timer",
      "Lock the app after:",
      [
        ...AUTO_LOCK_OPTIONS.map((opt) => ({
          text: opt.label + (autoLock === opt.value ? " ✓" : ""),
          onPress: () => {
            setAutoLock(opt.value);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        })),
        { text: "Cancel", style: "cancel" as const },
      ]
    );
  }

  // ---- PIN ----

  function handlePinToggle(value: boolean) {
    if (value) {
      router.push("/settings/security");
    } else {
      Alert.alert("Disable PIN", "Remove PIN lock?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable",
          style: "destructive",
          onPress: () => {
            setIsPinEnabled(false);
            setStoredPin(null);
            setIsBiometricEnabled(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]);
    }
  }

  function handleBiometricToggle(value: boolean) {
    if (!isPinEnabled) {
      Alert.alert("PIN Required", "Set up a PIN before enabling biometric unlock.");
      return;
    }
    setIsBiometricEnabled(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // ---- Sync ----

  const handleSyncNow = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await triggerManualSync();

    setIsSyncing(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Sync Failed", result.error ?? "Please try again later.");
    }
  }, [isSyncing]);

  // ---- Export ----

  async function handleExportCSV() {
    const csvContent = [
      "Date,Category,Description,Amount,Currency",
      "2024-03-01,Food,Swiggy order,450,INR",
      "2024-03-02,Transport,Uber ride,220,INR",
    ].join("\n");

    try {
      await Share.share({
        title: "ExpenseFlow Export",
        message: csvContent,
      });
    } catch {
      // User cancelled share
    }
  }

  // ---- Clear Cache ----

  function handleClearCache() {
    Alert.alert("Clear Cache", "This will clear locally cached data. Your synced data is safe.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          // TODO: Clear react-query cache and local file cache
          Alert.alert("Done", "Cache cleared successfully.");
        },
      },
    ]);
  }

  // ---- Sign Out ----

  async function handleSignOut() {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await supabase.auth.signOut();
          },
        },
      ]
    );
  }

  // ---- Delete Account ----

  function handleDeleteAccount() {
    setShowDeleteModal(true);
  }

  async function confirmDeleteAccount() {
    setShowDeleteModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    // TODO: Call account deletion API
    await supabase.auth.signOut();
  }

  // ---- Colors ----

  const bgColor = isDark ? "#0F172A" : "#F8FAFC";
  const autoLockLabel =
    AUTO_LOCK_OPTIONS.find((o) => o.value === autoLock)?.label ?? "1 minute";

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }} edges={["top"]}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 14,
            backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
            borderBottomWidth: 1,
            borderBottomColor: isDark ? "#1E293B" : "#F1F5F9",
          }}
        >
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={{ color: "#4F46E5", fontSize: 16, fontWeight: "500" }}>
              ← Back
            </Text>
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: isDark ? "#F8FAFC" : "#0F172A",
            }}
          >
            Settings
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Section */}
          <Animated.View entering={FadeInDown.duration(400).delay(50)}>
            <Card isDark={isDark}>
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14 }}
                onPress={() => router.push("/settings/profile")}
                activeOpacity={0.7}
              >
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: isDark ? "#312E81" : "#EEF2FF",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                  }}
                >
                  <Text style={{ fontSize: 26 }}>👤</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: isDark ? "#F8FAFC" : "#0F172A",
                    }}
                  >
                    User Name
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: isDark ? "#64748B" : "#94A3B8",
                      marginTop: 2,
                    }}
                  >
                    user@example.com
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: isDark ? "#312E81" : "#EEF2FF",
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                  }}
                >
                  <Text style={{ color: "#4F46E5", fontSize: 12, fontWeight: "600" }}>
                    Edit
                  </Text>
                </View>
              </TouchableOpacity>
            </Card>
          </Animated.View>

          {/* Preferences */}
          <Animated.View entering={FadeInDown.duration(400).delay(150)}>
            <SectionLabel title="Preferences" isDark={isDark} />
            <Card isDark={isDark}>
              {/* Theme */}
              <View style={{ paddingTop: 4 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: isDark ? "#F8FAFC" : "#0F172A",
                    marginTop: 10,
                  }}
                >
                  Theme
                </Text>
                <SegmentedControl
                  options={[
                    { value: "light", label: "Light" },
                    { value: "dark", label: "Dark" },
                    { value: "system", label: "System" },
                  ]}
                  selected={themeMode}
                  onSelect={handleThemeChange}
                  isDark={isDark}
                />
              </View>

              <Divider isDark={isDark} />

              <RowLink
                label="Default Currency"
                value={`${selectedCurrency.flag} ${selectedCurrency.code}`}
                onPress={handleCurrencyChange}
                isDark={isDark}
              />

              <Divider isDark={isDark} />

              {/* Language — greyed out */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  opacity: 0.4,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: isDark ? "#F8FAFC" : "#0F172A",
                    }}
                  >
                    Language
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: isDark ? "#64748B" : "#94A3B8",
                      marginTop: 2,
                    }}
                  >
                    More languages coming soon
                  </Text>
                </View>
                <Text style={{ color: isDark ? "#64748B" : "#94A3B8", fontSize: 14, marginRight: 6 }}>
                  English
                </Text>
                <Text style={{ color: isDark ? "#475569" : "#CBD5E1", fontSize: 20 }}>›</Text>
              </View>

              <Divider isDark={isDark} />

              {/* Date Format */}
              <View style={{ paddingTop: 4, paddingBottom: 8 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: isDark ? "#F8FAFC" : "#0F172A",
                    marginTop: 10,
                  }}
                >
                  Date Format
                </Text>
                <SegmentedControl
                  options={[
                    { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
                    { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
                  ]}
                  selected={dateFormat}
                  onSelect={handleDateFormatChange}
                  isDark={isDark}
                />
              </View>
            </Card>
          </Animated.View>

          {/* Security */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <SectionLabel title="Security" isDark={isDark} />
            <Card isDark={isDark}>
              <RowToggle
                label="PIN Lock"
                subtitle="Require PIN to open app"
                value={isPinEnabled}
                onValueChange={handlePinToggle}
                isDark={isDark}
              />
              <Divider isDark={isDark} />
              <RowToggle
                label="Biometric Unlock"
                subtitle="Use Face ID or fingerprint"
                value={isBiometricEnabled}
                onValueChange={handleBiometricToggle}
                disabled={!isPinEnabled}
                isDark={isDark}
              />
              <Divider isDark={isDark} />
              <RowLink
                label="Auto-lock Timer"
                value={autoLockLabel}
                onPress={handleAutoLockChange}
                isDark={isDark}
              />
              <Divider isDark={isDark} />
              <RowLink
                label="Security Settings"
                subtitle="Change PIN, sessions & logs"
                onPress={() => router.push("/settings/security")}
                isDark={isDark}
              />
            </Card>
          </Animated.View>

          {/* Notifications */}
          <Animated.View entering={FadeInDown.duration(400).delay(250)}>
            <SectionLabel title="Notifications" isDark={isDark} />
            <Card isDark={isDark}>
              <RowToggle
                label="Push Notifications"
                subtitle="Allow notifications from ExpenseFlow"
                value={notifPush}
                onValueChange={setNotifPush}
                isDark={isDark}
              />
              <Divider isDark={isDark} />
              <RowToggle
                label="Payment Reminders"
                subtitle="Remind about due payments"
                value={notifReminders}
                onValueChange={setNotifReminders}
                disabled={!notifPush}
                isDark={isDark}
              />
              <Divider isDark={isDark} />
              <RowToggle
                label="Budget Alerts"
                subtitle="Notify when approaching limits"
                value={notifBudget}
                onValueChange={setNotifBudget}
                disabled={!notifPush}
                isDark={isDark}
              />
              <Divider isDark={isDark} />
              <RowToggle
                label="Weekly Digest"
                subtitle="Summary of weekly spending"
                value={notifDigest}
                onValueChange={setNotifDigest}
                disabled={!notifPush}
                isDark={isDark}
              />
            </Card>
          </Animated.View>

          {/* Data & Storage */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <SectionLabel title="Data & Storage" isDark={isDark} />
            <Card isDark={isDark}>
              {/* Sync status */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: isDark ? "#F8FAFC" : "#0F172A",
                    }}
                  >
                    Offline Sync
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color:
                        syncStatus === "error"
                          ? "#EF4444"
                          : syncStatus === "syncing"
                          ? "#4F46E5"
                          : isDark
                          ? "#64748B"
                          : "#94A3B8",
                      marginTop: 2,
                    }}
                  >
                    {isSyncing ? "Syncing…" : syncLabel}
                  </Text>
                </View>
                <TouchableOpacity
                  style={{
                    backgroundColor: isDark ? "#312E81" : "#EEF2FF",
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                  }}
                  onPress={handleSyncNow}
                  disabled={isSyncing || !isOnline}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      color: isSyncing || !isOnline ? "#94A3B8" : "#4F46E5",
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    {isSyncing ? "Syncing…" : "Sync Now"}
                  </Text>
                </TouchableOpacity>
              </View>

              <Divider isDark={isDark} />

              <RowLink
                label="Export Data (CSV)"
                subtitle="Share your expense history"
                onPress={handleExportCSV}
                isDark={isDark}
              />

              <Divider isDark={isDark} />

              <RowLink
                label="Clear Cache"
                subtitle="Free up local storage"
                onPress={handleClearCache}
                isDark={isDark}
              />

              <Divider isDark={isDark} />

              <View style={{ paddingVertical: 14 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: isDark ? "#F8FAFC" : "#0F172A",
                  }}
                >
                  Storage Used
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: isDark ? "#64748B" : "#94A3B8",
                    marginTop: 2,
                  }}
                >
                  4.2 MB (local cache + offline data)
                </Text>
              </View>
            </Card>
          </Animated.View>

          {/* Account */}
          <Animated.View entering={FadeInDown.duration(400).delay(350)}>
            <SectionLabel title="Account" isDark={isDark} />
            <Card isDark={isDark}>
              <RowLink
                label="Sign Out"
                onPress={handleSignOut}
                destructive
                showChevron={false}
                isDark={isDark}
              />
              <Divider isDark={isDark} />
              <RowLink
                label="Delete Account"
                subtitle="Permanently remove all data"
                onPress={handleDeleteAccount}
                destructive
                showChevron={false}
                isDark={isDark}
              />
            </Card>
          </Animated.View>

          {/* Version */}
          <Text
            style={{
              textAlign: "center",
              color: isDark ? "#334155" : "#CBD5E1",
              fontSize: 12,
              marginTop: 8,
            }}
          >
            ExpenseFlow v1.0.0
          </Text>
        </ScrollView>
      </SafeAreaView>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        visible={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteAccount}
        isDark={isDark}
      />
    </>
  );
}
