import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

// ---- Types ----

type Provider = "manual" | "plaid" | "salt_edge";
type ConnectionState = "select_provider" | "search_institution" | "connecting" | "success" | "error";

interface Institution {
  id: string;
  name: string;
  icon: string;
  country: string;
}

// ---- Mock Data ----

const PROVIDERS: { id: Provider; name: string; icon: string; description: string }[] = [
  { id: "manual", name: "Manual Import", icon: "📋", description: "Upload CSV, OFX, or QIF statements" },
  { id: "plaid", name: "Plaid", icon: "🔗", description: "Automatic bank connection (US, UK, EU)" },
  { id: "salt_edge", name: "Salt Edge", icon: "🌐", description: "Global bank connectivity (India, SEA)" },
];

const MOCK_INSTITUTIONS: Institution[] = [
  { id: "hdfc", name: "HDFC Bank", icon: "🏦", country: "India" },
  { id: "sbi", name: "State Bank of India", icon: "🏛", country: "India" },
  { id: "icici", name: "ICICI Bank", icon: "🏦", country: "India" },
  { id: "axis", name: "Axis Bank", icon: "🏦", country: "India" },
  { id: "kotak", name: "Kotak Mahindra Bank", icon: "🏦", country: "India" },
  { id: "pnb", name: "Punjab National Bank", icon: "🏛", country: "India" },
  { id: "bob", name: "Bank of Baroda", icon: "🏛", country: "India" },
  { id: "canara", name: "Canara Bank", icon: "🏛", country: "India" },
  { id: "union", name: "Union Bank of India", icon: "🏛", country: "India" },
  { id: "idbi", name: "IDBI Bank", icon: "🏦", country: "India" },
  { id: "chase", name: "Chase", icon: "🏦", country: "USA" },
  { id: "bofa", name: "Bank of America", icon: "🏦", country: "USA" },
  { id: "wells", name: "Wells Fargo", icon: "🏦", country: "USA" },
  { id: "citi", name: "Citibank", icon: "🏦", country: "Global" },
  { id: "hsbc", name: "HSBC", icon: "🏦", country: "Global" },
];

// ---- Main Screen ----

