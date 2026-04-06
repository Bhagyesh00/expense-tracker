import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  useColorScheme,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

// ---- Constants ----

const TIMEZONES = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST, +5:30)" },
  { value: "America/New_York", label: "America/New_York (EST, -5:00)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST, -8:00)" },
  { value: "America/Chicago", label: "America/Chicago (CST, -6:00)" },
  { value: "Europe/London", label: "Europe/London (GMT, +0:00)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET, +1:00)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET, +1:00)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST, +4:00)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST, +9:00)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT, +8:00)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEDT, +11:00)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (NZDT, +13:00)" },
] as const;

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

const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳", country: "India" },
  { code: "+1", flag: "🇺🇸", country: "US" },
  { code: "+44", flag: "🇬🇧", country: "UK" },
  { code: "+49", flag: "🇩🇪", country: "Germany" },
  { code: "+81", flag: "🇯🇵", country: "Japan" },
  { code: "+65", flag: "🇸🇬", country: "Singapore" },
  { code: "+971", flag: "🇦🇪", country: "UAE" },
  { code: "+61", flag: "🇦🇺", country: "Australia" },
  { code: "+1", flag: "🇨🇦", country: "Canada" },
] as const;

// ---- Sub-components ----

function FormLabel({
  text,
  isDark,
}: {
  text: string;
  isDark: boolean;
}) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: "600",
        color: isDark ? "#94A3B8" : "#64748B",
        marginBottom: 6,
        marginLeft: 2,
      }}
    >
      {text}
    </Text>
  );
}

interface InputFieldProps {
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad" | "email-address";
  autoCapitalize?: "none" | "words" | "sentences";
  autoComplete?: "name" | "tel" | "email" | "off";
  readOnly?: boolean;
  isDark: boolean;
  rightIcon?: React.ReactNode;
}

function InputField({
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "none",
  autoComplete = "off",
  readOnly = false,
  isDark,
  rightIcon,
}: InputFieldProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: isDark
          ? readOnly
            ? "#0F172A"
            : "#1E293B"
          : readOnly
          ? "#F8FAFC"
          : "#FFFFFF",
        borderWidth: 1.5,
        borderColor: readOnly
          ? isDark
            ? "#1E293B"
            : "#E2E8F0"
          : isDark
          ? "#334155"
          : "#E2E8F0",
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 3,
      }}
    >
      <TextInput
        style={{
          flex: 1,
          fontSize: 15,
          color: readOnly
            ? isDark
              ? "#475569"
              : "#94A3B8"
            : isDark
            ? "#F8FAFC"
            : "#0F172A",
          paddingVertical: 12,
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? "#475569" : "#CBD5E1"}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        editable={!readOnly}
      />
      {rightIcon}
    </View>
  );
}

// ---- Searchable Picker Modal ----

interface PickerItem {
  label: string;
  value: string;
  secondary?: string;
}

