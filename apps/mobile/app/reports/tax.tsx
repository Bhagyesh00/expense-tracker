import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
  Alert,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/stores/app-store";

// ---- Types ----

interface FinancialYear {
  label: string;
  start: string; // ISO date
  end: string;
}

interface CategoryBreakdown {
  category: string;
  icon: string;
  amount: number;
  count: number;
  gstAmount?: number;
}

interface TaxSummary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  gstTotal: number;
  categoryBreakdown: CategoryBreakdown[];
}

// ---- Mock Data ----

const MOCK_SUMMARY: TaxSummary = {
  totalIncome: 1020000,
  totalExpenses: 487500,
  netSavings: 532500,
  gstTotal: 43875,
  categoryBreakdown: [
    { category: "Food & Dining", icon: "🍔", amount: 84500, count: 112, gstAmount: 5070 },
    { category: "Transport", icon: "🚗", amount: 62000, count: 89, gstAmount: 3100 },
    { category: "Shopping", icon: "🛍", amount: 98500, count: 47, gstAmount: 17730 },
    { category: "Bills & Utilities", icon: "📄", amount: 72000, count: 24, gstAmount: 12960 },
    { category: "Entertainment", icon: "🎬", amount: 38500, count: 31, gstAmount: 5775 },
    { category: "Health", icon: "💊", amount: 42000, count: 18, gstAmount: 0 },
    { category: "Education", icon: "📚", amount: 55000, count: 6, gstAmount: 0 },
    { category: "Other", icon: "📌", amount: 35000, count: 41, gstAmount: 5250 },
  ],
};

// ---- Helpers ----

function generateFinancialYears(): FinancialYear[] {
  const years: FinancialYear[] = [];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const startYear = currentMonth >= 4 ? currentYear : currentYear - 1;

  for (let y = startYear; y >= startYear - 4; y--) {
    years.push({
      label: `FY ${y}-${(y + 1).toString().slice(-2)}`,
      start: `${y}-04-01`,
      end: `${y + 1}-03-31`,
    });
  }
  return years;
}

