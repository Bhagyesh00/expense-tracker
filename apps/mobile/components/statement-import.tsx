import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  useColorScheme,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

// ---- Types ----

type ImportStep = "select_file" | "map_columns" | "preview" | "importing" | "done";
type FileFormat = "csv" | "ofx" | "qif";

interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  selected: boolean;
}

interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
  category: string;
}

// ---- Mock Data ----

const MOCK_CSV_COLUMNS = ["Date", "Narration", "Withdrawal Amt", "Deposit Amt", "Category", "Reference"];

const MOCK_PARSED: ParsedTransaction[] = [
  { id: "p-1", date: "30/03/2026", description: "SWIGGY*ORDER", amount: 450, category: "Food", selected: true },
  { id: "p-2", date: "29/03/2026", description: "ELECTRICITY BILL", amount: 2100, category: "Bills", selected: true },
  { id: "p-3", date: "28/03/2026", description: "NETFLIX.COM", amount: 699, category: "Entertainment", selected: true },
  { id: "p-4", date: "28/03/2026", description: "AMAZON.IN", amount: 1299, category: "Shopping", selected: true },
  { id: "p-5", date: "27/03/2026", description: "UBER TRIP", amount: 220, category: "Transport", selected: true },
  { id: "p-6", date: "26/03/2026", description: "PHONE RECHARGE", amount: 3500, category: "Bills", selected: false },
  { id: "p-7", date: "25/03/2026", description: "RENT PAYMENT", amount: 15000, category: "Housing", selected: true },
];

// ---- Component ----

