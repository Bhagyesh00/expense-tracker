import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  useColorScheme,
  Keyboard,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

// ---- Currency data ----

export interface Currency {
  code: string;
  symbol: string;
  flag: string;
  name: string;
  /**
   * "indian" uses the Indian numbering system (1,00,000)
   * "international" uses standard (100,000)
   */
  format: "indian" | "international";
}

const CURRENCIES: Currency[] = [
  { code: "INR", symbol: "₹", flag: "🇮🇳", name: "Indian Rupee", format: "indian" },
  { code: "USD", symbol: "$", flag: "🇺🇸", name: "US Dollar", format: "international" },
  { code: "EUR", symbol: "€", flag: "🇪🇺", name: "Euro", format: "international" },
  { code: "GBP", symbol: "£", flag: "🇬🇧", name: "British Pound", format: "international" },
  { code: "JPY", symbol: "¥", flag: "🇯🇵", name: "Japanese Yen", format: "international" },
  { code: "AED", symbol: "د.إ", flag: "🇦🇪", name: "UAE Dirham", format: "international" },
  { code: "SGD", symbol: "S$", flag: "🇸🇬", name: "Singapore Dollar", format: "international" },
  { code: "CAD", symbol: "C$", flag: "🇨🇦", name: "Canadian Dollar", format: "international" },
  { code: "AUD", symbol: "A$", flag: "🇦🇺", name: "Australian Dollar", format: "international" },
  { code: "CHF", symbol: "Fr", flag: "🇨🇭", name: "Swiss Franc", format: "international" },
  { code: "CNY", symbol: "¥", flag: "🇨🇳", name: "Chinese Yuan", format: "international" },
  { code: "BRL", symbol: "R$", flag: "🇧🇷", name: "Brazilian Real", format: "international" },
];

// ---- Formatting helpers ----

/**
 * Format a numeric string with the Indian numbering system separators.
 * e.g. "1500000" → "15,00,000"
 */
function formatIndian(value: string): string {
  const [intPart, decPart] = value.split(".");
  if (!intPart) return value;

  const reversed = intPart.split("").reverse().join("");
  const groups: string[] = [];

  for (let i = 0; i < reversed.length; i++) {
    if (i === 3 || (i > 3 && (i - 3) % 2 === 0)) {
      groups.push(",");
    }
    groups.push(reversed[i]);
  }

  const formatted = groups.reverse().join("");
  return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
}

/**
 * Format with international grouping (every 3 digits).
 * e.g. "1500000" → "1,500,000"
 */
function formatInternational(value: string): string {
  const [intPart, decPart] = value.split(".");
  if (!intPart) return value;

  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
}

export function formatAmount(raw: string, format: "indian" | "international"): string {
  // Remove all non-digit/dot chars first
  const clean = raw.replace(/[^0-9.]/g, "");
  if (!clean) return "";
  return format === "indian" ? formatIndian(clean) : formatInternational(clean);
}

/**
 * Parse a formatted string back to a plain number string.
 */
export function parseAmount(formatted: string): string {
  return formatted.replace(/,/g, "");
}

/**
 * Returns the numeric value from a formatted string.
 */
export function amountToNumber(formatted: string): number {
  return parseFloat(parseAmount(formatted)) || 0;
}

// ---- Currency Picker Sheet ----

interface CurrencyPickerProps {
  visible: boolean;
  selected: string;
  onSelect: (currency: Currency) => void;
  onClose: () => void;
  isDark: boolean;
}

