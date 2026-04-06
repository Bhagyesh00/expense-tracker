import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  useColorScheme,
  Modal,
  SafeAreaView as RNSafeAreaView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import Animated, { FadeInDown } from "react-native-reanimated";
import { format } from "date-fns";

import { useAppStore } from "@/stores/app-store";
import PinSetup from "@/components/pin-setup";
import { supabase } from "@/lib/supabase";

// ---- Types ----

interface SecurityEvent {
  id: string;
  label: string;
  device: string;
  timestamp: string;
  icon: string;
}

// ---- Mock security log ----

const MOCK_SECURITY_LOG: SecurityEvent[] = [
  {
    id: "1",
    label: "Sign in",
    device: "iPhone 15 Pro",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    icon: "✅",
  },
  {
    id: "2",
    label: "PIN unlock",
    device: "iPhone 15 Pro",
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    icon: "🔐",
  },
  {
    id: "3",
    label: "Biometric unlock",
    device: "iPhone 15 Pro",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    icon: "👆",
  },
  {
    id: "4",
    label: "Sign in",
    device: "MacBook Pro",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    icon: "✅",
  },
  {
    id: "5",
    label: "Password changed",
    device: "iPhone 15 Pro",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    icon: "🔑",
  },
];

// ---- Helper ----

function formatEventTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return format(date, "MMM d, h:mm a");
}

// ---- Sub-components ----

function SectionHeader({ title, isDark }: { title: string; isDark: boolean }) {
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
    <View
      style={{
        height: 1,
        backgroundColor: isDark ? "#334155" : "#F1F5F9",
      }}
    />
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
        paddingVertical: 14,
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
        onValueChange={onValueChange}
        trackColor={{ false: "#CBD5E1", true: "#A5B4FC" }}
        thumbColor={value ? "#4F46E5" : "#F1F5F9"}
        disabled={disabled}
      />
    </View>
  );
}

