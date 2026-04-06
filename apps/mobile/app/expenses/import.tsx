import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
  useColorScheme,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = 1 | 2 | 3;

const CSV_FIELD_OPTIONS = [
  "Date",
  "Amount",
  "Description",
  "Category",
  "Type",
  "Notes",
  "-- Skip --",
] as const;

type CsvField = (typeof CSV_FIELD_OPTIONS)[number];

interface CsvRow {
  [key: string]: string;
}

interface ColumnMapping {
  csvColumn: string;
  mappedTo: CsvField;
}

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

function StepIndicator({
  currentStep,
  isDark,
}: {
  currentStep: Step;
  isDark: boolean;
}) {
  const steps: { num: Step; label: string }[] = [
    { num: 1, label: "Choose File" },
    { num: 2, label: "Map Columns" },
    { num: 3, label: "Import" },
  ];

  return (
    <View className="flex-row items-center px-5 py-4">
      {steps.map((s, i) => (
        <View key={s.num} className="flex-row items-center flex-1">
          <View className="items-center">
            <View
              className={`w-8 h-8 rounded-full items-center justify-center ${
                currentStep > s.num
                  ? "bg-green-500"
                  : currentStep === s.num
                    ? "bg-primary-600"
                    : isDark
                      ? "bg-slate-700"
                      : "bg-slate-200"
              }`}
            >
              {currentStep > s.num ? (
                <Text className="text-white text-xs font-bold">✓</Text>
              ) : (
                <Text
                  className={`text-xs font-bold ${
                    currentStep === s.num
                      ? "text-white"
                      : isDark
                        ? "text-slate-500"
                        : "text-slate-400"
                  }`}
                >
                  {s.num}
                </Text>
              )}
            </View>
            <Text
              className={`text-[10px] font-medium mt-1 ${
                currentStep === s.num
                  ? "text-primary-600"
                  : isDark
                    ? "text-slate-500"
                    : "text-slate-400"
              }`}
            >
              {s.label}
            </Text>
          </View>
          {i < steps.length - 1 && (
            <View
              className={`flex-1 h-0.5 mx-1 mb-4 ${
                currentStep > s.num
                  ? "bg-green-400"
                  : isDark
                    ? "bg-slate-700"
                    : "bg-slate-200"
              }`}
            />
          )}
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sample CSV content
// ---------------------------------------------------------------------------

const SAMPLE_CSV = `Date,Amount,Description,Category,Type,Notes
2026-03-01,500,Swiggy order,Food & Dining,expense,Lunch
2026-03-02,1200,Uber ride,Transport,expense,Office commute
2026-03-03,45000,Salary,Income,income,March salary
2026-03-04,299,Netflix,Entertainment,expense,Monthly subscription
2026-03-05,2500,BigBasket,Groceries,expense,Monthly groceries`;

// ---------------------------------------------------------------------------
// Field picker row
// ---------------------------------------------------------------------------

function ColumnMappingRow({
  mapping,
  onChangeMappedTo,
  isDark,
}: {
  mapping: ColumnMapping;
  onChangeMappedTo: (csvCol: string, field: CsvField) => void;
  isDark: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);

  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardBg = isDark ? "bg-slate-800" : "bg-slate-50";
  const borderColor = isDark ? "border-slate-700" : "border-slate-200";

  return (
    <View className={`rounded-2xl p-4 mb-3 ${cardBg} border ${borderColor}`}>
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-1">
          <Text className={`text-xs ${textSecondary} mb-0.5`}>CSV Column</Text>
          <Text
            className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
          >
            {mapping.csvColumn}
          </Text>
        </View>
        <Text className={`text-lg mx-3 ${textSecondary}`}>→</Text>
        <View className="flex-1">
          <Text className={`text-xs ${textSecondary} mb-0.5`}>Maps To</Text>
          <TouchableOpacity
            onPress={() => setShowPicker(!showPicker)}
            className={`flex-row items-center justify-between rounded-xl px-3 py-2 ${
              isDark ? "bg-slate-700" : "bg-white"
            } border ${borderColor}`}
            activeOpacity={0.7}
          >
            <Text
              className={`text-sm font-medium ${
                mapping.mappedTo === "-- Skip --"
                  ? textSecondary
                  : "text-primary-600"
              }`}
            >
              {mapping.mappedTo}
            </Text>
            <Text className={`text-xs ${textSecondary}`}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showPicker && (
        <Animated.View
          entering={FadeInDown.duration(200)}
          className={`mt-2 rounded-xl overflow-hidden border ${borderColor}`}
        >
          {CSV_FIELD_OPTIONS.map((field, i) => (
            <TouchableOpacity
              key={field}
              onPress={() => {
                onChangeMappedTo(mapping.csvColumn, field);
                setShowPicker(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              className={`px-4 py-3 flex-row items-center justify-between ${
                i < CSV_FIELD_OPTIONS.length - 1
                  ? `border-b ${borderColor}`
                  : ""
              } ${isDark ? "bg-slate-700" : "bg-white"}`}
              activeOpacity={0.7}
            >
              <Text
                className={`text-sm ${
                  mapping.mappedTo === field
                    ? "font-semibold text-primary-600"
                    : isDark
                      ? "text-slate-300"
                      : "text-slate-700"
                }`}
              >
                {field}
              </Text>
              {mapping.mappedTo === field && (
                <Text className="text-primary-600 text-xs">✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Preview row
// ---------------------------------------------------------------------------

function PreviewRow({
  row,
  index,
  mappings,
  isDark,
}: {
  row: CsvRow;
  index: number;
  mappings: ColumnMapping[];
  isDark: boolean;
}) {
  const cardBg = isDark ? "bg-slate-800" : "bg-white";
  const borderColor = isDark ? "border-slate-700" : "border-slate-100";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";

  const getMapped = (field: CsvField): string => {
    const mapping = mappings.find((m) => m.mappedTo === field);
    if (!mapping) return "";
    return row[mapping.csvColumn] ?? "";
  };

  const amount = getMapped("Amount");
  const description = getMapped("Description");
  const date = getMapped("Date");
  const category = getMapped("Category");
  const type = getMapped("Type");

  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(index * 60)}
      className={`rounded-2xl p-4 mb-2 border ${cardBg} ${borderColor}`}
    >
      <View className="flex-row items-start justify-between mb-1">
        <Text
          className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"} flex-1 mr-3`}
          numberOfLines={1}
        >
          {description || "No description"}
        </Text>
        <Text
          className={`text-sm font-bold ${
            type?.toLowerCase() === "income" ? "text-green-600" : "text-red-500"
          }`}
        >
          {type?.toLowerCase() === "income" ? "+" : "-"}₹{amount || "0"}
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        {date ? (
          <View
            className={`px-2 py-0.5 rounded-full ${isDark ? "bg-slate-700" : "bg-slate-100"}`}
          >
            <Text className={`text-[10px] font-medium ${textSecondary}`}>
              {date}
            </Text>
          </View>
        ) : null}
        {category ? (
          <View className="px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30">
            <Text className="text-[10px] font-medium text-primary-700 dark:text-primary-300">
              {category}
            </Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function CsvImportScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState<string>("");
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    skipped: number;
    errors: number;
  } | null>(null);
  const [importProgress, setImportProgress] = useState(0);

  const bgColor = isDark ? "bg-slate-900" : "bg-white";
  const cardBg = isDark ? "bg-slate-800" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const borderColor = isDark ? "border-slate-700" : "border-slate-200";

  // Parse CSV string into rows
  function parseCsv(content: string): { headers: string[]; rows: CsvRow[] } {
    const lines = content.trim().split("\n");
    if (lines.length < 2) return { headers: [], rows: [] };

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const rows: CsvRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
      const row: CsvRow = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] ?? "";
      });
      rows.push(row);
    }

    return { headers, rows };
  }

  // Auto-map columns by name similarity
  function autoMapColumns(headers: string[]): ColumnMapping[] {
    return headers.map((h) => {
      const lower = h.toLowerCase();
      let mappedTo: CsvField = "-- Skip --";

      if (lower.includes("date") || lower.includes("time")) mappedTo = "Date";
      else if (lower.includes("amount") || lower.includes("price") || lower.includes("cost"))
        mappedTo = "Amount";
      else if (
        lower.includes("desc") ||
        lower.includes("narr") ||
        lower.includes("particulars") ||
        lower.includes("detail")
      )
        mappedTo = "Description";
      else if (lower.includes("cat") || lower.includes("type_name"))
        mappedTo = "Category";
      else if (lower.includes("type") || lower.includes("debit") || lower.includes("credit"))
        mappedTo = "Type";
      else if (lower.includes("note") || lower.includes("remark") || lower.includes("comment"))
        mappedTo = "Notes";

      return { csvColumn: h, mappedTo };
    });
  }

  const handlePickFile = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "text/plain"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) return;

      setFileName(asset.name);

      // Read file content
      const response = await fetch(asset.uri);
      const text = await response.text();
      const { headers, rows } = parseCsv(text);

      if (headers.length === 0) {
        Alert.alert("Invalid File", "The selected file doesn't appear to be a valid CSV.");
        return;
      }

      setCsvHeaders(headers);
      setCsvRows(rows);
      setColumnMappings(autoMapColumns(headers));
      setStep(2);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to read the file. Please try again.");
    }
  }, []);

  const handleSampleDownload = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: SAMPLE_CSV,
        title: "ExpenseFlow Sample CSV",
      });
    } catch {
      // User cancelled
    }
  }, []);

  const handleUpdateMapping = useCallback(
    (csvColumn: string, field: CsvField) => {
      setColumnMappings((prev) =>
        prev.map((m) => (m.csvColumn === csvColumn ? { ...m, mappedTo: field } : m)),
      );
    },
    [],
  );

  const handleProceedToPreview = useCallback(() => {
    const hasAmount = columnMappings.some((m) => m.mappedTo === "Amount");
    const hasDate = columnMappings.some((m) => m.mappedTo === "Date");

    if (!hasAmount) {
      Alert.alert(
        "Missing Amount",
        "Please map a column to 'Amount' before proceeding.",
      );
      return;
    }
    if (!hasDate) {
      Alert.alert(
        "Missing Date",
        "Please map a column to 'Date' before proceeding.",
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep(3);
  }, [columnMappings]);

  const handleImport = useCallback(async () => {
    setIsImporting(true);
    setImportProgress(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let success = 0;
    let errors = 0;
    let skipped = 0;

    // Simulate progressive import
    for (let i = 0; i < csvRows.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 40));
      setImportProgress(Math.round(((i + 1) / csvRows.length) * 100));

      // TODO: Call API to save each row
      const amountMapping = columnMappings.find((m) => m.mappedTo === "Amount");
      const amountStr = amountMapping ? csvRows[i][amountMapping.csvColumn] : "";
      const amount = parseFloat(amountStr);

      if (isNaN(amount) || amount <= 0) {
        skipped++;
      } else {
        success++;
      }
    }

    setImportResult({ success, skipped, errors });
    setIsImporting(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [csvRows, columnMappings]);

  const previewRows = csvRows.slice(0, 5);

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        className={`flex-row items-center justify-between px-5 py-3 border-b ${borderColor}`}
      >
        <TouchableOpacity
          onPress={() => {
            if (step > 1) {
              setStep((prev) => (prev - 1) as Step);
            } else {
              router.back();
            }
          }}
          activeOpacity={0.7}
          className={`w-9 h-9 rounded-xl items-center justify-center ${
            isDark ? "bg-slate-800" : "bg-slate-100"
          }`}
        >
          <Text className={textPrimary}>←</Text>
        </TouchableOpacity>
        <Text className={`text-lg font-bold ${textPrimary}`}>Import CSV</Text>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text className={`text-sm font-medium ${textSecondary}`}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Step Indicator */}
      <StepIndicator currentStep={step} isDark={isDark} />

      {/* Step 1: Choose File */}
      {step === 1 && (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <Text className={`text-xl font-bold ${textPrimary} mb-2`}>
              Choose a CSV File
            </Text>
            <Text className={`text-sm ${textSecondary} mb-8 leading-5`}>
              Import your expenses from a CSV file. Make sure it has headers in
              the first row.
            </Text>

            {/* File Picker Button */}
            <TouchableOpacity
              onPress={handlePickFile}
              className={`rounded-3xl border-2 border-dashed py-12 items-center mb-6 ${
                isDark ? "border-slate-600" : "border-slate-300"
              }`}
              activeOpacity={0.7}
              style={{
                backgroundColor: isDark
                  ? "rgba(99,102,241,0.05)"
                  : "rgba(99,102,241,0.03)",
              }}
            >
              <Text className="text-5xl mb-4">📂</Text>
              <Text className={`text-base font-semibold ${textPrimary} mb-1`}>
                Tap to Select File
              </Text>
              <Text className={`text-xs ${textSecondary}`}>
                Supports .csv files
              </Text>
            </TouchableOpacity>

            {/* Sample CSV */}
            <View
              className={`${cardBg} rounded-2xl p-5 mb-6 border ${borderColor}`}
            >
              <Text className={`text-sm font-semibold ${textPrimary} mb-2`}>
                Need a template?
              </Text>
              <Text className={`text-xs ${textSecondary} mb-3 leading-5`}>
                Download our sample CSV to see the expected format for importing
                expenses.
              </Text>
              <TouchableOpacity
                onPress={handleSampleDownload}
                className="bg-primary-600 rounded-xl py-3 items-center"
                activeOpacity={0.8}
              >
                <Text className="text-white text-sm font-semibold">
                  Share Sample CSV
                </Text>
              </TouchableOpacity>
            </View>

            {/* Format hints */}
            <View
              className={`${cardBg} rounded-2xl p-5 border ${borderColor}`}
            >
              <Text
                className={`text-xs font-bold uppercase tracking-wider ${textSecondary} mb-3`}
              >
                Supported Columns
              </Text>
              {["Date", "Amount", "Description", "Category", "Type", "Notes"].map(
                (col) => (
                  <View
                    key={col}
                    className="flex-row items-center mb-2"
                  >
                    <View className="w-2 h-2 rounded-full bg-primary-500 mr-3" />
                    <Text className={`text-sm ${textPrimary}`}>{col}</Text>
                  </View>
                ),
              )}
            </View>
          </Animated.View>
        </ScrollView>
      )}

      {/* Step 2: Map Columns */}
      {step === 2 && (
        <>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInDown.duration(400).delay(50)}>
              <Text className={`text-xl font-bold ${textPrimary} mb-1`}>
                Map Columns
              </Text>
              <Text className={`text-sm ${textSecondary} mb-6 leading-5`}>
                Tell us what each column in your CSV means. File:{" "}
                <Text className="font-semibold">{fileName}</Text> —{" "}
                {csvRows.length} rows
              </Text>
            </Animated.View>

            {columnMappings.map((mapping, i) => (
              <Animated.View
                key={mapping.csvColumn}
                entering={FadeInRight.duration(300).delay(i * 60)}
              >
                <ColumnMappingRow
                  mapping={mapping}
                  onChangeMappedTo={handleUpdateMapping}
                  isDark={isDark}
                />
              </Animated.View>
            ))}
          </ScrollView>

          <View className={`px-5 py-4 border-t ${borderColor}`}>
            <TouchableOpacity
              onPress={handleProceedToPreview}
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
              <Text className="text-white font-bold text-base">
                Preview Import →
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Step 3: Import */}
      {step === 3 && (
        <>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInDown.duration(400).delay(50)}>
              <Text className={`text-xl font-bold ${textPrimary} mb-1`}>
                Preview & Import
              </Text>
              <Text className={`text-sm ${textSecondary} mb-6 leading-5`}>
                First 5 rows preview. Total: {csvRows.length} expenses to
                import.
              </Text>
            </Animated.View>

            {importResult ? (
              <Animated.View
                entering={FadeIn.duration(500)}
                className={`${cardBg} rounded-3xl p-6 mb-6 border ${borderColor} items-center`}
              >
                <Text className="text-5xl mb-4">
                  {importResult.errors === 0 ? "✅" : "⚠️"}
                </Text>
                <Text className={`text-lg font-bold ${textPrimary} mb-4`}>
                  Import Complete
                </Text>
                <View className="flex-row gap-4 w-full justify-center">
                  <View className="items-center bg-green-50 dark:bg-green-900/20 rounded-2xl px-6 py-4 flex-1">
                    <Text className="text-2xl font-bold text-green-600">
                      {importResult.success}
                    </Text>
                    <Text className="text-xs text-green-600 font-medium">
                      Imported
                    </Text>
                  </View>
                  <View className="items-center bg-amber-50 dark:bg-amber-900/20 rounded-2xl px-6 py-4 flex-1">
                    <Text className="text-2xl font-bold text-amber-600">
                      {importResult.skipped}
                    </Text>
                    <Text className="text-xs text-amber-600 font-medium">
                      Skipped
                    </Text>
                  </View>
                  {importResult.errors > 0 && (
                    <View className="items-center bg-red-50 dark:bg-red-900/20 rounded-2xl px-6 py-4 flex-1">
                      <Text className="text-2xl font-bold text-red-600">
                        {importResult.errors}
                      </Text>
                      <Text className="text-xs text-red-600 font-medium">
                        Errors
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => router.back()}
                  className="mt-6 bg-primary-600 rounded-2xl py-4 px-10"
                  activeOpacity={0.8}
                >
                  <Text className="text-white font-bold">Done</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <>
                {/* Progress bar (when importing) */}
                {isImporting && (
                  <Animated.View
                    entering={FadeIn.duration(300)}
                    className={`${cardBg} rounded-2xl p-4 mb-4 border ${borderColor}`}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Text
                        className={`text-sm font-semibold ${textPrimary}`}
                      >
                        Importing...
                      </Text>
                      <Text className="text-sm font-bold text-primary-600">
                        {importProgress}%
                      </Text>
                    </View>
                    <View
                      className={`h-2 rounded-full ${
                        isDark ? "bg-slate-700" : "bg-slate-200"
                      } overflow-hidden`}
                    >
                      <Animated.View
                        className="h-full rounded-full bg-primary-600"
                        style={{ width: `${importProgress}%` }}
                      />
                    </View>
                    <Text className={`text-xs ${textSecondary} mt-1.5`}>
                      Processing {Math.ceil((importProgress / 100) * csvRows.length)} of{" "}
                      {csvRows.length} expenses
                    </Text>
                  </Animated.View>
                )}

                {previewRows.map((row, i) => (
                  <PreviewRow
                    key={i}
                    row={row}
                    index={i}
                    mappings={columnMappings}
                    isDark={isDark}
                  />
                ))}

                {csvRows.length > 5 && (
                  <Animated.View entering={FadeIn.duration(300)}>
                    <Text
                      className={`text-xs ${textSecondary} text-center py-3`}
                    >
                      + {csvRows.length - 5} more expenses
                    </Text>
                  </Animated.View>
                )}
              </>
            )}
          </ScrollView>

          {!importResult && (
            <View className={`px-5 py-4 border-t ${borderColor}`}>
              <TouchableOpacity
                onPress={handleImport}
                disabled={isImporting}
                className={`rounded-2xl py-4 items-center ${
                  isImporting ? "bg-primary-400" : "bg-primary-600"
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
                {isImporting ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text className="text-white font-bold text-base">
                      Importing {importProgress}%...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-white font-bold text-base">
                    Import {csvRows.length} Expenses
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}
