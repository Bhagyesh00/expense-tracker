import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
      <Text className="text-6xl mb-4">🔍</Text>
      <Text className="text-2xl font-bold text-slate-900 mb-2 text-center">
        Page Not Found
      </Text>
      <Text className="text-sm text-slate-500 text-center mb-8">
        The page you're looking for doesn't exist or has been moved.
      </Text>
      <TouchableOpacity
        className="bg-primary-600 rounded-xl px-8 py-4"
        onPress={() => router.replace("/(tabs)")}
        activeOpacity={0.8}
      >
        <Text className="text-white font-semibold text-base">Go to Home</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
