import { useColorScheme } from "react-native";
import { Stack } from "expo-router";

export default function AuthLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: {
          backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
        },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen
        name="verify-otp"
        options={{ animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{ animation: "slide_from_right" }}
      />
    </Stack>
  );
}
