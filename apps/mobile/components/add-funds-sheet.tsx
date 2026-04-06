import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";

export interface AddFundsSheetRef {
  open: (goalInfo: GoalInfo) => void;
  close: () => void;
}

interface GoalInfo {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  icon: string;
  color: string;
}

interface AddFundsSheetProps {
  onAddFunds: (goalId: string, amount: number, notes: string) => void;
}

const QUICK_AMOUNTS = [100, 500, 1000, 5000];

const AddFundsSheet = forwardRef<AddFundsSheetRef, AddFundsSheetProps>(
  ({ onAddFunds }, ref) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ["55%", "70%"], []);

    const [goalInfo, setGoalInfo] = useState<GoalInfo | null>(null);
    const [amount, setAmount] = useState("");
    const [notes, setNotes] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);

    useImperativeHandle(ref, () => ({
      open: (info: GoalInfo) => {
        setGoalInfo(info);
        setAmount("");
        setNotes("");
        setShowSuccess(false);
        bottomSheetRef.current?.snapToIndex(0);
      },
      close: () => {
        bottomSheetRef.current?.close();
      },
    }));

    const remaining = goalInfo
      ? goalInfo.targetAmount - goalInfo.currentAmount
      : 0;

    const numericAmount = parseFloat(amount) || 0;
    const isValid = numericAmount > 0;

    const handleAddFunds = useCallback(() => {
      if (!goalInfo || !isValid) return;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccess(true);
      onAddFunds(goalInfo.id, numericAmount, notes.trim());

      setTimeout(() => {
        bottomSheetRef.current?.close();
        setShowSuccess(false);
      }, 1500);
    }, [goalInfo, numericAmount, notes, isValid, onAddFunds]);

    const handleQuickAmount = useCallback((quickAmount: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setAmount(String(quickAmount));
    }, []);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      []
    );

    const bgColor = isDark ? "#1E293B" : "#FFFFFF";
    const handleColor = isDark ? "#475569" : "#CBD5E1";

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: bgColor }}
        handleIndicatorStyle={{ backgroundColor: handleColor, width: 40 }}
      >
        <BottomSheetView className="flex-1 px-5 pb-6">
          {showSuccess ? (
            <Animated.View
              entering={ZoomIn.duration(400)}
              className="flex-1 items-center justify-center"
            >
              <Text className="text-5xl mb-4">
                {"\uD83C\uDF89"}
              </Text>
              <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                Funds Added!
              </Text>
              <Text className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"} mt-1`}>
                {"\u20B9"}{numericAmount.toLocaleString("en-IN")} added to {goalInfo?.name}
              </Text>
            </Animated.View>
          ) : (
            <>
              {/* Goal info header */}
              {goalInfo && (
                <View className="mb-5">
                  <View className="flex-row items-center mb-3">
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                      style={{ backgroundColor: goalInfo.color + "20" }}
                    >
                      <Text className="text-lg">{goalInfo.icon}</Text>
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}
                      >
                        {goalInfo.name}
                      </Text>
                      <Text className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                        {"\u20B9"}{goalInfo.currentAmount.toLocaleString("en-IN")} of{" "}
                        {"\u20B9"}{goalInfo.targetAmount.toLocaleString("en-IN")}
                        {" \u2022 "}
                        {"\u20B9"}{remaining.toLocaleString("en-IN")} to go
                      </Text>
                    </View>
                  </View>

                  {/* Mini progress bar */}
                  <View
                    className={`h-1.5 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-slate-100"}`}
                  >
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min((goalInfo.currentAmount / goalInfo.targetAmount) * 100, 100)}%`,
                        backgroundColor: goalInfo.color,
                      }}
                    />
                  </View>
                </View>
              )}

              {/* Amount input */}
              <View className="mb-4">
                <Text
                  className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"} mb-2`}
                >
                  Amount
                </Text>
                <View
                  className={`flex-row items-center ${isDark ? "bg-slate-700" : "bg-slate-50"} rounded-2xl px-4 py-3`}
                >
                  <Text
                    className={`text-2xl font-bold mr-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}
                  >
                    {"\u20B9"}
                  </Text>
                  <TextInput
                    className={`flex-1 text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={isDark ? "#475569" : "#CBD5E1"}
                    autoFocus
                  />
                </View>
              </View>

              {/* Quick amounts */}
              <View className="flex-row gap-2 mb-4">
                {QUICK_AMOUNTS.map((qa) => (
                  <TouchableOpacity
                    key={qa}
                    className={`flex-1 items-center py-2.5 rounded-xl ${
                      amount === String(qa)
                        ? "bg-primary-600"
                        : isDark ? "bg-slate-700" : "bg-slate-100"
                    }`}
                    onPress={() => handleQuickAmount(qa)}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        amount === String(qa)
                          ? "text-white"
                          : isDark ? "text-slate-300" : "text-slate-600"
                      }`}
                    >
                      +{"\u20B9"}{qa.toLocaleString("en-IN")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notes input */}
              <View className="mb-5">
                <Text
                  className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"} mb-2`}
                >
                  Notes (optional)
                </Text>
                <TextInput
                  className={`${isDark ? "bg-slate-700 text-white" : "bg-slate-50 text-slate-900"} rounded-xl px-4 py-3 text-sm`}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="e.g., Monthly savings deposit"
                  placeholderTextColor={isDark ? "#475569" : "#CBD5E1"}
                  maxLength={200}
                />
              </View>

              {/* Add Funds button */}
              <TouchableOpacity
                className={`py-4 rounded-2xl items-center ${isValid ? "bg-primary-600" : isDark ? "bg-slate-700" : "bg-slate-200"}`}
                onPress={handleAddFunds}
                disabled={!isValid}
                activeOpacity={0.8}
              >
                <Text
                  className={`text-base font-bold ${isValid ? "text-white" : isDark ? "text-slate-500" : "text-slate-400"}`}
                >
                  Add Funds
                </Text>
              </TouchableOpacity>
            </>
          )}
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

AddFundsSheet.displayName = "AddFundsSheet";
export default AddFundsSheet;
