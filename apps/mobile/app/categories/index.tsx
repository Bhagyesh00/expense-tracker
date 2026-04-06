import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInDown,
  Layout,
} from "react-native-reanimated";
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from "react-native-gesture-handler";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Category {
  id: string;
  name: string;
  icon: string;
  type: "expense" | "income";
  isSystem: boolean;
  color: string;
}

type TypeFilter = "expense" | "income";

// ---------------------------------------------------------------------------
// Color palette for picker
// ---------------------------------------------------------------------------

const COLOR_PALETTE = [
  "#FF6B6B", "#FF9F43", "#FECA57", "#48DBFB", "#54A0FF",
  "#5F27CD", "#A55EEA", "#EE5A6F", "#10AC84", "#1DD1A1",
  "#4ECDC4", "#3498DB", "#2ECC71", "#E74C3C", "#F39C12",
  "#8E44AD", "#2C3E50", "#27AE60", "#D35400", "#8395A7",
];

// ---------------------------------------------------------------------------
// Icon grid
// ---------------------------------------------------------------------------

const ICON_OPTIONS = [
  "🍔", "🚗", "🛍", "📄", "🎬", "💊", "📚", "✈️", "🛒", "📱",
  "🏠", "💰", "💻", "📈", "🎁", "💵", "✨", "☕", "🏥", "🎵",
  "📷", "🎮", "⚽", "🍕", "🚌", "🔧", "💎", "🌿", "🎂", "🐾",
  "👕", "💳", "🏋️", "🎓", "🔌", "📦",
];

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const INITIAL_CATEGORIES: Category[] = [
  { id: "1", name: "Food & Dining", icon: "🍔", type: "expense", isSystem: true, color: "#FF6B6B" },
  { id: "2", name: "Transport", icon: "🚗", type: "expense", isSystem: true, color: "#4ECDC4" },
  { id: "3", name: "Shopping", icon: "🛍", type: "expense", isSystem: true, color: "#FF9F43" },
  { id: "4", name: "Bills & Utilities", icon: "📄", type: "expense", isSystem: true, color: "#54A0FF" },
  { id: "5", name: "Entertainment", icon: "🎬", type: "expense", isSystem: true, color: "#A55EEA" },
  { id: "6", name: "Health", icon: "💊", type: "expense", isSystem: true, color: "#EE5A6F" },
  { id: "7", name: "Education", icon: "📚", type: "expense", isSystem: true, color: "#1DD1A1" },
  { id: "8", name: "Travel", icon: "✈️", type: "expense", isSystem: true, color: "#0ABDE3" },
  { id: "9", name: "Groceries", icon: "🛒", type: "expense", isSystem: true, color: "#10AC84" },
  { id: "10", name: "Subscriptions", icon: "📱", type: "expense", isSystem: true, color: "#F39C12" },
  { id: "11", name: "Coffee Budget", icon: "☕", type: "expense", isSystem: false, color: "#92400E" },
  { id: "12", name: "Gym", icon: "🏋️", type: "expense", isSystem: false, color: "#EE5A6F" },
  { id: "13", name: "Salary", icon: "💰", type: "income", isSystem: true, color: "#27AE60" },
  { id: "14", name: "Freelance", icon: "💻", type: "income", isSystem: true, color: "#2ECC71" },
  { id: "15", name: "Investments", icon: "📈", type: "income", isSystem: true, color: "#3498DB" },
  { id: "16", name: "Gift Received", icon: "🎁", type: "income", isSystem: true, color: "#E74C3C" },
  { id: "17", name: "Side Hustle", icon: "🚀", type: "income", isSystem: false, color: "#F59E0B" },
];

// ---------------------------------------------------------------------------
// Category form sheet
// ---------------------------------------------------------------------------

interface CategoryFormData {
  name: string;
  icon: string;
  color: string;
  type: TypeFilter;
}