export default function BankSyncConnectScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [state, setState] = useState<ConnectionState>("select_provider");
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);

  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardBg = isDark ? "bg-slate-800" : "bg-white";
  const inputBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";

  const filteredInstitutions = MOCK_INSTITUTIONS.filter((inst) =>
    inst.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function handleSelectProvider(provider: Provider) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedProvider(provider);
    if (provider === "manual") {
      // For manual, go back to bank sync index for file import
      router.back();
      return;
    }
    setState("search_institution");
  }

  function handleSelectInstitution(institution: Institution) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedInstitution(institution);
    setState("connecting");

    // Simulate OAuth/connection flow
    setTimeout(() => {
      const success = Math.random() > 0.2;
      setState(success ? "success" : "error");
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }, 3000);
  }

  function handleRetry() {
    if (selectedInstitution) {
      handleSelectInstitution(selectedInstitution);
    }
  }

  // ---- Provider Selection ----

  function renderProviderSelection() {
    return (
      <View className="px-5 pt-4">
        <Animated.View entering={FadeInDown.duration(400).delay(50)}>
          <Text className={`text-lg font-bold ${textPrimary} mb-2`}>
            Choose a Connection Method
          </Text>
          <Text className={`text-sm ${textSecondary} mb-6`}>
            Select how you want to connect your bank account.
          </Text>
        </Animated.View>

        {PROVIDERS.map((provider, index) => (
          <Animated.View
            key={provider.id}
            entering={FadeInDown.duration(400).delay(100 + index * 80)}
          >
            <TouchableOpacity
              className={`${cardBg} rounded-2xl p-4 mb-3 flex-row items-center`}
              style={{
                shadowColor: isDark ? "#000" : "#64748B",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isDark ? 0.2 : 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
              onPress={() => handleSelectProvider(provider.id)}
              activeOpacity={0.7}
            >
              <View className={`w-12 h-12 rounded-xl ${isDark ? "bg-slate-700" : "bg-slate-100"} items-center justify-center mr-4`}>
                <Text className="text-2xl">{provider.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className={`text-base font-semibold ${textPrimary}`}>
                  {provider.name}
                </Text>
                <Text className={`text-xs ${textSecondary} mt-0.5`}>
                  {provider.description}
                </Text>
              </View>
              <Text className={`text-lg ${isDark ? "text-slate-600" : "text-slate-300"}`}>
                {">"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    );
  }

  // ---- Institution Search ----

  function renderInstitutionSearch() {
    return (
      <View className="flex-1 px-5 pt-4">
        <Animated.View entering={FadeInDown.duration(300)}>
          <Text className={`text-lg font-bold ${textPrimary} mb-4`}>
            Select Your Bank
          </Text>

          {/* Search Input */}
          <View className={`flex-row items-center ${inputBg} border rounded-xl px-4 py-3 mb-4`}>
            <Text className="text-base mr-2">{"🔍"}</Text>
            <TextInput
              className={`flex-1 text-sm ${textPrimary}`}
              placeholder="Search banks..."
              placeholderTextColor={isDark ? "#475569" : "#94A3B8"}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Text className={`text-sm ${textSecondary}`}>{"✕"}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        <FlatList
          data={filteredInstitutions}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(300).delay(index * 40)}>
              <TouchableOpacity
                className={`${cardBg} rounded-xl p-3.5 mb-2 flex-row items-center`}
                onPress={() => handleSelectInstitution(item)}
                activeOpacity={0.7}
              >
                <View className={`w-10 h-10 rounded-lg ${isDark ? "bg-slate-700" : "bg-slate-100"} items-center justify-center mr-3`}>
                  <Text className="text-lg">{item.icon}</Text>
                </View>
                <View className="flex-1">
                  <Text className={`text-sm font-medium ${textPrimary}`}>
                    {item.name}
                  </Text>
                  <Text className={`text-xs ${textSecondary}`}>{item.country}</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
          ListEmptyComponent={
            <View className="items-center py-8">
              <Text className="text-3xl mb-2">{"🔍"}</Text>
              <Text className={`text-sm ${textSecondary}`}>No banks found</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      </View>
    );
  }

  // ---- Connecting State ----

  function renderConnecting() {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Animated.View entering={FadeIn.duration(500)} className="items-center">
          <ActivityIndicator size="large" color="#4F46E5" style={{ marginBottom: 24 }} />
          <Text className={`text-lg font-bold ${textPrimary} mb-2 text-center`}>
            Connecting to {selectedInstitution?.name}
          </Text>
          <Text className={`text-sm ${textSecondary} text-center`}>
            Please wait while we securely connect to your bank account. This may take a moment.
          </Text>
        </Animated.View>
      </View>
    );
  }

  // ---- Success State ----

  function renderSuccess() {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Animated.View entering={FadeIn.duration(500)} className="items-center">
          <View className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center mb-6">
            <Text className="text-4xl">{"✅"}</Text>
          </View>
          <Text className={`text-xl font-bold ${textPrimary} mb-2 text-center`}>
            Connected!
          </Text>
          <Text className={`text-sm ${textSecondary} text-center mb-8`}>
            {selectedInstitution?.name} has been successfully connected. Your transactions will be synced shortly.
          </Text>
          <TouchableOpacity
            className="bg-primary-600 rounded-xl px-8 py-3.5"
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text className="text-white text-sm font-semibold">Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ---- Error State ----

  function renderError() {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Animated.View entering={FadeIn.duration(500)} className="items-center">
          <View className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center mb-6">
            <Text className="text-4xl">{"❌"}</Text>
          </View>
          <Text className={`text-xl font-bold ${textPrimary} mb-2 text-center`}>
            Connection Failed
          </Text>
          <Text className={`text-sm ${textSecondary} text-center mb-8`}>
            We couldn't connect to {selectedInstitution?.name}. This could be a temporary issue. Please try again.
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="bg-primary-600 rounded-xl px-6 py-3.5"
              onPress={handleRetry}
              activeOpacity={0.8}
            >
              <Text className="text-white text-sm font-semibold">Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`${isDark ? "bg-slate-700" : "bg-slate-100"} rounded-xl px-6 py-3.5`}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text className={`text-sm font-semibold ${textPrimary}`}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  // ---- Render ----

  function renderContent() {
    switch (state) {
      case "select_provider": return renderProviderSelection();
      case "search_institution": return renderInstitutionSearch();
      case "connecting": return renderConnecting();
      case "success": return renderSuccess();
      case "error": return renderError();
    }
  }

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`} edges={["top"]}>
      {/* Header */}
      <View
        className={`flex-row items-center justify-between px-5 py-3.5 border-b ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"}`}
      >
        <TouchableOpacity
          onPress={() => {
            if (state === "search_institution") {
              setState("select_provider");
              setSearchQuery("");
            } else {
              router.back();
            }
          }}
          activeOpacity={0.7}
        >
          <Text className="text-primary-600 text-base font-medium">{"<"} Back</Text>
        </TouchableOpacity>
        <Text className={`text-lg font-bold ${textPrimary}`}>
          Connect Bank
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {renderContent()}
    </SafeAreaView>
  );
}
