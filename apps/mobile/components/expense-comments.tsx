import { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExpenseComment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
  isOwn: boolean;
}

interface ExpenseCommentsProps {
  expenseId: string;
  currentUserId?: string;
  currentUserName?: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_COMMENTS: ExpenseComment[] = [
  {
    id: "c1",
    authorId: "user2",
    authorName: "Priya Patel",
    text: "Can you send me the receipt for this one?",
    createdAt: "2026-03-25T10:30:00Z",
    isOwn: false,
  },
  {
    id: "c2",
    authorId: "me",
    authorName: "You",
    text: "Sure, I'll attach it now.",
    createdAt: "2026-03-25T10:45:00Z",
    isOwn: true,
  },
  {
    id: "c3",
    authorId: "user3",
    authorName: "Rahul Sharma",
    text: "This was for the team lunch, right? Should this be under team expenses?",
    createdAt: "2026-03-25T11:00:00Z",
    isOwn: false,
  },
];

// ---------------------------------------------------------------------------
// Time ago helper
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ---------------------------------------------------------------------------
// Avatar initials
// ---------------------------------------------------------------------------

function AvatarInitials({
  name,
  isOwn,
  size = 32,
}: {
  name: string;
  isOwn: boolean;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View
      className={`rounded-full items-center justify-center ${
        isOwn ? "bg-primary-100" : "bg-slate-200 dark:bg-slate-700"
      }`}
      style={{ width: size, height: size }}
    >
      <Text
        className={`font-bold ${
          isOwn
            ? "text-primary-700"
            : "text-slate-600 dark:text-slate-300"
        }`}
        style={{ fontSize: size * 0.34 }}
      >
        {initials}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Comment Row
// ---------------------------------------------------------------------------

function CommentRow({
  comment,
  onLongPress,
  isDark,
}: {
  comment: ExpenseComment;
  onLongPress: (comment: ExpenseComment) => void;
  isDark: boolean;
}) {
  const textSecondary = isDark ? "text-slate-400" : "text-slate-400";

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      className={`flex-row mb-4 ${comment.isOwn ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <View className={`${comment.isOwn ? "ml-2" : "mr-2"} mt-1`}>
        <AvatarInitials name={comment.authorName} isOwn={comment.isOwn} />
      </View>

      {/* Bubble */}
      <View className={`flex-1 ${comment.isOwn ? "items-end" : "items-start"}`}>
        <View className="flex-row items-baseline gap-2 mb-1">
          <Text
            className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}
          >
            {comment.isOwn ? "You" : comment.authorName}
          </Text>
          <Text className={`text-[10px] ${textSecondary}`}>
            {timeAgo(comment.createdAt)}
          </Text>
        </View>

        <TouchableOpacity
          onLongPress={() => {
            if (comment.isOwn) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onLongPress(comment);
            }
          }}
          activeOpacity={0.85}
          delayLongPress={400}
          className={`rounded-2xl px-4 py-2.5 max-w-[85%] ${
            comment.isOwn
              ? "rounded-tr-sm bg-primary-600"
              : isDark
                ? "rounded-tl-sm bg-slate-700"
                : "rounded-tl-sm bg-slate-100"
          }`}
        >
          <Text
            className={`text-sm leading-5 ${
              comment.isOwn
                ? "text-white"
                : isDark
                  ? "text-slate-200"
                  : "text-slate-800"
            }`}
          >
            {comment.text}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ExpenseComments({
  expenseId,
  currentUserId = "me",
  currentUserName = "You",
}: ExpenseCommentsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [comments, setComments] = useState<ExpenseComment[]>(MOCK_COMMENTS);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const sendScale = useSharedValue(1);
  const sendStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;

    sendScale.value = withSequence(
      withTiming(0.9, { duration: 80 }),
      withSpring(1, { damping: 12 }),
    );

    const newComment: ExpenseComment = {
      id: String(Date.now()),
      authorId: currentUserId,
      authorName: currentUserName,
      text,
      createdAt: new Date().toISOString(),
      isOwn: true,
    };

    setInputText("");
    setIsSending(true);

    try {
      // TODO: Call API to save comment
      await new Promise((r) => setTimeout(r, 300));
      setComments((prev) => [...prev, newComment]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert("Error", "Failed to send comment.");
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  }, [inputText, currentUserId, currentUserName, sendScale]);

  const handleLongPress = useCallback((comment: ExpenseComment) => {
    Alert.alert("Delete Comment", "Delete this comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setComments((prev) => prev.filter((c) => c.id !== comment.id));
        },
      },
    ]);
  }, []);

  const canSend = inputText.trim().length > 0 && !isSending;

  const cardBg = isDark ? "bg-slate-800" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const borderColor = isDark ? "border-slate-700" : "border-slate-200";
  const inputBg = isDark ? "bg-slate-700" : "bg-white";

  return (
    <View>
      {/* Section header */}
      <View className="flex-row items-center justify-between mb-3">
        <Text
          className={`text-xs font-bold uppercase tracking-wider ${
            isDark ? "text-slate-500" : "text-slate-400"
          }`}
        >
          Comments
        </Text>
        <Text className={`text-xs ${textSecondary}`}>
          {comments.length} comment{comments.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Comments list */}
      {comments.length === 0 ? (
        <Animated.View
          entering={FadeIn.duration(300)}
          className={`${cardBg} rounded-2xl p-6 items-center mb-4`}
        >
          <Text className="text-3xl mb-2">💬</Text>
          <Text className={`text-sm font-medium ${textPrimary} mb-0.5`}>
            No Comments Yet
          </Text>
          <Text className={`text-xs ${textSecondary} text-center`}>
            Be the first to add a note or question
          </Text>
        </Animated.View>
      ) : (
        <View className="mb-2">
          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              onLongPress={handleLongPress}
              isDark={isDark}
            />
          ))}
        </View>
      )}

      {/* Add comment input */}
      <View
        className={`flex-row items-end gap-2 pt-3 border-t ${borderColor}`}
      >
        {/* Own avatar */}
        <AvatarInitials name={currentUserName} isOwn={true} size={32} />

        {/* Input */}
        <View
          className={`flex-1 flex-row items-end rounded-2xl px-3 py-2 border ${
            isDark
              ? `${inputBg} border-slate-600`
              : `${inputBg} border-slate-200`
          }`}
        >
          <TextInput
            ref={inputRef}
            className={`flex-1 text-sm ${textPrimary} max-h-[100px] py-1`}
            placeholder="Add a comment..."
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            multiline
            returnKeyType="default"
            blurOnSubmit={false}
          />
        </View>

        {/* Send button */}
        <Animated.View style={sendStyle}>
          <TouchableOpacity
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.8}
            className={`w-10 h-10 rounded-full items-center justify-center ${
              canSend ? "bg-primary-600" : isDark ? "bg-slate-700" : "bg-slate-200"
            }`}
            style={
              canSend
                ? {
                    shadowColor: "#4F46E5",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 4,
                  }
                : undefined
            }
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text
                className={`text-base font-bold ${
                  canSend ? "text-white" : isDark ? "text-slate-500" : "text-slate-400"
                }`}
              >
                ↑
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}
