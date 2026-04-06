import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Alert,
  TextInput,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";

interface UpiPayButtonProps {
  upiId?: string | null;
  payeeName: string;
  amount: number;
  description?: string;
  onUpiIdAdded?: (upiId: string) => void;
}

export default function UpiPayButton({
  upiId,
  payeeName,
  amount,
  description = "Payment",
  onUpiIdAdded,
}: UpiPayButtonProps) {
  const [showAddUpi, setShowAddUpi] = useState(false);
  const [upiInput, setUpiInput] = useState("");

  async function handlePayViaUpi() {
    if (!upiId) {
      setShowAddUpi(true);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(description)}`;

    try {
      const canOpen = await Linking.canOpenURL(upiUri);
      if (canOpen) {
        await Linking.openURL(upiUri);
      } else {
        Alert.alert(
          "No UPI App Found",
          "Please install a UPI-enabled app (Google Pay, PhonePe, Paytm, etc.) to make this payment."
        );
      }
    } catch {
      Alert.alert("Error", "Failed to open UPI app. Please try again.");
    }
  }

  function handleSaveUpiId() {
    const trimmed = upiInput.trim();
    if (!trimmed || !/^[\w.-]+@[\w.-]+$/.test(trimmed)) {
      Alert.alert("Invalid UPI ID", "Please enter a valid UPI ID (e.g., name@upi).");
      return;
    }
    onUpiIdAdded?.(trimmed);
    setShowAddUpi(false);
    setUpiInput("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  return (
    <View>
      <TouchableOpacity
        className="bg-violet-600 rounded-xl py-4 items-center flex-row justify-center gap-2"
        onPress={handlePayViaUpi}
        activeOpacity={0.8}
        style={{
          shadowColor: "#7C3AED",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.2,
          shadowRadius: 6,
          elevation: 4,
        }}
      >
        <Text className="text-white text-lg font-bold">UPI</Text>
        <Text className="text-white font-semibold text-base">
          Pay {"\u20B9"}{amount.toLocaleString("en-IN")}
        </Text>
      </TouchableOpacity>

      {upiId && (
        <Text className="text-xs text-slate-400 text-center mt-1.5">
          To: {upiId}
        </Text>
      )}

      {!upiId && !showAddUpi && (
        <Text className="text-xs text-slate-400 text-center mt-1.5">
          UPI ID not set. Tap to add one.
        </Text>
      )}

      {showAddUpi && (
        <Animated.View
          entering={FadeIn.duration(200)}
          className="mt-3 bg-violet-50 rounded-xl p-3 border border-violet-200"
        >
          <Text className="text-sm font-medium text-violet-800 mb-2">
            Add UPI ID for {payeeName}
          </Text>
          <TextInput
            className="bg-white border border-violet-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 mb-2"
            placeholder="e.g., name@okaxis"
            placeholderTextColor="#94A3B8"
            value={upiInput}
            onChangeText={setUpiInput}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="flex-1 py-2 rounded-lg border border-violet-200 items-center"
              onPress={() => {
                setShowAddUpi(false);
                setUpiInput("");
              }}
              activeOpacity={0.7}
            >
              <Text className="text-sm text-violet-600">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-2 rounded-lg bg-violet-600 items-center"
              onPress={handleSaveUpiId}
              activeOpacity={0.8}
            >
              <Text className="text-sm font-semibold text-white">Save</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}