function CategoryFormSheet({
  visible,
  onClose,
  onSave,
  initialData,
  typeFilter,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: CategoryFormData) => void;
  initialData?: CategoryFormData;
  typeFilter: TypeFilter;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [name, setName] = useState(initialData?.name ?? "");
  const [icon, setIcon] = useState(initialData?.icon ?? "📌");
  const [color, setColor] = useState(initialData?.color ?? COLOR_PALETTE[0]);
  const [type, setType] = useState<TypeFilter>(initialData?.type ?? typeFilter);

  const bgColor = isDark ? "bg-slate-900" : "bg-white";
  const cardBg = isDark ? "bg-slate-800" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      Alert.alert("Error", "Category name is required.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({ name: name.trim(), icon, color, type });
  }, [name, icon, color, type, onSave]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(200)} className="flex-1 justify-end bg-black/50">
        <TouchableOpacity className="flex-1" onPress={onClose} activeOpacity={1} />
        <Animated.View
          entering={SlideInDown.duration(300).springify().damping(18)}
          className={`${bgColor} rounded-t-3xl max-h-[85%]`}
        >
          {/* Handle */}
          <View className="items-center pt-3 pb-1">
            <View className={`w-10 h-1 rounded-full ${isDark ? "bg-slate-700" : "bg-slate-300"}`} />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-3">
            <Text className={`text-lg font-bold ${textPrimary}`}>
              {initialData ? "Edit Category" : "New Category"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-primary-600 font-medium">Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            className="px-5"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 30 }}
          >
            {/* Preview */}
            <View className="items-center my-4">
              <View
                className="w-16 h-16 rounded-2xl items-center justify-center mb-2"
                style={{ backgroundColor: color + "20" }}
              >
                <Text className="text-3xl">{icon}</Text>
              </View>
              <Text className={`text-base font-bold ${textPrimary}`}>
                {name || "Category Name"}
              </Text>
              <View className="w-3 h-3 rounded-full mt-1.5" style={{ backgroundColor: color }} />
            </View>

            {/* Name */}
            <View className="mb-4">
              <Text className={`text-sm font-semibold ${textPrimary} mb-1.5`}>Name</Text>
              <TextInput
                className={`border rounded-2xl px-4 py-3.5 text-sm ${textPrimary} ${
                  isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                }`}
                placeholder="Category name"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
                maxLength={50}
              />
            </View>

            {/* Type toggle */}
            <View className="mb-4">
              <Text className={`text-sm font-semibold ${textPrimary} mb-1.5`}>Type</Text>
              <View className={`flex-row rounded-2xl ${cardBg} p-1`}>
                <TouchableOpacity
                  className={`flex-1 py-2.5 rounded-xl items-center ${
                    type === "expense"
                      ? isDark ? "bg-slate-700" : "bg-white shadow-sm"
                      : ""
                  }`}
                  onPress={() => {
                    setType("expense");
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      type === "expense" ? "text-primary-600" : textSecondary
                    }`}
                  >
                    Expense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 py-2.5 rounded-xl items-center ${
                    type === "income"
                      ? isDark ? "bg-slate-700" : "bg-white shadow-sm"
                      : ""
                  }`}
                  onPress={() => {
                    setType("income");
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      type === "income" ? "text-primary-600" : textSecondary
                    }`}
                  >
                    Income
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Icon picker */}
            <View className="mb-4">
              <Text className={`text-sm font-semibold ${textPrimary} mb-2`}>Icon</Text>
              <View className="flex-row flex-wrap gap-2">
                {ICON_OPTIONS.map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    onPress={() => {
                      setIcon(ic);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    className={`w-11 h-11 rounded-xl items-center justify-center ${
                      icon === ic
                        ? "bg-primary-100 dark:bg-primary-900/30 border-2 border-primary-500"
                        : cardBg
                    }`}
                    activeOpacity={0.7}
                  >
                    <Text className="text-lg">{ic}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Color picker */}
            <View className="mb-6">
              <Text className={`text-sm font-semibold ${textPrimary} mb-2`}>Color</Text>
              <View className="flex-row flex-wrap gap-2.5">
                {COLOR_PALETTE.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => {
                      setColor(c);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    className={`w-10 h-10 rounded-full items-center justify-center ${
                      color === c ? "border-[3px] border-white dark:border-slate-300" : ""
                    }`}
                    style={{
                      backgroundColor: c,
                      ...(color === c
                        ? {
                            shadowColor: c,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.5,
                            shadowRadius: 4,
                            elevation: 4,
                          }
                        : {}),
                    }}
                    activeOpacity={0.7}
                  >
                    {color === c && <Text className="text-white text-xs font-bold">✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Save button */}
            <TouchableOpacity
              onPress={handleSave}
              className="bg-primary-600 rounded-2xl py-4 items-center"
              activeOpacity={0.8}
              style={{
                shadowColor: "#4F46E5",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.25,
                shadowRadius: 6,
                elevation: 4,
              }}
            >
              <Text className="text-white text-base font-bold">
                {initialData ? "Save Changes" : "Add Category"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function CategoriesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("expense");
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === typeFilter),
    [categories, typeFilter],
  );

  const systemCategories = useMemo(
    () => filteredCategories.filter((c) => c.isSystem),
    [filteredCategories],
  );

  const customCategories = useMemo(
    () => filteredCategories.filter((c) => !c.isSystem),
    [filteredCategories],
  );

  const handleAddCategory = useCallback(
    (data: CategoryFormData) => {
      const newCat: Category = {
        id: String(Date.now()),
        name: data.name,
        icon: data.icon,
        color: data.color,
        type: data.type,
        isSystem: false,
      };
      setCategories((prev) => [...prev, newCat]);
      setShowForm(false);
      setEditingCategory(null);
    },
    [],
  );

  const handleEditCategory = useCallback(
    (data: CategoryFormData) => {
      if (!editingCategory) return;
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editingCategory.id
            ? { ...c, name: data.name, icon: data.icon, color: data.color, type: data.type }
            : c,
        ),
      );
      setShowForm(false);
      setEditingCategory(null);
    },
    [editingCategory],
  );

  const handleDeleteCategory = useCallback((category: Category) => {
    Alert.alert(
      "Delete Category",
      `Delete "${category.name}"? Expenses in this category will be moved to "Other".`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setCategories((prev) => prev.filter((c) => c.id !== category.id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  }, []);

  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const headerBg = isDark ? "bg-slate-900" : "bg-white";
  const cardBg = isDark ? "bg-slate-800" : "bg-white";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const borderColor = isDark ? "border-slate-800" : "border-slate-100";

  function renderCategoryItem({ item, index }: { item: Category; index: number }) {
    return (
      <Animated.View
        entering={FadeInDown.duration(300).delay(index * 40)}
        className={`flex-row items-center py-3.5 px-4 mb-1.5 rounded-2xl ${cardBg}`}
      >
        {/* Icon */}
        <View
          className="w-11 h-11 rounded-xl items-center justify-center mr-3"
          style={{ backgroundColor: item.color + "20" }}
        >
          <Text className="text-lg">{item.icon}</Text>
        </View>

        {/* Name */}
        <View className="flex-1 mr-2">
          <Text className={`text-sm font-semibold ${textPrimary}`}>{item.name}</Text>
          <View className="flex-row items-center mt-0.5">
            <View
              className="w-2 h-2 rounded-full mr-1.5"
              style={{ backgroundColor: item.color }}
            />
            <Text className={`text-[10px] ${textSecondary}`}>
              {item.isSystem ? "System" : "Custom"}
            </Text>
          </View>
        </View>

        {/* Actions */}
        {item.isSystem ? (
          <View className={`px-2.5 py-1 rounded-full ${isDark ? "bg-slate-700" : "bg-slate-100"}`}>
            <Text className={`text-[10px] font-semibold ${textSecondary}`}>🔒 System</Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-1.5">
            <TouchableOpacity
              onPress={() => {
                setEditingCategory(item);
                setShowForm(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              className={`px-3 py-1.5 rounded-lg ${isDark ? "bg-slate-700" : "bg-slate-100"}`}
              activeOpacity={0.7}
            >
              <Text className="text-primary-600 text-xs font-semibold">Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteCategory(item)}
              className={`px-3 py-1.5 rounded-lg ${isDark ? "bg-red-900/30" : "bg-red-50"}`}
              activeOpacity={0.7}
            >
              <Text className="text-red-500 text-xs font-semibold">Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    );
  }

  // Build list data with section headers
  const listData = useMemo(() => {
    const result: (Category | { type: "header"; title: string; id: string })[] = [];
    if (customCategories.length > 0) {
      result.push({ type: "header", title: "Custom Categories", id: "header-custom" });
      result.push(...customCategories);
    }
    if (systemCategories.length > 0) {
      result.push({ type: "header", title: "Default Categories", id: "header-system" });
      result.push(...systemCategories);
    }
    return result;
  }, [customCategories, systemCategories]);

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        className={`${headerBg} flex-row items-center justify-between px-5 py-3 border-b ${borderColor}`}
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
        <Text className={`text-lg font-bold ${textPrimary}`}>Categories</Text>
        <View className="w-9" />
      </Animated.View>

      {/* Type Toggle */}
      <View className={`${headerBg} px-5 py-3 border-b ${borderColor}`}>
        <View className={`flex-row rounded-2xl p-1 ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
          <TouchableOpacity
            className={`flex-1 py-3 rounded-xl items-center ${
              typeFilter === "expense"
                ? isDark ? "bg-slate-700 shadow-sm" : "bg-white shadow-sm"
                : ""
            }`}
            onPress={() => {
              setTypeFilter("expense");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.7}
          >
            <Text
              className={`text-sm font-bold ${
                typeFilter === "expense" ? "text-primary-600" : textSecondary
              }`}
            >
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3 rounded-xl items-center ${
              typeFilter === "income"
                ? isDark ? "bg-slate-700 shadow-sm" : "bg-white shadow-sm"
                : ""
            }`}
            onPress={() => {
              setTypeFilter("income");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.7}
          >
            <Text
              className={`text-sm font-bold ${
                typeFilter === "income" ? "text-primary-600" : textSecondary
              }`}
            >
              Income
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category list */}
      <FlatList
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 }}
        data={listData}
        keyExtractor={(item) => ("id" in item ? (item as any).id : (item as any).id)}
        renderItem={({ item, index }) => {
          if ("type" in item && item.type === "header") {
            return (
              <Animated.View
                entering={FadeIn.duration(300)}
                className="px-1 pt-3 pb-2"
              >
                <Text
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isDark ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  {item.title}
                </Text>
              </Animated.View>
            );
          }
          return renderCategoryItem({ item: item as Category, index });
        }}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB - Add Category */}
      <Animated.View
        entering={FadeIn.duration(500).delay(400)}
        className="absolute bottom-6 right-5"
      >
        <TouchableOpacity
          className="flex-row items-center bg-primary-600 rounded-2xl px-5 py-3.5"
          onPress={() => {
            setEditingCategory(null);
            setShowForm(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          activeOpacity={0.8}
          style={{
            shadowColor: "#4F46E5",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 10,
          }}
        >
          <Text className="text-white text-lg mr-2 font-light">+</Text>
          <Text className="text-white font-bold text-sm">Add Category</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Category Form Sheet */}
      <CategoryFormSheet
        visible={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingCategory(null);
        }}
        onSave={editingCategory ? handleEditCategory : handleAddCategory}
        initialData={
          editingCategory
            ? {
                name: editingCategory.name,
                icon: editingCategory.icon,
                color: editingCategory.color,
                type: editingCategory.type,
              }
            : undefined
        }
        typeFilter={typeFilter}
      />
    </SafeAreaView>
  );
}
