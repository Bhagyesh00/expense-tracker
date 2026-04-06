import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash", icon: "$" },
  { id: "upi", label: "UPI", icon: "U" },
  { id: "bank_transfer", label: "Bank", icon: "B" },
  { id: "card", label: "Card", icon: "C" },
  { id: "other", label: "Other", icon: "?" },
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number]["id"];

interface SettlePaymentSheetProps {
  contactName: string;
  totalAmount: number;
  paidAmount: number;
  onRecord: (data: {
    amount: number;
    method: PaymentMethod;
    note: string;
    proofUri: string | null;
  }) => Promise<void>;
}

export interface SettlePaymentSheetRef {
  open: () => void;
  close: () => void;
}

const SettlePaymentSheet = forwardRef<SettlePaymentSheetRef, SettlePaymentSheetProps>(
  ({ contactName, totalAmount, paidAmount, onRecord }, ref) => {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const remaining = totalAmount - paidAmount;

    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState<PaymentMethod>("cash");
    const [note, setNote] = useState("");
    const [proofUri, setProofUri] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const successScale = useSharedValue(0);
    const successStyle = useAnimatedStyle(() => ({
      transform: [{ scale: successScale.value }],
      opacity: successScale.value,
    }));

    const open = useCallback(() => {
      setAmount(remaining.toString());
      setMethod("cash");
      setNote("");
      setProofUri(null);
      setShowSuccess(false);
      bottomSheetRef.current?.expand();
    }, [remaining]);

    const close = useCallback(() => {
      bottomSheetRef.current?.close();
    }, []);

    useImperativeHandle(ref, () => ({ open, close }), [open, close]);

    async function handlePickProof() {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        setProofUri(result.assets[0].uri);
      }
    }

    async function handleTakePhoto() {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Camera permission is required to take photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        setProofUri(result.assets[0].uri);
      }
    }

    async function handleRecord() {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Invalid Amount", "Please enter a valid amount.");
        return;
      }
      if (numAmount > remaining) {
        Alert.alert(
          "Exceeds Remaining",
          `Maximum recordable amount is \u20B9${remaining.toLocaleString("en-IN")}.`
        );
        return;
      }

      setIsRecording(true);
      try {
        await onRecord({
          amount: numAmount,
          method,
          note,
          proofUri,
        });

        // Success animation
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowSuccess(true);
        successScale.value = withSequence(
          withSpring(1.2, { damping: 8 }),
          withSpring(1, { damping: 12 })
        );

        setTimeout(() => {
          setShowSuccess(false);
          successScale.value = 0;
          close();
        }, 1200);
      } catch {
        Alert.alert("Error", "Failed to record payment. Please try again.");
      } finally {
        setIsRecording(false);
      }
    }

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={[520]}
        enablePanDownToClose
        backgroundStyle={{
          borderRadius: 28,
          backgroundColor: "#FFFFFF",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
          elevation: 16,
        }}
        handleIndicatorStyle={{
          backgroundColor: "#CBD5E1",
          width: 40,
          height: 4,
          borderRadius: 2,
        }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {showSuccess ? (
            <Animated.View
              style={successStyle}
              className="items-center justify-center py-16"
            >
              <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-4">
                <Text className="text-4xl text-green-600">V</Text>
              </View>
              <Text className="text-lg font-bold text-slate-900">
                Payment Recorded!
              </Text>
              <Text className="text-sm text-slate-500 mt-1">
                {"\u20B9"}{Number(amount).toLocaleString("en-IN")} recorded
              </Text>
            </Animated.View>
          ) : (
            <>
              <Text className="text-lg font-bold text-slate-900 mb-1">
                Record Payment
              </Text>
              <Text className="text-xs text-slate-500 mb-4">
                {contactName} | Total: {"\u20B9"}{totalAmount.toLocaleString("en-IN")} | Paid: {"\u20B9"}
                {paidAmount.toLocaleString("en-IN")} | Remaining: {"\u20B9"}
                {remaining.toLocaleString("en-IN")}
              </Text>

              {/* Amount Input */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-slate-700 mb-1.5">
                  Amount
                </Text>
                <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4">
                  <Text className="text-lg font-bold text-slate-400 mr-1">
                    {"\u20B9"}
                  </Text>
                  <TextInput
                    className="flex-1 py-3 text-lg font-bold text-slate-900"
                    placeholder="0"
                    placeholderTextColor="#CBD5E1"
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={setAmount}
                    style={{ fontVariant: ["tabular-nums"] }}
                  />
                </View>
              </View>

              {/* Payment Method */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-slate-700 mb-2">
                  Payment Method
                </Text>
                <View className="flex-row gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      className={`flex-1 items-center py-2.5 rounded-xl border ${
                        method === m.id
                          ? "bg-primary-50 border-primary-400"
                          : "bg-slate-50 border-slate-200"
                      }`}
                      onPress={() => {
                        setMethod(m.id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        className={`text-sm font-bold mb-0.5 ${
                          method === m.id ? "text-primary-600" : "text-slate-500"
                        }`}
                      >
                        {m.icon}
                      </Text>
                      <Text
                        className={`text-[10px] font-medium ${
                          method === m.id ? "text-primary-600" : "text-slate-400"
                        }`}
                      >
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Proof Photo */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-slate-700 mb-2">
                  Proof (optional)
                </Text>
                <View className="flex-row gap-2 items-center">
                  <TouchableOpacity
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex-row items-center"
                    onPress={handleTakePhoto}
                    activeOpacity={0.7}
                  >
                    <Text className="text-sm text-slate-600">Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex-row items-center"
                    onPress={handlePickProof}
                    activeOpacity={0.7}
                  >
                    <Text className="text-sm text-slate-600">Gallery</Text>
                  </TouchableOpacity>
                  {proofUri && (
                    <View className="flex-row items-center">
                      <Image
                        source={{ uri: proofUri }}
                        className="w-10 h-10 rounded-lg"
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        onPress={() => setProofUri(null)}
                        className="ml-1"
                      >
                        <Text className="text-red-500 text-xs font-bold">X</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* Note Input */}
              <View className="mb-5">
                <Text className="text-sm font-medium text-slate-700 mb-1.5">
                  Note (optional)
                </Text>
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900"
                  placeholder="Payment note..."
                  placeholderTextColor="#94A3B8"
                  value={note}
                  onChangeText={setNote}
                />
              </View>

              {/* Record Button */}
              <TouchableOpacity
                className={`rounded-xl py-4 items-center ${
                  isRecording ? "bg-primary-400" : "bg-primary-600"
                }`}
                onPress={handleRecord}
                disabled={isRecording}
                activeOpacity={0.8}
                style={{
                  shadowColor: "#4F46E5",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  elevation: 4,
                }}
              >
                {isRecording ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-base font-bold">
                    Record Payment
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

SettlePaymentSheet.displayName = "SettlePaymentSheet";

export default SettlePaymentSheet;
