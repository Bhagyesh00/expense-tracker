import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Share, Alert } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

interface ReminderComposerProps {
  contactName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  amount: number;
  description?: string;
  onClose: () => void;
}

export default function ReminderComposer({
  contactName,
  contactPhone,
  contactEmail,
  amount,
  description,
  onClose,
}: ReminderComposerProps) {
  const defaultMessage = `Hi ${contactName}, this is a friendly reminder about the pending payment of \u20B9${amount.toLocaleString("en-IN")}${description ? ` for "${description}"` : ""}. Please settle at your earliest convenience. Thank you!`;

  const [message, setMessage] = useState(defaultMessage);

  async function handleShare(method: "general" | "whatsapp" | "sms" | "email") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      if (method === "whatsapp") {
        const phone = contactPhone?.replace(/[^0-9]/g, "") ?? "";
        const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
        const { Linking } = require("react-native");
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
          onClose();
          return;
        } else {
          Alert.alert("WhatsApp not available", "WhatsApp is not installed on this device.");
          return;
        }
      }

      if (method === "sms") {
        const phone = contactPhone ?? "";
        const { Linking } = require("react-native");
        await Linking.openURL(`sms:${phone}?body=${encodeURIComponent(message)}`);
        onClose();
        return;
      }

      if (method === "email") {
        const email = contactEmail ?? "";
        const subject = `Payment Reminder - \u20B9${amount.toLocaleString("en-IN")}`;
        const { Linking } = require("react-native");
        await Linking.openURL(
          `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
        );
        onClose();
        return;
      }

      // General share
      await Share.share({
        message,
        title: "Payment Reminder",
      });
      onClose();
    } catch {
      // User cancelled or error
    }
  }

  const shareOptions = [
    {
      id: "general",
      label: "Share",
      icon: "^",
      bg: "bg-primary-600",
      textColor: "text-white",
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: "W",
      bg: "bg-green-600",
      textColor: "text-white",
      disabled: !contactPhone,
    },
    {
      id: "sms",
      label: "SMS",
      icon: "S",
      bg: "bg-blue-600",
      textColor: "text-white",
      disabled: !contactPhone,
    },
    {
      id: "email",
      label: "Email",
      icon: "@",
      bg: "bg-orange-600",
      textColor: "text-white",
      disabled: !contactEmail,
    },
  ] as const;

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <Text className="text-lg font-bold text-slate-900 mb-1">
        Send Reminder
      </Text>
      <Text className="text-xs text-slate-500 mb-4">
        Customize the message and choose how to send it
      </Text>

      <TextInput
        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 min-h-[100px] mb-4"
        multiline
        textAlignVertical="top"
        value={message}
        onChangeText={setMessage}
        placeholderTextColor="#94A3B8"
      />

      <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        Send Via
      </Text>

      <View className="flex-row gap-2 mb-4">
        {shareOptions.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            className={`flex-1 items-center py-3 rounded-xl ${
              opt.disabled ? "bg-slate-200" : opt.bg
            }`}
            onPress={() =>
              handleShare(opt.id as "general" | "whatsapp" | "sms" | "email")
            }
            disabled={opt.disabled}
            activeOpacity={0.8}
          >
            <Text
              className={`text-lg font-bold mb-0.5 ${
                opt.disabled ? "text-slate-400" : opt.textColor
              }`}
            >
              {opt.icon}
            </Text>
            <Text
              className={`text-[10px] font-semibold ${
                opt.disabled ? "text-slate-400" : opt.textColor
              }`}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        className="py-3 items-center"
        onPress={onClose}
        activeOpacity={0.7}
      >
        <Text className="text-sm font-medium text-slate-500">Cancel</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