function RowAction({
  label,
  subtitle,
  onPress,
  destructive,
  isDark,
  showChevron = true,
}: {
  label: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
  isDark: boolean;
  showChevron?: boolean;
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
      {showChevron && (
        <Text
          style={{
            fontSize: 18,
            color: isDark ? "#475569" : "#CBD5E1",
          }}
        >
          ›
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ---- Main Screen ----

export default function SecurityScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const {
    isPinEnabled,
    setIsPinEnabled,
    setStoredPin,
    isBiometricEnabled,
    setIsBiometricEnabled,
    storedPin,
  } = useAppStore();

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinSetupMode, setPinSetupMode] = useState<"set" | "change">("set");

  // Check biometric availability on mount
  useEffect(() => {
    LocalAuthentication.hasHardwareAsync().then((has) => {
      if (has) {
        LocalAuthentication.isEnrolledAsync().then((enrolled) => {
          setBiometricAvailable(enrolled);
        });
      }
    });
  }, []);

  // ---- PIN Actions ----

  function handleSetPin() {
    setPinSetupMode("set");
    setShowPinSetup(true);
  }

  function handleChangePin() {
    setPinSetupMode("change");
    setShowPinSetup(true);
  }

  function handleRemovePin() {
    Alert.alert(
      "Remove PIN",
      "Are you sure you want to remove the PIN lock? The app will no longer be protected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove PIN",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setIsPinEnabled(false);
            setStoredPin(null);
            setIsBiometricEnabled(false);
          },
        },
      ]
    );
  }

  function handlePinComplete(pin: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStoredPin(pin);
    setIsPinEnabled(true);
    setShowPinSetup(false);
  }

  // ---- Biometric ----

  function handleBiometricToggle(value: boolean) {
    if (!isPinEnabled) {
      Alert.alert("PIN Required", "Please set up a PIN first before enabling biometric unlock.");
      return;
    }
    setIsBiometricEnabled(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // ---- Session ----

  function handleSignOutEverywhere() {
    Alert.alert(
      "Sign Out Everywhere",
      "This will sign you out of all devices. You will need to sign in again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out All",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await supabase.auth.signOut({ scope: "global" });
          },
        },
      ]
    );
  }

  const bgColor = isDark ? "#0F172A" : "#F8FAFC";

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
            Security
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* PIN Section */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <SectionHeader title="PIN Lock" isDark={isDark} />
            <Card isDark={isDark}>
              {!isPinEnabled ? (
                <RowAction
                  label="Set PIN"
                  subtitle="Enable 4-digit PIN protection"
                  onPress={handleSetPin}
                  isDark={isDark}
                />
              ) : (
                <>
                  <RowAction
                    label="Change PIN"
                    subtitle="Update your current PIN"
                    onPress={handleChangePin}
                    isDark={isDark}
                  />
                  <Divider isDark={isDark} />
                  <RowAction
                    label="Remove PIN"
                    subtitle="Disable PIN protection"
                    onPress={handleRemovePin}
                    destructive
                    showChevron={false}
                    isDark={isDark}
                  />
                </>
              )}
            </Card>
          </Animated.View>

          {/* Biometric Section */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <SectionHeader title="Biometric" isDark={isDark} />
            <Card isDark={isDark}>
              <RowToggle
                label="Biometric Unlock"
                subtitle={
                  biometricAvailable
                    ? "Use fingerprint or face to unlock"
                    : "Not available on this device"
                }
                value={isBiometricEnabled && isPinEnabled}
                onValueChange={handleBiometricToggle}
                disabled={!biometricAvailable || !isPinEnabled}
                isDark={isDark}
              />
            </Card>
          </Animated.View>

          {/* Sessions Section */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <SectionHeader title="Active Sessions" isDark={isDark} />
            <Card isDark={isDark}>
              <View style={{ paddingVertical: 14 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 12,
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: isDark ? "#312E81" : "#EEF2FF",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>📱</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: isDark ? "#F8FAFC" : "#0F172A",
                      }}
                    >
                      This device
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: isDark ? "#64748B" : "#94A3B8",
                        marginTop: 2,
                      }}
                    >
                      1 active session
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "#22C55E",
                    }}
                  />
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: isDark ? "#3F1515" : "#FEF2F2",
                    borderRadius: 12,
                    paddingVertical: 11,
                    alignItems: "center",
                  }}
                  onPress={handleSignOutEverywhere}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      color: "#EF4444",
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    Sign out everywhere
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          </Animated.View>

          {/* Security Log */}
          <Animated.View entering={FadeInDown.duration(400).delay(400)}>
            <SectionHeader title="Security Log" isDark={isDark} />
            <Card isDark={isDark}>
              {MOCK_SECURITY_LOG.map((event, index) => (
                <View key={event.id}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      gap: 12,
                    }}
                  >
                    <Text style={{ fontSize: 18, width: 28, textAlign: "center" }}>
                      {event.icon}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: isDark ? "#F8FAFC" : "#0F172A",
                        }}
                      >
                        {event.label}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: isDark ? "#64748B" : "#94A3B8",
                          marginTop: 1,
                        }}
                      >
                        {event.device}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 11,
                        color: isDark ? "#64748B" : "#94A3B8",
                      }}
                    >
                      {formatEventTime(event.timestamp)}
                    </Text>
                  </View>
                  {index < MOCK_SECURITY_LOG.length - 1 && (
                    <Divider isDark={isDark} />
                  )}
                </View>
              ))}
            </Card>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* PIN Setup Modal */}
      <Modal
        visible={showPinSetup}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPinSetup(false)}
      >
        <RNSafeAreaView
          style={{
            flex: 1,
            backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
          }}
        >
          {/* Modal header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? "#1E293B" : "#F1F5F9",
            }}
          >
            <TouchableOpacity
              onPress={() => setShowPinSetup(false)}
              activeOpacity={0.7}
            >
              <Text style={{ color: "#4F46E5", fontSize: 16, fontWeight: "500" }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: isDark ? "#F8FAFC" : "#0F172A",
              }}
            >
              {pinSetupMode === "set" ? "Set PIN" : "Change PIN"}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <PinSetup
            title={pinSetupMode === "set" ? "Enter new PIN" : "Enter new PIN"}
            onComplete={handlePinComplete}
            onCancel={() => setShowPinSetup(false)}
          />
        </RNSafeAreaView>
      </Modal>
    </>
  );
}
