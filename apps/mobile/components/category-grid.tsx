import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: "expense" | "income";
  isSystem: boolean;
}

interface CategoryGridProps {
  categories: CategoryItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  searchable?: boolean;
  showAddButton?: boolean;
  onAddNew?: () => void;
  columns?: number;
}

// ---------------------------------------------------------------------------
// Default categories (fallback)
// ---------------------------------------------------------------------------

export const DEFAULT_EXPENSE_CATEGORIES: CategoryItem[] = [
  { id: "food", name: "Food & Dining", icon: "🍔", color: "#FF6B6B", type: "expense", isSystem: true },
  { id: "transport", name: "Transport", icon: "🚗", color: "#4ECDC4", type: "expense", isSystem: true },
  { id: "shopping", name: "Shopping", icon: "🛍", color: "#FF9F43", type: "expense", isSystem: true },
  { id: "bills", name: "Bills & Utilities", icon: "📄", color: "#54A0FF", type: "expense", isSystem: true },
  { id: "entertainment", name: "Entertainment", icon: "🎬", color: "#A55EEA", type: "expense", isSystem: true },
  { id: "health", name: "Health", icon: "💊", color: "#EE5A6F", type: "expense", isSystem: true },
  { id: "education", name: "Education", icon: "📚", color: "#1DD1A1", type: "expense", isSystem: true },
  { id: "groceries", name: "Groceries", icon: "🛒", color: "#10AC84", type: "expense", isSystem: true },
  { id: "rent", name: "Rent", icon: "🏠", color: "#5F6C7B", type: "expense", isSystem: true },
  { id: "travel", name: "Travel", icon: "✈️", color: "#0ABDE3", type: "expense", isSystem: true },
  { id: "personal", name: "Personal Care", icon: "✨", color: "#F368E0", type: "expense", isSystem: true },
  { id: "other", name: "Other", icon: "📌", color: "#8395A7", type: "expense", isSystem: true },
];

export const DEFAULT_INCOME_CATEGORIES: CategoryItem[] = [
  { id: "salary", name: "Salary", icon: "💰", color: "#27AE60", type: "income", isSystem: true },
  { id: "freelance", name: "Freelance", icon: "💻", color: "#2ECC71", type: "income", isSystem: true },
  { id: "investments", name: "Investments", icon: "📈", color: "#3498DB", type: "income", isSystem: true },
  { id: "gift_received", name: "Gift Received", icon: "🎁", color: "#E74C3C", type: "income", isSystem: true },
  { id: "other_income", name: "Other Income", icon: "💵", color: "#95A5A6", type: "income", isSystem: true },
];

// ---------------------------------------------------------------------------
// Animated category item
// ---------------------------------------------------------------------------

function CategoryGridItem({
  item,
  isSelected,
  onPress,
  index,
}: {
  item: CategoryItem;
  isSelected: boolean;
  onPress: () => void;
  index: number;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.9, { damping: 15 }, () => {
      scale.value = withSpring(1, { damping: 12 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress, scale]);

  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(index * 30)}
      style={animatedStyle}
      className="w-[23.5%] mb-2"
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        className={`items-center py-3 rounded-2xl border-2 ${
          isSelected
            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30"
            : isDark
              ? "border-slate-700 bg-slate-800"
              : "border-slate-100 bg-slate-50"
        }`}
      >
        <View
          className="w-10 h-10 rounded-xl items-center justify-center mb-1.5"
          style={{
            backgroundColor: item.color + "20",
          }}
        >
          <Text className="text-xl">{item.icon}</Text>
        </View>
        <Text
          className={`text-[10px] font-semibold text-center px-1 ${
            isSelected
              ? "text-primary-700 dark:text-primary-300"
              : isDark
                ? "text-slate-300"
                : "text-slate-600"
          }`}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {isSelected && (
          <View
            className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary-500 items-center justify-center"
          >
            <Text className="text-[8px] text-white font-bold">✓</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CategoryGrid({
  categories,
  selectedId,
  onSelect,
  searchable = false,
  showAddButton = false,
  onAddNew,
  columns = 4,
}: CategoryGridProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [search, setSearch] = useState("");

  const systemCategories = useMemo(
    () => categories.filter((c) => c.isSystem),
    [categories],
  );

  const customCategories = useMemo(
    () => categories.filter((c) => !c.isSystem),
    [categories],
  );

  const filteredSystem = useMemo(() => {
    if (!search.trim()) return systemCategories;
    const q = search.toLowerCase();
    return systemCategories.filter((c) => c.name.toLowerCase().includes(q));
  }, [systemCategories, search]);

  const filteredCustom = useMemo(() => {
    if (!search.trim()) return customCategories;
    const q = search.toLowerCase();
    return customCategories.filter((c) => c.name.toLowerCase().includes(q));
  }, [customCategories, search]);

  return (
    <View>
      {/* Search bar */}
      {searchable && (
        <Animated.View entering={FadeIn.duration(300)} className="mb-3">
          <View
            className={`flex-row items-center rounded-xl px-3 py-2.5 ${
              isDark ? "bg-slate-800" : "bg-slate-100"
            }`}
          >
            <Text className="text-slate-400 mr-2 text-sm">🔍</Text>
            <TextInput
              className={`flex-1 text-sm ${isDark ? "text-white" : "text-slate-900"}`}
              placeholder="Search categories..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Text className="text-slate-400">✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}

      {/* Custom categories first */}
      {filteredCustom.length > 0 && (
        <View className="mb-2">
          <Text
            className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            Custom
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 4 }}>
            {filteredCustom.map((item, index) => (
              <CategoryGridItem
                key={item.id}
                item={item}
                isSelected={selectedId === item.id}
                onPress={() => onSelect(item.id)}
                index={index}
              />
            ))}
          </View>
        </View>
      )}

      {/* System categories */}
      {filteredSystem.length > 0 && (
        <View>
          {filteredCustom.length > 0 && (
            <Text
              className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            >
              Default
            </Text>
          )}
          <View className="flex-row flex-wrap" style={{ gap: 4 }}>
            {filteredSystem.map((item, index) => (
              <CategoryGridItem
                key={item.id}
                item={item}
                isSelected={selectedId === item.id}
                onPress={() => onSelect(item.id)}
                index={index}
              />
            ))}

            {/* Add New button */}
            {showAddButton && (
              <Animated.View
                entering={FadeInDown.duration(300).delay(filteredSystem.length * 30)}
                className="w-[23.5%] mb-2"
              >
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onAddNew?.();
                  }}
                  activeOpacity={0.7}
                  className={`items-center py-3 rounded-2xl border-2 border-dashed ${
                    isDark ? "border-slate-600" : "border-slate-300"
                  }`}
                >
                  <View
                    className={`w-10 h-10 rounded-xl items-center justify-center mb-1.5 ${
                      isDark ? "bg-slate-700" : "bg-slate-100"
                    }`}
                  >
                    <Text className={`text-xl ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      +
                    </Text>
                  </View>
                  <Text
                    className={`text-[10px] font-semibold ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Add New
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </View>
      )}

      {/* Empty state */}
      {filteredSystem.length === 0 && filteredCustom.length === 0 && (
        <View className="items-center py-8">
          <Text className="text-3xl mb-2">🔍</Text>
          <Text className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            No categories found
          </Text>
        </View>
      )}
    </View>
  );
}