interface SearchablePickerProps {
  visible: boolean;
  title: string;
  items: PickerItem[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  isDark: boolean;
}

function SearchablePicker({
  visible,
  title,
  items,
  selected,
  onSelect,
  onClose,
  isDark,
}: SearchablePickerProps) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          (item.secondary?.toLowerCase().includes(query.toLowerCase()) ?? false)
      )
    : items;

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
            {title}
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
              placeholder="Search…"
              placeholderTextColor={isDark ? "#475569" : "#CBD5E1"}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")}>
                <Text style={{ color: isDark ? "#64748B" : "#94A3B8" }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* List */}
        <ScrollView keyboardShouldPersistTaps="handled">
          {filtered.map((item) => {
            const isSelected = item.value === selected;
            return (
              <TouchableOpacity
                key={item.value}
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
                }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelect(item.value);
                  onClose();
                }}
                activeOpacity={0.6}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: isSelected ? "#4F46E5" : isDark ? "#F8FAFC" : "#0F172A",
                    }}
                  >
                    {item.label}
                  </Text>
                  {item.secondary ? (
                    <Text
                      style={{
                        fontSize: 12,
                        color: isDark ? "#64748B" : "#94A3B8",
                        marginTop: 2,
                      }}
                    >
                      {item.secondary}
                    </Text>
                  ) : null}
                </View>
                {isSelected && (
                  <Text style={{ color: "#4F46E5", fontSize: 18 }}>✓</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ---- Main Screen ----

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile state
  const [fullName, setFullName] = useState("User Name");
  const [phone, setPhone] = useState("9876543210");
  const [countryCode, setCountryCode] = useState("+91");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [currency, setCurrency] = useState("INR");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Modal state
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showCountryCodePicker, setShowCountryCodePicker] = useState(false);

  const email = "user@example.com"; // Read-only from auth

  // ---- Avatar ----

  const handlePickAvatar = useCallback(() => {
    Alert.alert("Change Photo", "Choose a source:", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Camera",
        onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            Alert.alert("Permission required", "Camera access is needed.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            setAvatarUri(result.assets[0].uri);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        },
      },
      {
        text: "Gallery",
        onPress: async () => {
          const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            Alert.alert("Permission required", "Photo library access is needed.");
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            setAvatarUri(result.assets[0].uri);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        },
      },
    ]);
  }, []);

  // ---- Save ----

  async function handleSave() {
    if (!fullName.trim()) {
      Alert.alert("Error", "Full name is required.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Call API to update profile
      // TODO: Upload avatar to Supabase Storage if changed
      await new Promise((resolve) => setTimeout(resolve, 800)); // Simulated delay
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ---- Derived ----

  const selectedTimezone =
    TIMEZONES.find((t) => t.value === timezone)?.label ?? timezone;
  const selectedCurrency = CURRENCIES.find((c) => c.code === currency);
  const selectedCountryCode = COUNTRY_CODES.find((c) => c.code === countryCode);

  const bgColor = isDark ? "#0F172A" : "#F8FAFC";

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }} edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
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
              Edit Profile
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#4F46E5" />
              ) : (
                <Text style={{ color: "#4F46E5", fontSize: 16, fontWeight: "700" }}>
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Avatar */}
            <Animated.View
              entering={FadeInDown.duration(400).delay(50)}
              style={{ alignItems: "center", marginBottom: 32 }}
            >
              <TouchableOpacity
                onPress={handlePickAvatar}
                activeOpacity={0.8}
                style={{ position: "relative" }}
              >
                {/* Avatar circle */}
                <View
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: isDark ? "#312E81" : "#EEF2FF",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 3,
                    borderColor: isDark ? "#4F46E5" : "#C7D2FE",
                    overflow: "hidden",
                  }}
                >
                  {avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      style={{ width: 100, height: 100, borderRadius: 50 }}
                    />
                  ) : (
                    <Text style={{ fontSize: 44 }}>👤</Text>
                  )}
                </View>

                {/* Camera badge */}
                <View
                  style={{
                    position: "absolute",
                    bottom: 2,
                    right: 2,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#4F46E5",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: isDark ? "#0F172A" : "#FFFFFF",
                  }}
                >
                  <Text style={{ fontSize: 14 }}>📷</Text>
                </View>
              </TouchableOpacity>

              <Text
                style={{
                  color: "#4F46E5",
                  fontSize: 14,
                  fontWeight: "600",
                  marginTop: 10,
                }}
              >
                Change Photo
              </Text>
            </Animated.View>

            {/* Full Name */}
            <Animated.View
              entering={FadeInDown.duration(400).delay(100)}
              style={{ marginBottom: 16 }}
            >
              <FormLabel text="Full Name" isDark={isDark} />
              <InputField
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your full name"
                autoCapitalize="words"
                autoComplete="name"
                isDark={isDark}
              />
            </Animated.View>

            {/* Email — read only */}
            <Animated.View
              entering={FadeInDown.duration(400).delay(150)}
              style={{ marginBottom: 16 }}
            >
              <FormLabel text="Email" isDark={isDark} />
              <InputField
                value={email}
                readOnly
                isDark={isDark}
                rightIcon={
                  <Text style={{ fontSize: 16, marginLeft: 6 }}>🔒</Text>
                }
              />
              <Text
                style={{
                  fontSize: 11,
                  color: isDark ? "#475569" : "#CBD5E1",
                  marginTop: 5,
                  marginLeft: 4,
                }}
              >
                Email cannot be changed here
              </Text>
            </Animated.View>

            {/* Phone Number */}
            <Animated.View
              entering={FadeInDown.duration(400).delay(200)}
              style={{ marginBottom: 16 }}
            >
              <FormLabel text="Phone Number" isDark={isDark} />
              <View style={{ flexDirection: "row", gap: 8 }}>
                {/* Country code picker */}
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                    borderWidth: 1.5,
                    borderColor: isDark ? "#334155" : "#E2E8F0",
                    borderRadius: 14,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    gap: 6,
                  }}
                  onPress={() => setShowCountryCodePicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 18 }}>
                    {selectedCountryCode?.flag ?? "🌍"}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: isDark ? "#F8FAFC" : "#0F172A",
                    }}
                  >
                    {countryCode}
                  </Text>
                  <Text style={{ color: isDark ? "#475569" : "#CBD5E1", fontSize: 14 }}>
                    ▾
                  </Text>
                </TouchableOpacity>

                {/* Phone input */}
                <View style={{ flex: 1 }}>
                  <InputField
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Phone number"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    isDark={isDark}
                  />
                </View>
              </View>
            </Animated.View>

            {/* Timezone */}
            <Animated.View
              entering={FadeInDown.duration(400).delay(250)}
              style={{ marginBottom: 16 }}
            >
              <FormLabel text="Timezone" isDark={isDark} />
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  borderWidth: 1.5,
                  borderColor: isDark ? "#334155" : "#E2E8F0",
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                }}
                onPress={() => setShowTimezonePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 16, marginRight: 10 }}>🕐</Text>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    color: isDark ? "#F8FAFC" : "#0F172A",
                  }}
                  numberOfLines={1}
                >
                  {selectedTimezone}
                </Text>
                <Text style={{ color: isDark ? "#475569" : "#CBD5E1", fontSize: 20 }}>›</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Default Currency */}
            <Animated.View
              entering={FadeInDown.duration(400).delay(300)}
              style={{ marginBottom: 32 }}
            >
              <FormLabel text="Default Currency" isDark={isDark} />
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  borderWidth: 1.5,
                  borderColor: isDark ? "#334155" : "#E2E8F0",
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                }}
                onPress={() => setShowCurrencyPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 18, marginRight: 10 }}>
                  {selectedCurrency?.flag ?? "💱"}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: isDark ? "#F8FAFC" : "#0F172A",
                    }}
                  >
                    {selectedCurrency?.code ?? currency}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: isDark ? "#64748B" : "#94A3B8",
                      marginTop: 1,
                    }}
                  >
                    {selectedCurrency?.name}
                  </Text>
                </View>
                <Text style={{ color: isDark ? "#475569" : "#CBD5E1", fontSize: 20 }}>›</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Save Button */}
            <Animated.View entering={FadeInDown.duration(400).delay(350)}>
              <TouchableOpacity
                style={{
                  backgroundColor: isSubmitting ? "#818CF8" : "#4F46E5",
                  borderRadius: 16,
                  paddingVertical: 15,
                  alignItems: "center",
                  shadowColor: "#4F46E5",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
                onPress={handleSave}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 16,
                      fontWeight: "700",
                      letterSpacing: 0.3,
                    }}
                  >
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Timezone Picker */}
      <SearchablePicker
        visible={showTimezonePicker}
        title="Select Timezone"
        items={TIMEZONES.map((t) => ({ label: t.label, value: t.value }))}
        selected={timezone}
        onSelect={setTimezone}
        onClose={() => setShowTimezonePicker(false)}
        isDark={isDark}
      />

      {/* Currency Picker */}
      <SearchablePicker
        visible={showCurrencyPicker}
        title="Select Currency"
        items={CURRENCIES.map((c) => ({
          label: `${c.flag}  ${c.code} — ${c.name}`,
          value: c.code,
          secondary: c.symbol,
        }))}
        selected={currency}
        onSelect={setCurrency}
        onClose={() => setShowCurrencyPicker(false)}
        isDark={isDark}
      />

      {/* Country Code Picker */}
      <SearchablePicker
        visible={showCountryCodePicker}
        title="Country Code"
        items={COUNTRY_CODES.map((c) => ({
          label: `${c.flag}  ${c.country}`,
          value: c.code,
          secondary: c.code,
        }))}
        selected={countryCode}
        onSelect={setCountryCode}
        onClose={() => setShowCountryCodePicker(false)}
        isDark={isDark}
      />
    </>
  );
}
