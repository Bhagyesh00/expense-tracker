import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

interface QuickAction {
  icon: string;
  label: string;
  bgColor: string;
  route?: string;
  onPress?: () => void;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: "+",
    label: "Add\nExpense",
    bgColor: "bg-primary-100",
    route: "/expense/new",
  },
  {
    icon: "💸",
    label: "Record\nPayment",
    bgColor: "bg-green-100",
    route: "/pending/new",
  },
  {
    icon: "📷",
    label: "Scan\nReceipt",
    bgColor: "bg-amber-100",
  },
  {
    icon: "📊",
    label: "View\nReports",
    bgColor: "bg-blue-100",
    route: "/reports/",
  },
];

export default function QuickActions() {
  const router = useRouter();

  function handlePress(action: QuickAction) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (action.route) {
      router.push(action.route as any);
    } else if (action.onPress) {
      action.onPress();
    }
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(600).delay(400)}
      className="px-5 mt-6"
    >
      <Text className="text-lg font-bold text-slate-900 dark:text-white mb-3">
        Quick Actions
      </Text>
      <View className="flex-row gap-3">
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.label}
            className="flex-1 items-center"
            onPress={() => handlePress(action)}
            activeOpacity={0.7}
          >
            <View
              className={`w-14 h-14 rounded-2xl ${action.bgColor} items-center justify-center mb-2`}
            >
              <Text className="text-xl">
                {action.icon === "+" ? (
                  <Text className="text-primary-600 text-2xl font-bold">+</Text>
                ) : (
                  action.icon
                )}
              </Text>
            </View>
            <Text className="text-xs text-slate-600 dark:text-slate-400 text-center font-medium leading-3.5">
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}
