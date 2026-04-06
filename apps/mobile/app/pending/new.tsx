import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import ContactSelector, {
  type Contact,
} from "@/components/contact-selector";

// ---- Schema ----

const pendingPaymentSchema = z.object({
  direction: z.enum(["give", "receive"]),
  contactId: z.string().optional(),
  contactName: z.string().min(1, "Contact is required"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Enter a valid amount greater than 0",
    }),
  description: z.string().min(1, "Description is required").max(200),
  dueDate: z.string().optional(),
  notes: z.string().max(500).optional(),
});

type FormData = z.infer<typeof pendingPaymentSchema>;

// ---- Mock contacts ----

const MOCK_CONTACTS: Contact[] = [
  { id: "c1", name: "Rahul Sharma", phone: "+91 9876543210", email: "rahul@email.com", upiId: "rahul@okaxis" },
  { id: "c2", name: "Priya Patel", phone: "+91 9876543211", email: "priya@email.com", upiId: null },
  { id: "c3", name: "Amit Kumar", phone: "+91 9876543212", email: null, upiId: "amit@ybl" },
  { id: "c4", name: "Sneha Verma", phone: "+91 9876543213", email: "sneha@email.com", upiId: null },
  { id: "c5", name: "Vikram Singh", phone: "+91 9876543214", email: null, upiId: null },
];

