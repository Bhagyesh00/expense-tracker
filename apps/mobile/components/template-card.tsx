import { useCallback } from "react";
import { View, Text, TouchableOpacity, useColorScheme } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExpenseTemplate {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number | null; // null = variable
  type: "expense" | "income";
  notes?: string;
}

interface TemplateCardProps {
  template: ExpenseTemplate;
  index?: number;
  onUse: (template: ExpenseTemplate) => void;
  onLongPress?: (template: ExpenseTemplate) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TemplateCard({
  template,
  index = 0,
  onUse,
  onLongPress,
}: TemplateCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const scale = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleUse = useCallback(() => {
    scale.value = withSequence(
      withTiming(0.97, { duration: 80 }),
      withSpring(1, { damping: 12 }),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUse(template);
  }, [template, onUse, scale]);

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onLongPress?.(template);
  }, [template, onLongPress]);

  const isVariable = template.amount === null;

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(index * 60)}
      style={cardStyle}
      className="mb-3"
    >
      <TouchableOpacity
        onPress={handleUse}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
        delayLongPress={400}
        className={`rounded-2xl p-4 flex-row items-center border ${
          isDark
            ? "bg-slate-800 border-slate-700"
            : "bg-white border-slate-100"
        }`}
        style={{
          shadowColor: isDark ? "#000" : "#64748B",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.15 : 0.06,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        {/* Category icon circle */}
        <View
          className="w-12 h-12 rounded-2xl items-center justify-center mr-4"
          style={{ backgroundColor: template.categoryColor + "20" }}
        >
          <Text className="text-2xl">{template.categoryIcon}</Text>
        </View>

        {/* Info */}
        <View className="flex-1">
          <Text
            className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"} mb-0.5`}
            numberOfLines={1}
          >
            {template.name}
          </Text>

          <View className="flex-row items-center gap-2">
            {/* Amount */}
            <Text
              className={`text-sm font-bold ${
                isVariable
                  ? isDark
                    ? "text-slate-500"
                    : "text-slate-400"
                  : template.type === "income"
                    ? "text-green-600"
                    : isDark
                      ? "text-slate-200"
                      : "text-slate-900"
              }`}
            >
              {isVariable
                ? "Variable amount"
                : `₹${template.amount!.toLocaleString("en-IN")}`}
            </Text>
          </View>

          {/* Category label */}
          <View className="flex-row items-center mt-1">
            <View
              className="px-2 py-0.5 rounded-full"
              style={{ backgroundColor: template.categoryColor + "20" }}
            >
              <Text
                className="text-[10px] font-semibold"
                style={{ color: template.categoryColor }}
              >
                {template.categoryName}
              </Text>
            </View>
          </View>
        </View>

        {/* Use button */}
        <TouchableOpacity
          onPress={handleUse}
          activeOpacity={0.8}
          className="bg-primary-600 rounded-xl px-4 py-2"
          style={{
            shadowColor: "#4F46E5",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text className="text-white text-xs font-bold">Use</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}