export default function StatementImport() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [step, setStep] = useState<ImportStep>("select_file");
  const [selectedFormat, setSelectedFormat] = useState<FileFormat | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    date: "Date",
    description: "Narration",
    amount: "Withdrawal Amt",
    category: "Category",
  });
  const [transactions, setTransactions] = useState(MOCK_PARSED);
  const [importProgress, setImportProgress] = useState(0);

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardBg = isDark ? "bg-slate-800" : "bg-white";
  const inputBg = isDark ? "bg-slate-700 border-slate-600" : "bg-slate-50 border-slate-200";

  const selectedCount = transactions.filter((t) => t.selected).length;

  function handleSelectFile(format: FileFormat) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedFormat(format);
    // In production, would use DocumentPicker here
    // Simulate file selection
    if (format === "csv") {
      setStep("map_columns");
    } else {
      // OFX/QIF don't need column mapping
      setStep("preview");
    }
  }

  function handleConfirmMapping() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("preview");
  }

  function handleToggleTransaction(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  }

  function handleImport() {
    if (selectedCount === 0) {
      Alert.alert("No Selection", "Select at least one transaction to import.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep("importing");
    setImportProgress(0);

    // Simulate import progress
    const interval = setInterval(() => {
      setImportProgress((prev) => {
        const next = prev + 15;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setStep("done");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }, 300);
          return 100;
        }
        return next;
      });
    }, 400);
  }

  function handleSelectColumnMapping(field: keyof ColumnMapping) {
    const options = MOCK_CSV_COLUMNS.map((col) => ({
      text: col + (columnMapping[field] === col ? " ✓" : ""),
      onPress: () => {
        setColumnMapping((prev) => ({ ...prev, [field]: col }));
      },
    }));
    Alert.alert(`Map "${field}"`, "Select the column:", [
      ...options,
      { text: "Cancel", style: "cancel" },
    ]);
  }

  // ---- File Selection Step ----

  function renderSelectFile() {
    const formats: { id: FileFormat; label: string; icon: string; desc: string }[] = [
      { id: "csv", label: "CSV", icon: "📄", desc: "Comma-separated values" },
      { id: "ofx", label: "OFX", icon: "📊", desc: "Open Financial Exchange" },
      { id: "qif", label: "QIF", icon: "📋", desc: "Quicken Interchange Format" },
    ];

    return (
      <View>
        <Text className={`text-lg font-bold ${textPrimary} mb-2`}>
          Import Statement
        </Text>
        <Text className={`text-sm ${textSecondary} mb-6`}>
          Select a file format to import bank transactions.
        </Text>

        {formats.map((format, index) => (
          <Animated.View
            key={format.id}
            entering={FadeInDown.duration(300).delay(index * 80)}
          >
            <TouchableOpacity
              className={`${cardBg} rounded-xl p-4 mb-3 flex-row items-center`}
              style={{
                shadowColor: isDark ? "#000" : "#64748B",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isDark ? 0.15 : 0.04,
                shadowRadius: 3,
                elevation: 1,
              }}
              onPress={() => handleSelectFile(format.id)}
              activeOpacity={0.7}
            >
              <View className={`w-11 h-11 rounded-xl ${isDark ? "bg-slate-700" : "bg-slate-100"} items-center justify-center mr-3`}>
                <Text className="text-xl">{format.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className={`text-sm font-semibold ${textPrimary}`}>
                  {format.label}
                </Text>
                <Text className={`text-xs ${textSecondary} mt-0.5`}>
                  {format.desc}
                </Text>
              </View>
              <Text className={`text-lg ${isDark ? "text-slate-600" : "text-slate-300"}`}>{">"}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    );
  }

  // ---- Column Mapping Step ----

  function renderMapColumns() {
    const fields: { key: keyof ColumnMapping; label: string }[] = [
      { key: "date", label: "Date Column" },
      { key: "description", label: "Description Column" },
      { key: "amount", label: "Amount Column" },
      { key: "category", label: "Category Column" },
    ];

    return (
      <View>
        <Text className={`text-lg font-bold ${textPrimary} mb-2`}>
          Map Columns
        </Text>
        <Text className={`text-sm ${textSecondary} mb-6`}>
          Match CSV columns to expense fields.
        </Text>

        <View
          className={`${cardBg} rounded-2xl px-4`}
          style={{
            shadowColor: isDark ? "#000" : "#64748B",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.2 : 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          {fields.map((field, index) => (
            <View key={field.key}>
              <TouchableOpacity
                className="flex-row items-center justify-between py-3.5"
                onPress={() => handleSelectColumnMapping(field.key)}
                activeOpacity={0.7}
              >
                <Text className={`text-sm font-medium ${textPrimary}`}>
                  {field.label}
                </Text>
                <View className="flex-row items-center">
                  <Text className="text-sm text-primary-600 font-medium mr-2">
                    {columnMapping[field.key]}
                  </Text>
                  <Text className={`text-lg ${isDark ? "text-slate-600" : "text-slate-300"}`}>{">"}</Text>
                </View>
              </TouchableOpacity>
              {index < fields.length - 1 && (
                <View className={`h-px ${isDark ? "bg-slate-700" : "bg-slate-100"}`} />
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity
          className="bg-primary-600 rounded-xl py-3.5 items-center mt-6"
          onPress={handleConfirmMapping}
          activeOpacity={0.8}
        >
          <Text className="text-white text-sm font-semibold">Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---- Preview Step ----

  function renderPreview() {
    return (
      <View className="flex-1">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className={`text-lg font-bold ${textPrimary}`}>
              Preview Transactions
            </Text>
            <Text className={`text-xs ${textSecondary} mt-0.5`}>
              {selectedCount} of {transactions.length} selected
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              const allSelected = transactions.every((t) => t.selected);
              setTransactions((prev) =>
                prev.map((t) => ({ ...t, selected: !allSelected }))
              );
            }}
            activeOpacity={0.7}
          >
            <Text className="text-primary-600 text-sm font-medium">
              {transactions.every((t) => t.selected) ? "Deselect All" : "Select All"}
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              className={`${cardBg} rounded-xl p-3.5 mb-2 flex-row items-center ${
                item.selected ? "" : "opacity-50"
              }`}
              onPress={() => handleToggleTransaction(item.id)}
              activeOpacity={0.7}
            >
              <View
                className={`w-6 h-6 rounded-md border-2 items-center justify-center mr-3 ${
                  item.selected
                    ? "bg-primary-600 border-primary-600"
                    : isDark
                      ? "border-slate-600"
                      : "border-slate-300"
                }`}
              >
                {item.selected && (
                  <Text className="text-white text-xs font-bold">{"✓"}</Text>
                )}
              </View>
              <View className="flex-1">
                <Text className={`text-sm font-medium ${textPrimary}`} numberOfLines={1}>
                  {item.description}
                </Text>
                <View className="flex-row items-center gap-2 mt-0.5">
                  <Text className={`text-xs ${textSecondary}`}>{item.date}</Text>
                  <Text className={`text-xs ${textSecondary}`}>{item.category}</Text>
                </View>
              </View>
              <Text className={`text-sm font-bold ${textPrimary}`}>
                {"\u20B9"}{item.amount.toLocaleString("en-IN")}
              </Text>
            </TouchableOpacity>
          )}
        />

        <TouchableOpacity
          className="bg-primary-600 rounded-xl py-3.5 items-center mt-4"
          onPress={handleImport}
          activeOpacity={0.8}
        >
          <Text className="text-white text-sm font-semibold">
            Import {selectedCount} Transactions
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---- Importing Step ----

  function renderImporting() {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <Animated.View entering={FadeIn.duration(400)} className="items-center">
          <ActivityIndicator size="large" color="#4F46E5" style={{ marginBottom: 20 }} />
          <Text className={`text-lg font-bold ${textPrimary} mb-2`}>
            Importing Transactions...
          </Text>
          <Text className={`text-sm ${textSecondary} mb-4`}>
            {importProgress}% complete
          </Text>
          {/* Progress bar */}
          <View className={`w-48 h-2 rounded-full ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
            <View
              className="h-2 rounded-full bg-primary-600"
              style={{ width: `${importProgress}%` }}
            />
          </View>
        </Animated.View>
      </View>
    );
  }

  // ---- Done Step ----

  function renderDone() {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <Animated.View entering={FadeIn.duration(400)} className="items-center">
          <View className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center mb-6">
            <Text className="text-4xl">{"✅"}</Text>
          </View>
          <Text className={`text-xl font-bold ${textPrimary} mb-2`}>
            Import Complete!
          </Text>
          <Text className={`text-sm ${textSecondary} text-center mb-6`}>
            {selectedCount} transactions have been imported successfully.
          </Text>
          <TouchableOpacity
            className="bg-primary-600 rounded-xl px-8 py-3.5"
            onPress={() => setStep("select_file")}
            activeOpacity={0.8}
          >
            <Text className="text-white text-sm font-semibold">Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ---- Render ----

  function renderContent() {
    switch (step) {
      case "select_file": return renderSelectFile();
      case "map_columns": return renderMapColumns();
      case "preview": return renderPreview();
      case "importing": return renderImporting();
      case "done": return renderDone();
    }
  }

  return (
    <View className="flex-1">
      {/* Step back button for multi-step */}
      {(step === "map_columns" || step === "preview") && (
        <TouchableOpacity
          className="mb-4"
          onPress={() => {
            if (step === "preview" && selectedFormat === "csv") {
              setStep("map_columns");
            } else {
              setStep("select_file");
            }
          }}
          activeOpacity={0.7}
        >
          <Text className="text-primary-600 text-sm font-medium">
            {"<"} Back
          </Text>
        </TouchableOpacity>
      )}
      {renderContent()}
    </View>
  );
}