export default function NewPendingPaymentScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(pendingPaymentSchema),
    defaultValues: {
      direction: "give",
      contactId: "",
      contactName: "",
      amount: "",
      description: "",
      dueDate: "",
      notes: "",
    },
  });

  const direction = watch("direction");

  const handleSelectContact = useCallback(
    (contact: Contact) => {
      setSelectedContact(contact);
      setValue("contactId", contact.id);
      setValue("contactName", contact.name);
    },
    [setValue]
  );

  const handleClearContact = useCallback(() => {
    setSelectedContact(null);
    setValue("contactId", "");
    setValue("contactName", "");
  }, [setValue]);

  const handleCreateContact = useCallback(
    async (data: Omit<Contact, "id">): Promise<Contact> => {
      // Mock create - in production, call API
      const newContact: Contact = {
        id: `c${Date.now()}`,
        ...data,
      };
      return newContact;
    },
    []
  );

  function handleDateChange(_event: any, date?: Date) {
    setShowDatePicker(Platform.OS === "ios");
    if (date) {
      setSelectedDate(date);
      setValue("dueDate", date.toISOString().split("T")[0]);
    }
  }

  async function handlePickAttachment() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Alert.alert("Add Proof", "Choose a source", [
      {
        text: "Camera",
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert("Permission needed", "Camera permission is required.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            quality: 0.7,
            allowsEditing: true,
          });
          if (!result.canceled && result.assets[0]) {
            setAttachmentUri(result.assets[0].uri);
          }
        },
      },
      {
        text: "Gallery",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            allowsEditing: true,
          });
          if (!result.canceled && result.assets[0]) {
            setAttachmentUri(result.assets[0].uri);
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    try {
      // TODO: Call API to save pending payment
      console.log("Pending payment data:", { ...data, attachmentUri });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-3 border-b border-slate-100">
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text className="text-primary-600 text-base font-medium">
              Cancel
            </Text>
          </TouchableOpacity>
          <Text className="text-lg font-bold text-slate-900">
            New Payment
          </Text>
          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#4F46E5" />
            ) : (
              <Text className="text-primary-600 text-base font-semibold">
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Direction Toggle */}
          <Animated.View entering={FadeInDown.duration(300).delay(50)} className="mb-6">
            <Text className="text-sm font-medium text-slate-700 mb-2">
              Direction
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className={`flex-1 py-4 rounded-xl items-center border-2 ${
                  direction === "give"
                    ? "bg-red-500 border-red-500"
                    : "bg-white border-slate-200"
                }`}
                onPress={() => {
                  setValue("direction", "give");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-2xl mb-1 ${
                    direction === "give" ? "" : "opacity-50"
                  }`}
                >
                  {"\u2191"}
                </Text>
                <Text
                  className={`text-sm font-bold ${
                    direction === "give" ? "text-white" : "text-slate-500"
                  }`}
                >
                  I Owe (Give)
                </Text>
                <Text
                  className={`text-[10px] mt-0.5 ${
                    direction === "give" ? "text-red-100" : "text-slate-400"
                  }`}
                >
                  Money I need to pay
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 py-4 rounded-xl items-center border-2 ${
                  direction === "receive"
                    ? "bg-green-500 border-green-500"
                    : "bg-white border-slate-200"
                }`}
                onPress={() => {
                  setValue("direction", "receive");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-2xl mb-1 ${
                    direction === "receive" ? "" : "opacity-50"
                  }`}
                >
                  {"\u2193"}
                </Text>
                <Text
                  className={`text-sm font-bold ${
                    direction === "receive" ? "text-white" : "text-slate-500"
                  }`}
                >
                  Owed to Me
                </Text>
                <Text
                  className={`text-[10px] mt-0.5 ${
                    direction === "receive"
                      ? "text-green-100"
                      : "text-slate-400"
                  }`}
                >
                  Money I need to receive
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Contact Section */}
          <Animated.View entering={FadeInDown.duration(300).delay(100)} className="mb-5">
            <Text className="text-sm font-medium text-slate-700 mb-2">
              Contact
            </Text>
            <ContactSelector
              contacts={MOCK_CONTACTS}
              selectedContact={selectedContact}
              onSelect={handleSelectContact}
              onClear={handleClearContact}
              onCreateContact={handleCreateContact}
            />
            {errors.contactName && (
              <Text className="text-red-500 text-xs mt-1">
                {errors.contactName.message}
              </Text>
            )}
          </Animated.View>

          {/* Amount Input */}
          <Animated.View entering={FadeInDown.duration(300).delay(150)} className="mb-5">
            <Text className="text-sm font-medium text-slate-700 mb-1.5">
              Amount
            </Text>
            <Controller
              control={control}
              name="amount"
              render={({ field: { onChange, onBlur, value } }) => (
                <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4">
                  <Text className="text-2xl font-bold text-slate-400 mr-2">
                    {"\u20B9"}
                  </Text>
                  <TextInput
                    className="flex-1 py-3.5 text-2xl font-bold text-slate-900"
                    placeholder="0"
                    placeholderTextColor="#CBD5E1"
                    keyboardType="decimal-pad"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    style={{ fontVariant: ["tabular-nums"] }}
                  />
                  <View className="bg-slate-200 rounded-lg px-2.5 py-1">
                    <Text className="text-xs font-semibold text-slate-600">INR</Text>
                  </View>
                </View>
              )}
            />
            {errors.amount && (
              <Text className="text-red-500 text-xs mt-1">
                {errors.amount.message}
              </Text>
            )}
          </Animated.View>

          {/* Description */}
          <Animated.View entering={FadeInDown.duration(300).delay(200)} className="mb-5">
            <Text className="text-sm font-medium text-slate-700 mb-1.5">
              Description
            </Text>
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className={`bg-slate-50 border rounded-xl px-4 py-3 text-sm text-slate-900 ${
                    errors.description ? "border-red-500" : "border-slate-200"
                  }`}
                  placeholder="What is this payment for?"
                  placeholderTextColor="#94A3B8"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.description && (
              <Text className="text-red-500 text-xs mt-1">
                {errors.description.message}
              </Text>
            )}
          </Animated.View>

          {/* Due Date */}
          <Animated.View entering={FadeInDown.duration(300).delay(250)} className="mb-5">
            <Text className="text-sm font-medium text-slate-700 mb-1.5">
              Due Date <Text className="text-slate-400">(optional)</Text>
            </Text>
            <TouchableOpacity
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text
                className={`text-sm ${
                  selectedDate ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {selectedDate
                  ? selectedDate.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Select due date"}
              </Text>
              <Text className="text-slate-400 text-sm">|</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate ?? new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}
          </Animated.View>

          {/* Notes */}
          <Animated.View entering={FadeInDown.duration(300).delay(300)} className="mb-5">
            <Text className="text-sm font-medium text-slate-700 mb-1.5">
              Notes <Text className="text-slate-400">(optional)</Text>
            </Text>
            <Controller
              control={control}
              name="notes"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 min-h-[80px]"
                  placeholder="Additional details..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  textAlignVertical="top"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </Animated.View>

          {/* Attachment */}
          <Animated.View entering={FadeInDown.duration(300).delay(350)} className="mb-8">
            <Text className="text-sm font-medium text-slate-700 mb-2">
              Proof / Attachment <Text className="text-slate-400">(optional)</Text>
            </Text>
            {attachmentUri ? (
              <View className="flex-row items-center gap-3">
                <Image
                  source={{ uri: attachmentUri }}
                  className="w-20 h-20 rounded-xl"
                  resizeMode="cover"
                />
                <View className="flex-1">
                  <Text className="text-sm text-slate-600">Photo attached</Text>
                  <TouchableOpacity
                    onPress={() => setAttachmentUri(null)}
                    className="mt-1"
                  >
                    <Text className="text-xs text-red-500 font-medium">
                      Remove
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                className="bg-slate-50 border border-dashed border-slate-300 rounded-xl py-6 items-center"
                onPress={handlePickAttachment}
                activeOpacity={0.7}
              >
                <Text className="text-2xl mb-1 text-slate-400">+</Text>
                <Text className="text-sm text-slate-500">
                  Add photo proof
                </Text>
                <Text className="text-[10px] text-slate-400 mt-0.5">
                  Camera or gallery
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Save Button */}
          <Animated.View entering={FadeInDown.duration(300).delay(400)}>
            <TouchableOpacity
              className={`rounded-xl py-4 items-center ${
                direction === "give"
                  ? isSubmitting
                    ? "bg-red-400"
                    : "bg-red-500"
                  : isSubmitting
                    ? "bg-green-400"
                    : "bg-green-500"
              }`}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              activeOpacity={0.8}
              style={{
                shadowColor: direction === "give" ? "#EF4444" : "#10B981",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 4,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-base font-bold">
                  {direction === "give"
                    ? "Record Payment I Owe"
                    : "Record Payment Owed to Me"}
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
