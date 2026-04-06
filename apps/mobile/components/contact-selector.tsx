import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";

export interface Contact {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  upiId?: string | null;
  avatarUrl?: string | null;
}

interface ContactSelectorProps {
  contacts: Contact[];
  selectedContact: Contact | null;
  onSelect: (contact: Contact) => void;
  onClear: () => void;
  onCreateContact: (contact: Omit<Contact, "id">) => Promise<Contact>;
  isLoading?: boolean;
}

export default function ContactSelector({
  contacts,
  selectedContact,
  onSelect,
  onClear,
  onCreateContact,
  isLoading = false,
}: ContactSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // New contact form state
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newUpiId, setNewUpiId] = useState("");

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [contacts, searchQuery]);

  async function handleCreateContact() {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      const created = await onCreateContact({
        name: newName.trim(),
        phone: newPhone.trim() || null,
        email: newEmail.trim() || null,
        upiId: newUpiId.trim() || null,
      });
      onSelect(created);
      setShowNewForm(false);
      resetNewForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Error handled by parent
    } finally {
      setIsCreating(false);
    }
  }

  function resetNewForm() {
    setNewName("");
    setNewPhone("");
    setNewEmail("");
    setNewUpiId("");
  }

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  // Selected contact chip
  if (selectedContact) {
    return (
      <Animated.View entering={FadeIn.duration(200)}>
        <View className="flex-row items-center bg-primary-50 border border-primary-200 rounded-xl px-3 py-2.5">
          <View className="w-8 h-8 rounded-full bg-primary-200 items-center justify-center mr-2.5">
            <Text className="text-xs font-bold text-primary-700">
              {getInitials(selectedContact.name)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-slate-900">
              {selectedContact.name}
            </Text>
            {selectedContact.phone && (
              <Text className="text-xs text-slate-500">
                {selectedContact.phone}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => {
              onClear();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            className="w-7 h-7 rounded-full bg-slate-200 items-center justify-center"
            activeOpacity={0.7}
          >
            <Text className="text-slate-600 text-xs font-bold">X</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  return (
    <View>
      {/* Search Input */}
      <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3 mb-2">
        <Text className="text-slate-400 mr-2 text-base">O</Text>
        <TextInput
          className="flex-1 py-3 text-sm text-slate-900"
          placeholder="Search contacts..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="words"
        />
        {isLoading && <ActivityIndicator size="small" color="#4F46E5" />}
      </View>

      {/* Create New Contact Button */}
      <TouchableOpacity
        className="flex-row items-center py-2.5 px-1 mb-1"
        onPress={() => {
          setShowNewForm(!showNewForm);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        activeOpacity={0.7}
      >
        <View className="w-8 h-8 rounded-full bg-primary-100 items-center justify-center mr-2.5">
          <Text className="text-primary-600 font-bold text-sm">+</Text>
        </View>
        <Text className="text-sm font-medium text-primary-600">
          Create New Contact
        </Text>
      </TouchableOpacity>

      {/* Inline New Contact Form */}
      {showNewForm && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          exiting={FadeOut.duration(200)}
          className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-200"
        >
          <TextInput
            className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 mb-2"
            placeholder="Name *"
            placeholderTextColor="#94A3B8"
            value={newName}
            onChangeText={setNewName}
            autoCapitalize="words"
          />
          <TextInput
            className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 mb-2"
            placeholder="Phone (optional)"
            placeholderTextColor="#94A3B8"
            value={newPhone}
            onChangeText={setNewPhone}
            keyboardType="phone-pad"
          />
          <TextInput
            className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 mb-2"
            placeholder="Email (optional)"
            placeholderTextColor="#94A3B8"
            value={newEmail}
            onChangeText={setNewEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 mb-3"
            placeholder="UPI ID (optional)"
            placeholderTextColor="#94A3B8"
            value={newUpiId}
            onChangeText={setNewUpiId}
            autoCapitalize="none"
          />
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="flex-1 py-2.5 rounded-lg border border-slate-200 items-center"
              onPress={() => {
                setShowNewForm(false);
                resetNewForm();
              }}
              activeOpacity={0.7}
            >
              <Text className="text-sm font-medium text-slate-600">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-2.5 rounded-lg items-center ${
                isCreating || !newName.trim()
                  ? "bg-primary-400"
                  : "bg-primary-600"
              }`}
              onPress={handleCreateContact}
              disabled={isCreating || !newName.trim()}
              activeOpacity={0.8}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-sm font-semibold text-white">Add</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Contact List */}
      {!showNewForm && filteredContacts.length > 0 && (
        <View className="max-h-48">
          <FlatList
            data={filteredContacts}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                className="flex-row items-center py-2.5 px-1"
                onPress={() => {
                  onSelect(item);
                  setSearchQuery("");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <View className="w-8 h-8 rounded-full bg-slate-200 items-center justify-center mr-2.5">
                  <Text className="text-xs font-bold text-slate-600">
                    {getInitials(item.name)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-slate-900">
                    {item.name}
                  </Text>
                  {item.phone && (
                    <Text className="text-xs text-slate-400">{item.phone}</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {!showNewForm && searchQuery && filteredContacts.length === 0 && (
        <View className="py-4 items-center">
          <Text className="text-sm text-slate-400">No contacts found</Text>
        </View>
      )}
    </View>
  );
}
