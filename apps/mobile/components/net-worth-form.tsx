import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  Animated as RNAnimated,
} from "react-native";
import Animated, {
  FadeIn,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

// ---- Types ----

type ItemType = "asset" | "liability";

type AssetCategory =
  | "cash"
  | "bank"
  | "investment"
  | "property"
  | "vehicle"
  | "other_asset";

type LiabilityCategory =
  | "loan"
  | "credit_card"
  | "mortgage"
  | "pending"
  | "other_liability";

type Category = AssetCategory | LiabilityCategory;

interface NetWorthFormProps {
  visible: boolean;
  defaultType?: ItemType;
  onClose: () => void;
  onSave: (item: {
    name: string;
    value: number;
    category: Category;
    notes?: string;
    type: ItemType;
  }) => void;
}

// ---- Category Config ----

const ASSET_CATEGORIES: { value: AssetCategory; label: string; icon: string }[] = [
  { value: "cash", label: "Cash", icon: "💵" },
  { value: "bank", label: "Bank Account", icon: "🏦" },
  { value: "investment", label: "Investment", icon: "📈" },
  { value: "property", label: "Property", icon: "🏠" },
  { value: "vehicle", label: "Vehicle", icon: "🚗" },
  { value: "other_asset", label: "Other", icon: "💎" },
];

const LIABILITY_CATEGORIES: { value: LiabilityCategory; label: string; icon: string }[] = [
  { value: "loan", label: "Loan", icon: "🏧" },
  { value: "credit_card", label: "Credit Card", icon: "💳" },
  { value: "mortgage", label: "Mortgage", icon: "🏠" },
  { value: "pending", label: "Pending Payment", icon: "💸" },
  { value: "other_liability", label: "Other", icon: "📋" },
];

// ---- Component ----

export default function NetWorthForm({
  visible,
  defaultType = "asset",
  onClose,
  onSave,
}: NetWorthFormProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [itemType, setItemType] = useState<ItemType>(defaultType);
  const [category, setCategory] = useState<Category>("bank");
  const [name, setName] = useState("");
  const [valueStr, setValueStr] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const bg = isDark ? "#1E293B" : "#FFFFFF";
  const inputBg = isDark ? "#0F172A" : "#F8FAFC";
  const textPrimary = isDark ? "#F8FAFC" : "#0F172A";
  const textSecondary = isDark ? "#94A3B8" : "#64748B";
  const borderColor = isDark ? "#334155" : "#E2E8F0";

  const categories = itemType === "asset" ? ASSET_CATEGORIES : LIABILITY_CATEGORIES;

  function handleTypeChange(type: ItemType) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItemType(type);
    setCategory(type === "asset" ? "bank" : "loan");
    setErrors({});
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Name is required";
    const numVal = parseFloat(valueStr.replace(/,/g, ""));
    if (!valueStr || isNaN(numVal) || numVal <= 0) {
      newErrors.value = "Enter a valid amount";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSave() {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const numVal = parseFloat(valueStr.replace(/,/g, ""));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    onSave({
      name: name.trim(),
      value: numVal,
      category,
      notes: notes.trim() || undefined,
      type: itemType,
    });

    // Reset form
    setName("");
    setValueStr("");
    setNotes("");
    setErrors({});
    onClose();
  }

  function handleClose() {
    setName("");
    setValueStr("");
    setNotes("");
    setErrors({});
    onClose();
  }

  function formatValueInput(text: string): string {
    const digits = text.replace(/[^0-9.]/g, "");
    return digits;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={handleClose}
          activeOpacity={1}
        />

        <Animated.View
          entering={SlideInDown.duration(350).springify().damping(22)}
          exiting={SlideOutDown.duration(300)}
          style={{
            backgroundColor: bg,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: "90%",
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            {/* Handle */}
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: isDark ? "#334155" : "#CBD5E1",
                alignSelf: "center",
                marginTop: 12,
                marginBottom: 4,
              }}
            />

            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: borderColor,
              }}
            >
              <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
                <Text style={{ color: isDark ? "#64748B" : "#94A3B8", fontSize: 15, fontWeight: "500" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: "700", color: textPrimary }}>
                Add {itemType === "asset" ? "Asset" : "Liability"}
              </Text>
              <TouchableOpacity
                onPress={handleSave}
                activeOpacity={0.8}
                style={{
                  backgroundColor: "#4F46E5",
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ padding: 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Type Toggle */}
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: isDark ? "#0F172A" : "#F1F5F9",
                  borderRadius: 12,
                  padding: 3,
                  marginBottom: 20,
                }}
              >
                {(["asset", "liability"] as ItemType[]).map((type) => {
                  const active = type === itemType;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={{
                        flex: 1,
                        paddingVertical: 9,
                        alignItems: "center",
                        borderRadius: 10,
                        backgroundColor: active ? bg : "transparent",
                        shadowColor: active ? "#000" : "transparent",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: active ? 0.1 : 0,
                        shadowRadius: 2,
                        elevation: active ? 2 : 0,
                      }}
                      onPress={() => handleTypeChange(type)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: active
                            ? type === "asset"
                              ? "#10B981"
                              : "#EF4444"
                            : isDark
                            ? "#64748B"
                            : "#94A3B8",
                        }}
                      >
                        {type === "asset" ? "📈 Asset" : "📉 Liability"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Category Picker */}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 10,
                }}
              >
                Category
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 20,
                }}
              >
                {categories.map((cat) => {
                  const selected = cat.value === category;
                  return (
                    <TouchableOpacity
                      key={cat.value}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: selected ? "#4F46E5" : borderColor,
                        backgroundColor: selected
                          ? isDark
                            ? "#312E81"
                            : "#EEF2FF"
                          : "transparent",
                      }}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setCategory(cat.value);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: selected ? "#4F46E5" : textSecondary,
                        }}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Name */}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 8,
                }}
              >
                Name *
              </Text>
              <TextInput
                style={{
                  backgroundColor: inputBg,
                  borderWidth: 1.5,
                  borderColor: errors.name ? "#EF4444" : borderColor,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: textPrimary,
                  marginBottom: errors.name ? 4 : 20,
                }}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (errors.name) setErrors((e) => ({ ...e, name: "" }));
                }}
                placeholder={
                  itemType === "asset"
                    ? "e.g. HDFC Savings Account"
                    : "e.g. Home Loan (SBI)"
                }
                placeholderTextColor={isDark ? "#475569" : "#CBD5E1"}
              />
              {errors.name ? (
                <Text style={{ color: "#EF4444", fontSize: 12, marginBottom: 16 }}>
                  {errors.name}
                </Text>
              ) : null}

              {/* Value */}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 8,
                }}
              >
                Value (₹) *
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: inputBg,
                  borderWidth: 1.5,
                  borderColor: errors.value ? "#EF4444" : borderColor,
                  borderRadius: 12,
                  marginBottom: errors.value ? 4 : 20,
                }}
              >
                <Text
                  style={{
                    paddingLeft: 14,
                    fontSize: 18,
                    fontWeight: "700",
                    color: textSecondary,
                  }}
                >
                  ₹
                </Text>
                <TextInput
                  style={{
                    flex: 1,
                    paddingHorizontal: 8,
                    paddingVertical: 12,
                    fontSize: 18,
                    fontWeight: "700",
                    color: textPrimary,
                  }}
                  value={valueStr}
                  onChangeText={(t) => {
                    setValueStr(formatValueInput(t));
                    if (errors.value) setErrors((e) => ({ ...e, value: "" }));
                  }}
                  placeholder="0"
                  placeholderTextColor={isDark ? "#475569" : "#CBD5E1"}
                  keyboardType="decimal-pad"
                />
              </View>
              {errors.value ? (
                <Text style={{ color: "#EF4444", fontSize: 12, marginBottom: 16 }}>
                  {errors.value}
                </Text>
              ) : null}

              {/* Notes */}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 8,
                }}
              >
                Notes (optional)
              </Text>
              <TextInput
                style={{
                  backgroundColor: inputBg,
                  borderWidth: 1.5,
                  borderColor: borderColor,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 14,
                  color: textPrimary,
                  height: 80,
                  textAlignVertical: "top",
                  marginBottom: 20,
                }}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any notes…"
                placeholderTextColor={isDark ? "#475569" : "#CBD5E1"}
                multiline
              />

              {/* Save Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: "#4F46E5",
                  borderRadius: 14,
                  paddingVertical: 15,
                  alignItems: "center",
                  marginBottom: 24,
                }}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                  Save {itemType === "asset" ? "Asset" : "Liability"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
