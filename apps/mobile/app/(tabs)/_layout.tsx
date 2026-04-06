import { View, TouchableOpacity, Platform, useColorScheme } from "react-native";
import { Text } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";

// ---- Tab Icon Components ----

function HomeIcon({ focused, color }: { focused: boolean; color: string }) {
  return (
    <View className="items-center justify-center w-7 h-7">
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: color,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: focused ? color + "15" : "transparent",
        }}
      >
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 2,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

function ExpensesIcon({ focused, color }: { focused: boolean; color: string }) {
  return (
    <View className="items-center justify-center w-7 h-7">
      <View
        style={{
          width: 18,
          height: 22,
          borderRadius: 4,
          borderWidth: 2,
          borderColor: color,
          backgroundColor: focused ? color + "15" : "transparent",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              width: 8,
              height: 1.5,
              borderRadius: 1,
              backgroundColor: color,
            }}
          />
        ))}
      </View>
    </View>
  );
}

function PendingIcon({ focused, color }: { focused: boolean; color: string }) {
  return (
    <View className="items-center justify-center w-7 h-7">
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: color,
          backgroundColor: focused ? color + "15" : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ flexDirection: "row", gap: 2 }}>
          <View
            style={{
              width: 3,
              height: 6,
              borderRadius: 1,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              width: 3,
              height: 6,
              borderRadius: 1,
              backgroundColor: color,
              transform: [{ rotate: "180deg" }],
            }}
          />
        </View>
      </View>
    </View>
  );
}

function MoreIcon({ focused, color }: { focused: boolean; color: string }) {
  return (
    <View className="items-center justify-center w-7 h-7">
      <View style={{ gap: 3 }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              width: 18,
              height: 2,
              backgroundColor: color,
              borderRadius: 1,
              ...(focused && i === 1 ? { width: 12 } : {}),
            }}
          />
        ))}
      </View>
    </View>
  );
}

// ---- FAB Button ----

function AddButton({ onPress }: { onPress?: () => void }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        className="w-14 h-14 rounded-full bg-primary-600 items-center justify-center -mt-6"
        style={{
          shadowColor: "#4F46E5",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 10,
        }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          scale.value = withSpring(0.9, {}, () => {
            scale.value = withSpring(1);
          });
          onPress?.();
        }}
        activeOpacity={0.8}
      >
        <Text className="text-white text-3xl font-light" style={{ marginTop: -2 }}>
          +
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ---- Tab Badge ----

function TabBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <View
      className="absolute -top-1 -right-2 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1"
      style={{ zIndex: 10 }}
    >
      <Text className="text-white text-[10px] font-bold">
        {count > 99 ? "99+" : count}
      </Text>
    </View>
  );
}

// ---- Main Layout ----

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const pendingCount = 3; // TODO: Replace with real data

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#4F46E5",
        tabBarInactiveTintColor: isDark ? "#64748B" : "#94A3B8",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: isDark ? "#1E293B" : "#F1F5F9",
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          ...(Platform.OS === "ios"
            ? {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: isDark ? 0.2 : 0.06,
                shadowRadius: 12,
              }
            : { elevation: 12 }),
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color }) => (
            <HomeIcon focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: "Expenses",
          tabBarIcon: ({ focused, color }) => (
            <ExpensesIcon focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "",
          tabBarButton: (props: BottomTabBarButtonProps) => (
            <View className="items-center justify-center flex-1">
              <AddButton onPress={() => router.push("/expense/new")} />
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/expense/new");
          },
        }}
      />
      <Tabs.Screen
        name="pending"
        options={{
          title: "Pending",
          tabBarIcon: ({ focused, color }) => (
            <View>
              <PendingIcon focused={focused} color={color} />
              <TabBadge count={pendingCount} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ focused, color }) => (
            <MoreIcon focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