function formatCurrency(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

function generateCSV(fy: FinancialYear, summary: TaxSummary): string {
  const lines = [
    `ExpenseFlow Tax Export — ${fy.label}`,
    `Period: ${fy.start} to ${fy.end}`,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `SUMMARY`,
    `Total Income,₹${summary.totalIncome}`,
    `Total Expenses,₹${summary.totalExpenses}`,
    `Net Savings,₹${summary.netSavings}`,
    `Total GST,₹${summary.gstTotal}`,
    ``,
    `CATEGORY BREAKDOWN`,
    `Category,Amount,Transactions,GST`,
    ...summary.categoryBreakdown.map(
      (c) => `${c.category},₹${c.amount},${c.count},₹${c.gstAmount ?? 0}`
    ),
  ];
  return lines.join("\n");
}

function generatePDFText(fy: FinancialYear, summary: TaxSummary): string {
  const line = "─".repeat(44);
  const lines = [
    "EXPENSEFLOW — TAX REPORT",
    fy.label,
    `Period: ${fy.start} to ${fy.end}`,
    `Generated: ${new Date().toLocaleDateString("en-IN")}`,
    line,
    "FINANCIAL SUMMARY",
    line,
    `Total Income         ${formatCurrency(summary.totalIncome).padStart(12)}`,
    `Total Expenses       ${formatCurrency(summary.totalExpenses).padStart(12)}`,
    `Net Savings          ${formatCurrency(summary.netSavings).padStart(12)}`,
    `Total GST (estimate) ${formatCurrency(summary.gstTotal).padStart(12)}`,
    line,
    "CATEGORY BREAKDOWN",
    line,
    ...summary.categoryBreakdown.map(
      (c) =>
        `${(c.category + " ").padEnd(22).slice(0, 22)} ${formatCurrency(c.amount).padStart(10)}  ${c.count} txns`
    ),
    line,
    "Note: GST figures are estimates only.",
    "Consult a CA for official tax filings.",
  ];
  return lines.join("\n");
}

// ---- Sub-components ----

function SummaryCard({
  icon,
  label,
  value,
  color,
  isDark,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
  isDark: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        alignItems: "center",
        shadowColor: isDark ? "#000" : "#64748B",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.15 : 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <Text style={{ fontSize: 22, marginBottom: 6 }}>{icon}</Text>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "800",
          color,
          marginBottom: 3,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 10,
          fontWeight: "600",
          color: isDark ? "#64748B" : "#94A3B8",
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ---- Main Screen ----

export default function TaxExportScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const { isPrivateMode } = useAppStore() as any;

  const years = generateFinancialYears();
  const [selectedFY, setSelectedFY] = useState<FinancialYear>(years[0]);
  const [summary, setSummary] = useState<TaxSummary>(MOCK_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const [showFYPicker, setShowFYPicker] = useState(false);

  const bgColor = isDark ? "#0F172A" : "#F8FAFC";

  // ---- Load Data for selected FY ----

  const loadFYData = useCallback(async (fy: FinancialYear) => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // In production: fetch real expenses for the FY date range
      // const { data } = await supabase
      //   .from("expenses")
      //   .select("*")
      //   .eq("user_id", user?.id)
      //   .gte("date", fy.start)
      //   .lte("date", fy.end);

      await new Promise((r) => setTimeout(r, 800)); // Simulate fetch
      setSummary(MOCK_SUMMARY);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to load tax data.");
    } finally {
      setLoading(false);
    }
  }, []);

  function handleFYSelect(fy: FinancialYear) {
    setSelectedFY(fy);
    setShowFYPicker(false);
    loadFYData(fy);
  }

  // ---- Export ----

  async function handleExportCSV() {
    setExporting("csv");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const csv = generateCSV(selectedFY, summary);
      await Share.share({
        title: `Tax Export ${selectedFY.label}.csv`,
        message: csv,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // User cancelled
    } finally {
      setExporting(null);
    }
  }

  async function handleExportPDF() {
    setExporting("pdf");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const text = generatePDFText(selectedFY, summary);
      await Share.share({
        title: `Tax Report ${selectedFY.label}.txt`,
        message: text,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // User cancelled
    } finally {
      setExporting(null);
    }
  }

  const maskedValue = (val: string) => (isPrivateMode ? "•••••" : val);

  return (
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
        <Text style={{ fontSize: 17, fontWeight: "700", color: isDark ? "#F8FAFC" : "#0F172A" }}>
          Tax Export
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* FY Picker */}
        <Animated.View entering={FadeInDown.duration(400).delay(50)}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: isDark ? "#64748B" : "#94A3B8",
              textTransform: "uppercase",
              letterSpacing: 0.8,
              marginBottom: 10,
            }}
          >
            Financial Year
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
              borderRadius: 14,
              paddingHorizontal: 18,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
              shadowColor: isDark ? "#000" : "#64748B",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDark ? 0.2 : 0.06,
              shadowRadius: 4,
              elevation: 2,
            }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowFYPicker(!showFYPicker);
            }}
            activeOpacity={0.8}
          >
            <View>
              <Text style={{ fontSize: 16, fontWeight: "700", color: isDark ? "#F8FAFC" : "#0F172A" }}>
                📅 {selectedFY.label}
              </Text>
              <Text style={{ fontSize: 11, color: isDark ? "#64748B" : "#94A3B8", marginTop: 2 }}>
                {selectedFY.start} to {selectedFY.end}
              </Text>
            </View>
            <Text style={{ color: isDark ? "#475569" : "#CBD5E1", fontSize: 20 }}>
              {showFYPicker ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {/* FY Dropdown */}
          {showFYPicker && (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={{
                backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                borderRadius: 14,
                padding: 8,
                marginTop: -12,
                marginBottom: 20,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              {years.map((fy) => (
                <TouchableOpacity
                  key={fy.label}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderRadius: 10,
                    backgroundColor:
                      fy.label === selectedFY.label
                        ? isDark
                          ? "#312E81"
                          : "#EEF2FF"
                        : "transparent",
                  }}
                  onPress={() => handleFYSelect(fy)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color:
                        fy.label === selectedFY.label
                          ? "#4F46E5"
                          : isDark
                          ? "#F8FAFC"
                          : "#0F172A",
                    }}
                  >
                    {fy.label}
                    {fy.label === years[0].label ? " (Current)" : ""}
                  </Text>
                  <Text style={{ fontSize: 11, color: isDark ? "#64748B" : "#94A3B8", marginTop: 2 }}>
                    {fy.start} to {fy.end}
                  </Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}
        </Animated.View>

        {loading ? (
          <View style={{ alignItems: "center", paddingVertical: 60 }}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={{ color: isDark ? "#64748B" : "#94A3B8", marginTop: 12 }}>
              Loading tax data…
            </Text>
          </View>
        ) : (
          <>
            {/* Summary Cards */}
            <Animated.View entering={FadeInDown.duration(400).delay(150)}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: isDark ? "#64748B" : "#94A3B8",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 10,
                }}
              >
                Summary
              </Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                <SummaryCard
                  icon="💰"
                  label="Total Income"
                  value={maskedValue(formatCurrency(summary.totalIncome))}
                  color="#10B981"
                  isDark={isDark}
                />
                <SummaryCard
                  icon="💸"
                  label="Expenses"
                  value={maskedValue(formatCurrency(summary.totalExpenses))}
                  color="#EF4444"
                  isDark={isDark}
                />
                <SummaryCard
                  icon="🏦"
                  label="Net Savings"
                  value={maskedValue(formatCurrency(summary.netSavings))}
                  color="#4F46E5"
                  isDark={isDark}
                />
              </View>

              {/* Savings Rate */}
              <View
                style={{
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 20,
                  shadowColor: isDark ? "#000" : "#64748B",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.15 : 0.06,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#94A3B8" : "#64748B" }}>
                    Savings Rate
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#10B981" }}>
                    {isPrivateMode
                      ? "•••"
                      : `${((summary.netSavings / summary.totalIncome) * 100).toFixed(1)}%`}
                  </Text>
                </View>
                <View
                  style={{
                    height: 6,
                    backgroundColor: isDark ? "#334155" : "#E2E8F0",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: 6,
                      width: `${(summary.netSavings / summary.totalIncome) * 100}%`,
                      backgroundColor: "#10B981",
                      borderRadius: 3,
                    }}
                  />
                </View>
              </View>
            </Animated.View>

            {/* Category Breakdown */}
            <Animated.View entering={FadeInDown.duration(400).delay(250)}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: isDark ? "#64748B" : "#94A3B8",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 10,
                }}
              >
                Category Breakdown
              </Text>
              <View
                style={{
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  marginBottom: 20,
                  shadowColor: isDark ? "#000" : "#64748B",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.2 : 0.06,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                {/* Table Header */}
                <View
                  style={{
                    flexDirection: "row",
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? "#334155" : "#F1F5F9",
                  }}
                >
                  <Text style={{ flex: 1, fontSize: 11, fontWeight: "700", color: isDark ? "#64748B" : "#94A3B8" }}>
                    CATEGORY
                  </Text>
                  <Text style={{ width: 80, fontSize: 11, fontWeight: "700", color: isDark ? "#64748B" : "#94A3B8", textAlign: "right" }}>
                    AMOUNT
                  </Text>
                  <Text style={{ width: 60, fontSize: 11, fontWeight: "700", color: isDark ? "#64748B" : "#94A3B8", textAlign: "right" }}>
                    TXN
                  </Text>
                </View>

                {summary.categoryBreakdown.map((cat, i) => (
                  <View key={cat.category}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 12,
                      }}
                    >
                      <Text style={{ fontSize: 16, marginRight: 8 }}>{cat.icon}</Text>
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 13,
                          fontWeight: "600",
                          color: isDark ? "#F8FAFC" : "#0F172A",
                        }}
                        numberOfLines={1}
                      >
                        {cat.category}
                      </Text>
                      <Text
                        style={{
                          width: 80,
                          fontSize: 13,
                          fontWeight: "700",
                          color: "#EF4444",
                          textAlign: "right",
                        }}
                      >
                        {isPrivateMode ? "•••" : formatCurrency(cat.amount)}
                      </Text>
                      <Text
                        style={{
                          width: 60,
                          fontSize: 12,
                          color: isDark ? "#64748B" : "#94A3B8",
                          textAlign: "right",
                        }}
                      >
                        {cat.count}
                      </Text>
                    </View>
                    {i < summary.categoryBreakdown.length - 1 && (
                      <View style={{ height: 1, backgroundColor: isDark ? "#334155" : "#F1F5F9" }} />
                    )}
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* GST Section */}
            <Animated.View entering={FadeInDown.duration(400).delay(350)}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: isDark ? "#64748B" : "#94A3B8",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 10,
                }}
              >
                GST Summary (Estimate)
              </Text>
              <View
                style={{
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 20,
                  shadowColor: isDark ? "#000" : "#64748B",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.2 : 0.06,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <Text style={{ fontSize: 24 }}>🧾</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: isDark ? "#F8FAFC" : "#0F172A" }}>
                      Total GST Paid
                    </Text>
                    <Text style={{ fontSize: 12, color: isDark ? "#64748B" : "#94A3B8", marginTop: 1 }}>
                      Estimated from transactions
                    </Text>
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: "800", color: "#F59E0B" }}>
                    {isPrivateMode ? "•••" : formatCurrency(summary.gstTotal)}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: isDark ? "#422006" : "#FFFBEB",
                    borderRadius: 10,
                    padding: 12,
                    flexDirection: "row",
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 14 }}>ℹ️</Text>
                  <Text style={{ fontSize: 12, color: isDark ? "#FCD34D" : "#92400E", flex: 1, lineHeight: 17 }}>
                    These figures are estimates only. Please consult a Chartered Accountant for official tax filings.
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* Export Buttons */}
            <Animated.View entering={FadeInDown.duration(400).delay(450)}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: isDark ? "#64748B" : "#94A3B8",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 12,
                }}
              >
                Export
              </Text>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: exporting === "csv" ? (isDark ? "#134E4A" : "#ECFDF5") : "#10B981",
                    borderRadius: 14,
                    paddingVertical: 15,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                  }}
                  onPress={handleExportCSV}
                  disabled={!!exporting}
                  activeOpacity={0.8}
                >
                  {exporting === "csv" ? (
                    <ActivityIndicator color={isDark ? "#6EE7B7" : "#10B981"} size="small" />
                  ) : (
                    <Text style={{ fontSize: 16 }}>📊</Text>
                  )}
                  <Text
                    style={{
                      color: exporting === "csv"
                        ? isDark ? "#6EE7B7" : "#059669"
                        : "#FFFFFF",
                      fontSize: 14,
                      fontWeight: "700",
                    }}
                  >
                    {exporting === "csv" ? "Exporting…" : "Share CSV"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: exporting === "pdf" ? (isDark ? "#1E1B4B" : "#EEF2FF") : "#4F46E5",
                    borderRadius: 14,
                    paddingVertical: 15,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                  }}
                  onPress={handleExportPDF}
                  disabled={!!exporting}
                  activeOpacity={0.8}
                >
                  {exporting === "pdf" ? (
                    <ActivityIndicator color={isDark ? "#A5B4FC" : "#4F46E5"} size="small" />
                  ) : (
                    <Text style={{ fontSize: 16 }}>📄</Text>
                  )}
                  <Text
                    style={{
                      color: exporting === "pdf"
                        ? isDark ? "#A5B4FC" : "#4F46E5"
                        : "#FFFFFF",
                      fontSize: 14,
                      fontWeight: "700",
                    }}
                  >
                    {exporting === "pdf" ? "Exporting…" : "Share PDF"}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