function CurrencyPicker({
  visible,
  selected,
  onSelect,
  onClose,
  isDark,
}: CurrencyPickerProps) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? CURRENCIES.filter(
        (c) =>
          c.code.toLowerCase().includes(query.toLowerCase()) ||
          c.name.toLowerCase().includes(query.toLowerCase())
      )
    : CURRENCIES;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: isDark ? "#0F172A" : "#F8FAFC" }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 16,
            backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
            borderBottomWidth: 1,
            borderBottomColor: isDark ? "#334155" : "#F1F5F9",
          }}
        >
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
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
            Select Currency
          </Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Search */}
        <View
          style={{
            padding: 16,
            backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
              borderRadius: 12,
              paddingHorizontal: 12,
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 16 }}>🔍</Text>
            <TextInput
              style={{
                flex: 1,
                fontSize: 15,
                paddingVertical: 10,
                color: isDark ? "#F8FAFC" : "#0F172A",
              }}
              placeholder="Search currency…"
              placeholderTextColor={isDark ? "#475569" : "#CBD5E1"}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")}>
                <Text style={{ color: isDark ? "#64748B" : "#94A3B8", fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* List */}
        <ScrollView keyboardShouldPersistTaps="handled">
          {filtered.map((currency) => {
            const isSelected = currency.code === selected;
            return (
              <TouchableOpacity
                key={currency.code}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? "#1E293B" : "#F8FAFC",
                  backgroundColor: isSelected
                    ? isDark
                      ? "#1E293B"
                      : "#EEF2FF"
                    : "transparent",
                  gap: 14,
                }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelect(currency);
                  onClose();
                }}
                activeOpacity={0.6}
              >
                <Text style={{ fontSize: 28 }}>{currency.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: isSelected ? "#4F46E5" : isDark ? "#F8FAFC" : "#0F172A",
                    }}
                  >
                    {currency.code}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: isDark ? "#64748B" : "#94A3B8",
                      marginTop: 1,
                    }}
                  >
                    {currency.name}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: isSelected ? "#4F46E5" : isDark ? "#64748B" : "#94A3B8",
                    minWidth: 32,
                    textAlign: "right",
                  }}
                >
                  {currency.symbol}
                </Text>
                {isSelected && (
                  <Text style={{ color: "#4F46E5", fontSize: 18, marginLeft: 4 }}>✓</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ---- Main Component ----

export interface CurrencyInputProps {
  /** Numeric value (controlled) */
  value: number;
  /** Called with the new numeric value */
  onChange: (value: number) => void;
  /** Currency code, e.g. "INR" */
  currencyCode?: string;
  /** Called when currency is changed via the picker */
  onCurrencyChange?: (currency: Currency) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Large display mode (for primary amount input) */
  large?: boolean;
}

export default function CurrencyInput({
  value,
  onChange,
  currencyCode = "INR",
  onCurrencyChange,
  placeholder = "0",
  autoFocus = false,
  large = false,
}: CurrencyInputProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const selectedCurrency =
    CURRENCIES.find((c) => c.code === currencyCode) ?? CURRENCIES[0];

  const [displayValue, setDisplayValue] = useState(
    value > 0 ? formatAmount(String(value), selectedCurrency.format) : ""
  );
  const [showPicker, setShowPicker] = useState(false);

  // Haptic threshold — trigger haptic at round milestones
  const prevMilestone = useRef(0);

  // When external value changes, re-format display
  useEffect(() => {
    if (value === 0) {
      setDisplayValue("");
    } else {
      setDisplayValue(formatAmount(String(value), selectedCurrency.format));
    }
  }, [currencyCode]);

  const handleChangeText = useCallback(
    (text: string) => {
      // Strip formatting chars, keep digits and one dot
      const raw = text.replace(/[^0-9.]/g, "");

      // Prevent multiple dots
      const dotCount = (raw.match(/\./g) ?? []).length;
      if (dotCount > 1) return;

      // Max 2 decimal places
      const parts = raw.split(".");
      if (parts[1] && parts[1].length > 2) return;

      const formatted = raw ? formatAmount(raw, selectedCurrency.format) : "";
      setDisplayValue(formatted);

      const numeric = parseFloat(raw) || 0;
      onChange(numeric);

      // Haptic feedback at significant milestones
      const milestone = Math.floor(numeric / 10000) * 10000;
      if (milestone > 0 && milestone !== prevMilestone.current) {
        prevMilestone.current = milestone;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    [selectedCurrency.format, onChange]
  );

  const handleCurrencySelect = useCallback(
    (currency: Currency) => {
      onCurrencyChange?.(currency);
      // Re-format existing value with new currency's format
      if (value > 0) {
        setDisplayValue(formatAmount(String(value), currency.format));
      }
    },
    [value, onCurrencyChange]
  );

  const fontSize = large ? 42 : 24;
  const symbolSize = large ? 24 : 16;
  const inputHeight = large ? 72 : 54;

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
            borderColor: isDark ? "#334155" : "#E2E8F0",
            height: inputHeight,
          },
        ]}
      >
        {/* Currency selector */}
        <TouchableOpacity
          style={[
            styles.currencyButton,
            {
              backgroundColor: isDark ? "#312E81" : "#EEF2FF",
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Keyboard.dismiss();
            setShowPicker(true);
          }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: symbolSize + 4 }}>{selectedCurrency.flag}</Text>
          <Text
            style={[
              styles.currencyCode,
              {
                fontSize: large ? 16 : 13,
                color: isDark ? "#A5B4FC" : "#4F46E5",
              },
            ]}
          >
            {selectedCurrency.code}
          </Text>
          <Text
            style={{
              color: isDark ? "#6366F1" : "#818CF8",
              fontSize: 12,
            }}
          >
            ▾
          </Text>
        </TouchableOpacity>

        {/* Separator */}
        <View
          style={[
            styles.separator,
            { backgroundColor: isDark ? "#334155" : "#E2E8F0" },
          ]}
        />

        {/* Symbol */}
        <Text
          style={[
            styles.symbol,
            {
              fontSize: symbolSize,
              color: isDark ? "#64748B" : "#94A3B8",
            },
          ]}
        >
          {selectedCurrency.symbol}
        </Text>

        {/* Amount Input */}
        <TextInput
          style={[
            styles.input,
            {
              fontSize,
              color: isDark ? "#F8FAFC" : "#0F172A",
              fontWeight: large ? "700" : "600",
            },
          ]}
          value={displayValue}
          onChangeText={handleChangeText}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={isDark ? "#475569" : "#CBD5E1"}
          autoFocus={autoFocus}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />
      </View>

      {/* Currency Picker Modal */}
      <CurrencyPicker
        visible={showPicker}
        selected={currencyCode}
        onSelect={handleCurrencySelect}
        onClose={() => setShowPicker(false)}
        isDark={isDark}
      />
    </>
  );
}

// ---- Styles ----

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 16,
    overflow: "hidden",
    paddingRight: 16,
  },
  currencyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  currencyCode: {
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  separator: {
    width: 1,
    alignSelf: "stretch",
    marginVertical: 10,
  },
  symbol: {
    fontWeight: "600",
    marginLeft: 12,
    marginRight: 2,
  },
  input: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 0,
    letterSpacing: -0.5,
  },
});
