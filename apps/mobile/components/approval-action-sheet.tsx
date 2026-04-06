import { forwardRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";

// ---- Types ----

interface ApprovalRequest {
  id: string;
  submittedBy: string;
  submittedAt: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  status: string;
  receiptUrl?: string;
  comment?: string;
}

interface ApprovalActionSheetProps {
  snapPoints: string[];
  approval: ApprovalRequest | null;
  onApprove: (id: string, comment: string) => void;
  onReject: (id: string, comment: string) => void;
  onClose: () => void;
}

// ---- Component ----

const ApprovalActionSheet = forwardRef<BottomSheet, ApprovalActionSheetProps>(
  function ApprovalActionSheet(
    { snapPoints, approval, onApprove, onReject, onClose },
    ref
  ) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    const [comment, setComment] = useState("");

    const textPrimary = isDark ? "text-white" : "text-slate-900";
    const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
    const sheetBg = isDark ? "#0F172A" : "#FFFFFF";
    const inputBg = isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200";

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

    function handleApprovePress() {
      if (!approval) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onApprove(approval.id, comment.trim());
      setComment("");
    }

    function handleRejectPress() {
      if (!approval) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onReject(approval.id, comment.trim());
      setComment("");
    }

    if (!approval) return null;

    const isPending = approval.status === "pending";

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: sheetBg }}
        handleIndicatorStyle={{ backgroundColor: isDark ? "#475569" : "#CBD5E1" }}
        onClose={() => {
          setComment("");
          onClose();
        }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        >
          {/* Expense Details */}
          <View
            className={`${isDark ? "bg-slate-800" : "bg-slate-50"} rounded-xl p-4 mb-4`}
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>
                Expense Details
              </Text>
              {approval.receiptUrl && (
                <View className={`${isDark ? "bg-slate-700" : "bg-slate-200"} rounded-lg px-2.5 py-1`}>
                  <Text className={`text-[10px] font-medium ${textSecondary}`}>
                    {"📎"} Receipt attached
                  </Text>
                </View>
              )}
            </View>

            <Text className={`text-lg font-bold ${textPrimary} mb-1`}>
              {approval.description}
            </Text>

            <View className="flex-row items-center justify-between mt-2">
              <View className="flex-row items-center gap-2">
                <View className={`${isDark ? "bg-slate-700" : "bg-slate-200"} rounded-full px-2.5 py-0.5`}>
                  <Text className={`text-xs font-medium ${textSecondary}`}>
                    {approval.category}
                  </Text>
                </View>
                <Text className={`text-xs ${textSecondary}`}>{approval.date}</Text>
              </View>
              <Text className={`text-xl font-bold ${textPrimary}`}>
                {"\u20B9"}{approval.amount.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>

          {/* Submitted By */}
          <View
            className={`${isDark ? "bg-slate-800" : "bg-slate-50"} rounded-xl p-4 mb-4`}
          >
            <View className="flex-row items-center">
              <View className={`w-10 h-10 rounded-full ${isDark ? "bg-slate-700" : "bg-slate-200"} items-center justify-center mr-3`}>
                <Text className="text-base">{"👤"}</Text>
              </View>
              <View>
                <Text className={`text-sm font-semibold ${textPrimary}`}>
                  {approval.submittedBy}
                </Text>
                <Text className={`text-xs ${textSecondary} mt-0.5`}>
                  Submitted {approval.submittedAt}
                </Text>
              </View>
            </View>
          </View>

          {/* Previous Comment (for approved/rejected) */}
          {approval.comment && (
            <View
              className={`${isDark ? "bg-slate-800" : "bg-slate-50"} rounded-xl p-4 mb-4`}
            >
              <Text className={`text-xs font-semibold ${textSecondary} mb-2`}>
                Review Comment
              </Text>
              <Text className={`text-sm ${textPrimary}`}>{approval.comment}</Text>
            </View>
          )}

          {/* Comment Input (only for pending) */}
          {isPending && (
            <>
              <Text className={`text-xs font-semibold ${textSecondary} mb-2 px-1`}>
                Add Comment (optional)
              </Text>
              <TextInput
                className={`${inputBg} border rounded-xl px-4 py-3 text-sm ${textPrimary} mb-4`}
                placeholder="Add a comment..."
                placeholderTextColor={isDark ? "#475569" : "#94A3B8"}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* Action Buttons */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 bg-green-600 rounded-xl py-3.5 items-center"
                  onPress={handleApprovePress}
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-sm font-semibold">
                    {"✅"} Approve
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-red-600 rounded-xl py-3.5 items-center"
                  onPress={handleRejectPress}
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-sm font-semibold">
                    {"❌"} Reject
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

export default ApprovalActionSheet;
