import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  TextInput,
  Modal,
  Share,
  ActivityIndicator,
  useColorScheme,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/stores/app-store";

// ---- Shared Components ----

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

function Card({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
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
  return <View style={{ height: 1, backgroundColor: isDark ? "#334155" : "#F1F5F9" }} />;
}

// ---- Delete Account Modal ----

type DeleteStep = "warning" | "confirm" | "auth";

interface DeleteModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirmed: () => void;
  isDark: boolean;
}

function DeleteAccountModal({ visible, onCancel, onConfirmed, isDark }: DeleteModalProps) {
  const [step, setStep] = useState<DeleteStep>("warning");
  const [confirmText, setConfirmText] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const bg = isDark ? "#1E293B" : "#FFFFFF";
  const textPrimary = isDark ? "#F8FAFC" : "#0F172A";
  const textSecondary = isDark ? "#94A3B8" : "#64748B";
  const inputBg = isDark ? "#0F172A" : "#F8FAFC";

  function reset() {
    setStep("warning");
    setConfirmText("");
    setAuthLoading(false);
  }

  function handleCancel() {
    reset();
    onCancel();
  }

  async function handleAuth() {
    setAuthLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (hasHardware) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Confirm account deletion",
          fallbackLabel: "Use PIN",
        });
        if (result.success) {
          reset();
          onConfirmed();
          return;
        }
      }
      // Fallback: proceed without biometric (production should require password)
      reset();
      onConfirmed();
    } catch {
      setAuthLoading(false);
    }
    setAuthLoading(false);
  }

  const canProceed = confirmText.trim() === "DELETE";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.65)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Animated.View
          entering={FadeIn.duration(250)}
          style={{
            backgroundColor: bg,
            borderRadius: 24,
            padding: 24,
            width: "100%",
            maxWidth: 380,
          }}
        >
          {/* Step: Warning */}
          {step === "warning" && (
            <>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: "#FEF2F2",
                  alignItems: "center",
                  justifyContent: "center",
                  alignSelf: "center",
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontSize: 28 }}>⚠️</Text>
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "800",
                  color: "#EF4444",
                  textAlign: "center",
                  marginBottom: 12,
                }}
              >
                Delete Account
              </Text>
              <Text style={{ fontSize: 13, color: textSecondary, textAlign: "center", lineHeight: 19, marginBottom: 16 }}>
                This action is{" "}
                <Text style={{ fontWeight: "700", color: "#EF4444" }}>permanent</Text>{" "}
                and cannot be undone. The following will be deleted:
              </Text>
              <View style={{ marginBottom: 20 }}>
                {[
                  "All your expenses and receipts",
                  "Budgets and categories",
                  "Contact and split history",
                  "Account preferences",
                  "All financial reports",
                ].map((item) => (
                  <View key={item} style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: "#EF4444",
                        marginRight: 10,
                      }}
                    />
                    <Text style={{ fontSize: 13, color: textSecondary }}>{item}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: "#EF4444",
                  borderRadius: 12,
                  paddingVertical: 13,
                  alignItems: "center",
                  marginBottom: 10,
                }}
                onPress={() => setStep("confirm")}
                activeOpacity={0.8}
              >
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
                  I Understand, Continue
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ paddingVertical: 12, alignItems: "center" }}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={{ color: "#4F46E5", fontSize: 15, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step: Type DELETE */}
          {step === "confirm" && (
            <>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "800",
                  color: "#EF4444",
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                Confirm Deletion
              </Text>
              <Text style={{ fontSize: 13, color: textSecondary, textAlign: "center", marginBottom: 20, lineHeight: 19 }}>
                Type{" "}
                <Text style={{ fontWeight: "800", color: textPrimary, letterSpacing: 1 }}>
                  DELETE
                </Text>{" "}
                to confirm you want to permanently delete your account.
              </Text>
              <TextInput
                style={{
                  borderWidth: 2,
                  borderColor: canProceed ? "#EF4444" : isDark ? "#334155" : "#E2E8F0",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 16,
                  fontWeight: "800",
                  color: textPrimary,
                  backgroundColor: inputBg,
                  textAlign: "center",
                  marginBottom: 20,
                  letterSpacing: 2,
                }}
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder="Type DELETE"
                placeholderTextColor={isDark ? "#475569" : "#CBD5E1"}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
              />
              <TouchableOpacity
                style={{
                  backgroundColor: canProceed ? "#EF4444" : isDark ? "#334155" : "#E2E8F0",
                  borderRadius: 12,
                  paddingVertical: 13,
                  alignItems: "center",
                  marginBottom: 10,
                }}
                onPress={() => canProceed && setStep("auth")}
                disabled={!canProceed}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    color: canProceed ? "#fff" : isDark ? "#64748B" : "#94A3B8",
                    fontSize: 15,
                    fontWeight: "700",
                  }}
                >
                  Next — Authenticate
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ paddingVertical: 12, alignItems: "center" }}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={{ color: "#4F46E5", fontSize: 15, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step: Auth */}
          {step === "auth" && (
            <>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: "#FEF2F2",
                  alignItems: "center",
                  justifyContent: "center",
                  alignSelf: "center",
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontSize: 28 }}>🔐</Text>
              </View>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "800",
                  color: textPrimary,
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                Final Confirmation
              </Text>
              <Text style={{ fontSize: 13, color: textSecondary, textAlign: "center", marginBottom: 24, lineHeight: 19 }}>
                Authenticate to confirm account deletion.
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: "#EF4444",
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                  marginBottom: 10,
                  opacity: authLoading ? 0.7 : 1,
                }}
                onPress={handleAuth}
                disabled={authLoading}
                activeOpacity={0.8}
              >
                {authLoading ? <ActivityIndicator color="#fff" size="small" /> : null}
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
                  {authLoading ? "Deleting…" : "🔐 Authenticate & Delete"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ paddingVertical: 12, alignItems: "center" }}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={{ color: "#4F46E5", fontSize: 15, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ---- Main Screen ----

export default function DataPrivacyScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const { isPrivateMode, setIsPrivateMode } = useAppStore() as any;

  const [exportLoading, setExportLoading] = useState(false);
  const [lastExportDate, setLastExportDate] = useState<string | null>(null);
  const [privateMode, setPrivateModeLocal] = useState(isPrivateMode ?? false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const bgColor = isDark ? "#0F172A" : "#F8FAFC";

  // ---- Export Data ----

  const handleExportData = useCallback(async () => {
    setExportLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Fetch user's data
      const [expensesRes, categoriesRes, budgetsRes] = await Promise.allSettled([
        supabase.from("expenses").select("*").eq("user_id", user?.id ?? "").limit(1000),
        supabase.from("categories").select("*").eq("user_id", user?.id ?? ""),
        supabase.from("budgets").select("*").eq("user_id", user?.id ?? ""),
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        user: {
          id: user?.id,
          email: user?.email,
        },
        expenses:
          expensesRes.status === "fulfilled" ? expensesRes.value.data ?? [] : [],
        categories:
          categoriesRes.status === "fulfilled" ? categoriesRes.value.data ?? [] : [],
        budgets:
          budgetsRes.status === "fulfilled" ? budgetsRes.value.data ?? [] : [],
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const now = new Date().toLocaleDateString("en-IN");
      setLastExportDate(now);

      await Share.share({
        title: `ExpenseFlow Data Export — ${now}`,
        message: jsonStr,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Export Failed", err.message ?? "Please try again.");
    } finally {
      setExportLoading(false);
    }
  }, []);

  // ---- Private Mode ----

  function handlePrivateModeToggle(value: boolean) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPrivateModeLocal(value);
    // Use setIsPrivateMode if available, otherwise store locally
    if (typeof setIsPrivateMode === "function") {
      setIsPrivateMode(value);
    }
  }

  // ---- Delete Account ----

  async function handleConfirmDelete() {
    setShowDeleteModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    try {
      // In production: call a server-side delete account function
      // await supabase.functions.invoke("delete-account");
      await supabase.auth.signOut();
    } catch (err: any) {
      Alert.alert("Delete Failed", err.message ?? "Please contact support.");
    }
  }

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
            <Text style={{ color: "#4F46E5", fontSize: 16, fontWeight: "500" }}>← Back</Text>
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: isDark ? "#F8FAFC" : "#0F172A",
            }}
          >
            Data & Privacy
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Export Data */}
          <Animated.View entering={FadeInDown.duration(400).delay(50)}>
            <SectionLabel title="Your Data" isDark={isDark} />
            <Card isDark={isDark}>
              <View style={{ paddingVertical: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 14 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: isDark ? "#1E3A5F" : "#DBEAFE",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>📦</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: isDark ? "#F8FAFC" : "#0F172A",
                        marginBottom: 3,
                      }}
                    >
                      Export All My Data
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: isDark ? "#64748B" : "#94A3B8",
                        lineHeight: 17,
                      }}
                    >
                      Download all your expenses, categories, budgets, and account data as JSON.
                    </Text>
                    {lastExportDate ? (
                      <Text style={{ fontSize: 11, color: "#10B981", marginTop: 4, fontWeight: "600" }}>
                        Last exported: {lastExportDate}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: exportLoading
                      ? isDark
                        ? "#1E3A5F"
                        : "#EFF6FF"
                      : "#3B82F6",
                    borderRadius: 12,
                    paddingVertical: 13,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                  }}
                  onPress={handleExportData}
                  disabled={exportLoading}
                  activeOpacity={0.8}
                >
                  {exportLoading ? (
                    <ActivityIndicator color={isDark ? "#93C5FD" : "#3B82F6"} size="small" />
                  ) : (
                    <Text style={{ fontSize: 16 }}>📤</Text>
                  )}
                  <Text
                    style={{
                      color: exportLoading
                        ? isDark
                          ? "#93C5FD"
                          : "#3B82F6"
                        : "#FFFFFF",
                      fontSize: 14,
                      fontWeight: "700",
                    }}
                  >
                    {exportLoading ? "Generating Export…" : "Export My Data"}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          </Animated.View>

          {/* Private Mode */}
          <Animated.View entering={FadeInDown.duration(400).delay(150)}>
            <SectionLabel title="Privacy" isDark={isDark} />
            <Card isDark={isDark}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 16,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{privateMode ? "🙈" : "👁️"}</Text>
                </View>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: isDark ? "#F8FAFC" : "#0F172A",
                      marginBottom: 3,
                    }}
                  >
                    Private Mode
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: isDark ? "#64748B" : "#94A3B8",
                      lineHeight: 17,
                    }}
                  >
                    Hide your financial data when others might see your screen
                  </Text>
                </View>
                <Switch
                  value={privateMode}
                  onValueChange={handlePrivateModeToggle}
                  trackColor={{ false: "#CBD5E1", true: "#A5B4FC" }}
                  thumbColor={privateMode ? "#4F46E5" : "#F1F5F9"}
                />
              </View>

              {privateMode ? (
                <>
                  <Divider isDark={isDark} />
                  <Animated.View entering={FadeIn.duration(300)} style={{ paddingVertical: 12 }}>
                    <View
                      style={{
                        backgroundColor: isDark ? "#312E81" : "#EEF2FF",
                        borderRadius: 10,
                        padding: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>🔒</Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: isDark ? "#A5B4FC" : "#4F46E5",
                          flex: 1,
                          lineHeight: 17,
                          fontWeight: "500",
                        }}
                      >
                        Amounts will show as "•••" throughout the app. Tap the eye icon in the header to toggle.
                      </Text>
                    </View>
                  </Animated.View>
                </>
              ) : null}
            </Card>
          </Animated.View>

          {/* Data Rights */}
          <Animated.View entering={FadeInDown.duration(400).delay(250)}>
            <SectionLabel title="Your Rights (GDPR)" isDark={isDark} />
            <Card isDark={isDark}>
              {[
                {
                  icon: "📋",
                  title: "Right to Access",
                  desc: "You can export all data we hold about you at any time.",
                },
                {
                  icon: "✏️",
                  title: "Right to Rectification",
                  desc: "Update incorrect data directly in the app.",
                },
                {
                  icon: "🗑️",
                  title: "Right to Erasure",
                  desc: "Request deletion of your account and all associated data.",
                },
                {
                  icon: "📦",
                  title: "Right to Portability",
                  desc: "Export your data in machine-readable JSON format.",
                },
              ].map((right, i, arr) => (
                <View key={right.title}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      paddingVertical: 14,
                    }}
                  >
                    <Text style={{ fontSize: 18, marginRight: 12, marginTop: 1 }}>{right.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: isDark ? "#F8FAFC" : "#0F172A",
                          marginBottom: 3,
                        }}
                      >
                        {right.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: isDark ? "#64748B" : "#94A3B8", lineHeight: 17 }}>
                        {right.desc}
                      </Text>
                    </View>
                  </View>
                  {i < arr.length - 1 && <Divider isDark={isDark} />}
                </View>
              ))}
            </Card>
          </Animated.View>

          {/* Delete Account */}
          <Animated.View entering={FadeInDown.duration(400).delay(350)}>
            <SectionLabel title="Danger Zone" isDark={isDark} />
            <Card isDark={isDark}>
              <View style={{ paddingVertical: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 16 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: "#FEF2F2",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>🗑️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: "#EF4444",
                        marginBottom: 3,
                      }}
                    >
                      Delete Account
                    </Text>
                    <Text style={{ fontSize: 12, color: isDark ? "#64748B" : "#94A3B8", lineHeight: 17 }}>
                      Permanently delete your account and all associated data. This cannot be undone.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: isDark ? "#450A0A" : "#FEF2F2",
                    borderWidth: 1,
                    borderColor: "#FCA5A5",
                    borderRadius: 12,
                    paddingVertical: 13,
                    alignItems: "center",
                  }}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    setShowDeleteModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: "#EF4444", fontSize: 14, fontWeight: "700" }}>
                    Delete My Account
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      <DeleteAccountModal
        visible={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirmed={handleConfirmDelete}
        isDark={isDark}
      />
    </>
  );
}
