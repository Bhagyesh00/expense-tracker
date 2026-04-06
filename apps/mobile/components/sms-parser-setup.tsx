import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  TextInput,
  ScrollView,
  Alert,
  useColorScheme,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

// ---- Types ----

interface SupportedBank {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  sampleSms: string;
}

type AutoImportMode = "auto_create" | "suggest";

// ---- Mock Data ----

const INITIAL_BANKS: SupportedBank[] = [
  {
    id: "hdfc",
    name: "HDFC Bank",
    icon: "🏦",
    enabled: true,
    sampleSms: "Rs.450.00 debited from HDFC Bank A/c XX4521 on 30-03-26 at SWIGGY. Avl bal: Rs.25,230.50",
  },
  {
    id: "sbi",
    name: "State Bank of India",
    icon: "🏛",
    enabled: true,
    sampleSms: "SBI: Rs 2100.00 debited from A/c XX8832 on 29Mar26, txn# 123456. Bal Rs 18,900.00",
  },
  {
    id: "icici",
    name: "ICICI Bank",
    icon: "🏦",
    enabled: false,
    sampleSms: "ICICI Bank Acct XX6734 debited for Rs 699.00 on 28-Mar-26. Netflix subscription. Bal: Rs 32,100.00",
  },
  {
    id: "axis",
    name: "Axis Bank",
    icon: "🏦",
    enabled: false,
    sampleSms: "Rs.1,299.00 spent on Axis Bank Card XX9087 at AMAZON.IN on 28/03/2026. Avl Limit: Rs 48,700.00",
  },
  {
    id: "kotak",
    name: "Kotak Mahindra Bank",
    icon: "🏦",
    enabled: false,
    sampleSms: "Kotak: INR 3500 debited from A/c XX3421 on 26-Mar-26. PHONE RECHARGE. Bal: INR 45,200",
  },
];

// ---- Component ----

interface SmsParserSetupProps {
  smsPermissionGranted: boolean;
  onRequestPermission: () => void;
}

export default function SmsParserSetup({
  smsPermissionGranted,
  onRequestPermission,
}: SmsParserSetupProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [banks, setBanks] = useState(INITIAL_BANKS);
  const [autoImportMode, setAutoImportMode] = useState<AutoImportMode>("suggest");
  const [testSms, setTestSms] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardBg = isDark ? "bg-slate-800" : "bg-white";
  const inputBg = isDark ? "bg-slate-700 border-slate-600" : "bg-slate-50 border-slate-200";

  function handleToggleBank(id: string, value: boolean) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBanks((prev) =>
      prev.map((bank) => (bank.id === id ? { ...bank, enabled: value } : bank))
    );
  }

  function handleTestSms() {
    if (!testSms.trim()) {
      Alert.alert("Enter SMS", "Please enter a sample SMS to test parsing.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Simple mock parser
    const amountMatch = testSms.match(/(?:Rs\.?|INR)\s*([0-9,]+(?:\.\d{2})?)/i);
    if (amountMatch) {
      const amount = amountMatch[1].replace(/,/g, "");
      setTestResult(`Parsed amount: Rs ${parseFloat(amount).toLocaleString("en-IN")}. Transaction detected successfully.`);
    } else {
      setTestResult("Could not parse transaction from this SMS. Make sure it contains a debit amount.");
    }
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* SMS Permission */}
      <Animated.View entering={FadeInDown.duration(400).delay(50)}>
        <View
          className={`${cardBg} rounded-2xl p-4 mb-4`}
          style={{
            shadowColor: isDark ? "#000" : "#64748B",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.2 : 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className={`text-sm font-semibold ${textPrimary}`}>
                SMS Permission
              </Text>
              <Text className={`text-xs ${textSecondary} mt-0.5`}>
                {smsPermissionGranted
                  ? "Permission granted. SMS will be scanned for transactions."
                  : "Required to read bank transaction SMS."}
              </Text>
            </View>
            {smsPermissionGranted ? (
              <View className="bg-green-100 dark:bg-green-900/30 rounded-full px-3 py-1">
                <Text className="text-green-600 text-xs font-semibold">Granted</Text>
              </View>
            ) : (
              <TouchableOpacity
                className="bg-primary-600 rounded-lg px-4 py-2"
                onPress={onRequestPermission}
                activeOpacity={0.8}
              >
                <Text className="text-white text-xs font-semibold">Grant</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Supported Banks */}
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <Text className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-3 px-1`}>
          Supported Banks
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
          {banks.map((bank, index) => (
            <View key={bank.id}>
              <View className="flex-row items-center py-3.5">
                <View className={`w-9 h-9 rounded-lg ${isDark ? "bg-slate-700" : "bg-slate-100"} items-center justify-center mr-3`}>
                  <Text className="text-base">{bank.icon}</Text>
                </View>
                <Text className={`flex-1 text-sm font-medium ${textPrimary}`}>
                  {bank.name}
                </Text>
                <Switch
                  value={bank.enabled}
                  onValueChange={(value) => handleToggleBank(bank.id, value)}
                  trackColor={{ false: "#CBD5E1", true: "#A5B4FC" }}
                  thumbColor={bank.enabled ? "#4F46E5" : "#F1F5F9"}
                />
              </View>
              {index < banks.length - 1 && (
                <View className={`h-px ${isDark ? "bg-slate-700" : "bg-slate-100"}`} />
              )}
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Auto Import Settings */}
      <Animated.View entering={FadeInDown.duration(400).delay(150)} className="mt-4">
        <Text className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-3 px-1`}>
          Auto-Import Mode
        </Text>
        <View
          className={`${cardBg} rounded-2xl p-1`}
          style={{
            shadowColor: isDark ? "#000" : "#64748B",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.2 : 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <View className="flex-row">
            {(
              [
                { value: "auto_create" as const, label: "Auto-Create" },
                { value: "suggest" as const, label: "Suggest Only" },
              ] as const
            ).map((option) => {
              const active = autoImportMode === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  className={`flex-1 py-3 items-center rounded-xl ${active ? (isDark ? "bg-slate-700" : "bg-primary-50") : ""}`}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAutoImportMode(option.value);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm font-semibold ${active ? "text-primary-600" : textSecondary}`}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <Text className={`text-xs ${textSecondary} mt-2 px-1`}>
          {autoImportMode === "auto_create"
            ? "Expenses are automatically created from parsed SMS."
            : "You'll get a notification to review before creating the expense."}
        </Text>
      </Animated.View>

      {/* Test SMS */}
      <Animated.View entering={FadeInDown.duration(400).delay(200)} className="mt-5">
        <Text className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-3 px-1`}>
          Test SMS Parser
        </Text>
        <TextInput
          className={`${inputBg} border rounded-xl px-4 py-3 text-sm ${textPrimary} mb-3`}
          placeholder="Paste a bank SMS to test..."
          placeholderTextColor={isDark ? "#475569" : "#94A3B8"}
          value={testSms}
          onChangeText={setTestSms}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        <TouchableOpacity
          className="bg-primary-600 rounded-xl py-3 items-center mb-3"
          onPress={handleTestSms}
          activeOpacity={0.8}
        >
          <Text className="text-white text-sm font-semibold">Test Parse</Text>
        </TouchableOpacity>

        {testResult && (
          <View
            className={`${isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"} border rounded-xl p-3`}
          >
            <Text className={`text-xs ${textPrimary}`}>{testResult}</Text>
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
}
