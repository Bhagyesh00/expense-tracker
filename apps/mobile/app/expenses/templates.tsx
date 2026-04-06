import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActionSheetIOS,
  Platform,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";

import TemplateCard, { type ExpenseTemplate } from "@/components/template-card";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_TEMPLATES: ExpenseTemplate[] = [
  {
    id: "1",
    name: "Daily Lunch",
    categoryId: "food",
    categoryName: "Food & Dining",
    categoryIcon: "🍔",
    categoryColor: "#FF6B6B",
    amount: 150,
    type: "expense",
    notes: "Canteen lunch",
  },
  {
    id: "2",
    name: "Monthly Netflix",
    categoryId: "entertainment",
    categoryName: "Entertainment",
    categoryIcon: "🎬",
    categoryColor: "#A55EEA",
    amount: 649,
    type: "expense",
    notes: "Monthly Netflix subscription",
  },
  {
    id: "3",
    name: "Office Uber",
    categoryId: "transport",
    categoryName: "Transport",
    categoryIcon: "🚗",
    categoryColor: "#4ECDC4",
    amount: null,
    type: "expense",
    notes: "Daily commute to office",
  },
  {
    id: "4",
    name: "Gym Membership",
    categoryId: "health",
    categoryName: "Health & Fitness",
    categoryIcon: "💪",
    categoryColor: "#EE5A6F",
    amount: 1500,
    type: "expense",
    notes: "Monthly gym fee",
  },
  {
    id: "5",
    name: "Freelance Payment",
    categoryId: "income",
    categoryName: "Income",
    categoryIcon: "💼",
    categoryColor: "#10AC84",
    amount: null,
    type: "income",
    notes: "Client project payment",
  },
  {
    id: "6",
    name: "Electricity Bill",
    categoryId: "bills",
    categoryName: "Bills & Utilities",
    categoryIcon: "⚡",
    categoryColor: "#54A0FF",
    amount: 1200,
    type: "expense",
    notes: "Monthly electricity bill",
  },
];

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ isDark }: { isDark: boolean }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(500).delay(200)}
      className="flex-1 items-center justify-center py-20 px-8"
    >
      <View
        className={`w-24 h-24 rounded-3xl items-center justify-center mb-5 ${
          isDark ? "bg-slate-800" : "bg-slate-100"
        }`}
      >
        <Text className="text-5xl">📋</Text>
      </View>
      <Text
        className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"} mb-2 text-center`}
      >
        No Templates Yet
      </Text>
      <Text
        className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"} text-center leading-5`}
      >
        Save frequent expenses as templates to add them quickly next time.
      </Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function ExpenseTemplatesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [templates, setTemplates] = useState<ExpenseTemplate[]>(MOCK_TEMPLATES);
  const [refreshing, setRefreshing] = useState(false);

  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const headerBg = isDark ? "bg-slate-900" : "bg-white";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const borderColor = isDark ? "border-slate-800" : "border-slate-100";

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Fetch from API
    await new Promise((resolve) => setTimeout(resolve, 800));
    setRefreshing(false);
  }, []);

  const handleUseTemplate = useCallback(
    (template: ExpenseTemplate) => {
      // Navigate to new expense, pre-filling from template
      router.push({
        pathname: "/expense/new",
        params: {
          templateId: template.id,
          amount: template.amount?.toString() ?? "",
          categoryId: template.categoryId,
          description: template.name,
          notes: template.notes ?? "",
          type: template.type,
        },
      });
    },
    [router],
  );

  const handleLongPress = useCallback(
    (template: ExpenseTemplate) => {
      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ["Cancel", "Edit Template", "Delete Template"],
            cancelButtonIndex: 0,
            destructiveButtonIndex: 2,
            title: template.name,
          },
          (buttonIndex) => {
            if (buttonIndex === 1) {
              // TODO: Navigate to edit
              Alert.alert("Edit", `Edit template: ${template.name}`);
            } else if (buttonIndex === 2) {
              handleDeleteTemplate(template.id);
            }
          },
        );
      } else {
        Alert.alert(template.name, "What would you like to do?", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Edit Template",
            onPress: () => Alert.alert("Edit", `Edit template: ${template.name}`),
          },
          {
            text: "Delete Template",
            style: "destructive",
            onPress: () => handleDeleteTemplate(template.id),
          },
        ]);
      }
    },
    [],
  );

  const handleDeleteTemplate = useCallback((id: string) => {
    Alert.alert(
      "Delete Template",
      "Are you sure you want to delete this template?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTemplates((prev) => prev.filter((t) => t.id !== id));
          },
        },
      ],
    );
  }, []);

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        className={`flex-row items-center justify-between px-5 py-3 border-b ${borderColor} ${headerBg}`}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          className={`w-9 h-9 rounded-xl items-center justify-center ${
            isDark ? "bg-slate-800" : "bg-slate-100"
          }`}
        >
          <Text className={textPrimary}>←</Text>
        </TouchableOpacity>
        <Text className={`text-lg font-bold ${textPrimary}`}>
          Expense Templates
        </Text>
        <View className="w-9" />
      </Animated.View>

      {/* Subtitle */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(100)}
        className="px-5 pt-4 pb-2"
      >
        <Text className={`text-sm ${textSecondary}`}>
          {templates.length} template{templates.length !== 1 ? "s" : ""}
        </Text>
      </Animated.View>

      {/* List */}
      <FlatList
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 100,
          flexGrow: 1,
        }}
        data={templates}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <TemplateCard
            template={item}
            index={index}
            onUse={handleUseTemplate}
            onLongPress={handleLongPress}
          />
        )}
        ListEmptyComponent={<EmptyState isDark={isDark} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4F46E5"
            colors={["#4F46E5"]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB: Create Template */}
      <Animated.View
        entering={FadeInUp.duration(500).delay(400)}
        className="absolute bottom-8 right-5"
        style={{
          shadowColor: "#4F46E5",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 10,
          elevation: 10,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            // TODO: Navigate to create template screen / open sheet
            Alert.alert(
              "Create Template",
              "Template creation coming soon! Use 'Save as Template' when adding an expense.",
            );
          }}
          activeOpacity={0.85}
          className="flex-row items-center gap-2 bg-primary-600 rounded-full px-5 py-4"
        >
          <Text className="text-white text-lg font-light leading-none">+</Text>
          <Text className="text-white text-sm font-bold">Create Template</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}
