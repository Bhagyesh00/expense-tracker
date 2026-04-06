import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { supabase } from "@/lib/supabase";

// ---- Menu Item ----

interface MenuItemProps {
  icon: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}

function MenuItem({
  icon,
  label,
  subtitle,
  onPress,
  destructive,
  showChevron = true,
}: MenuItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <TouchableOpacity
      className="flex-row items-center py-3.5 px-1"
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.6}
    >
      <View
        className={`w-10 h-10 rounded-xl ${isDark ? "bg-slate-700" : "bg-slate-100"} items-center justify-center mr-3`}
      >
        <Text className="text-lg">{icon}</Text>
      </View>
      <View className="flex-1">
        <Text
          className={`text-sm font-medium ${
            destructive
              ? "text-red-500"
              : isDark
                ? "text-white"
                : "text-slate-900"
          }`}
        >
          {label}
        </Text>
        {subtitle && (
          <Text
            className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"} mt-0.5`}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {showChevron && (
        <Text
          className={`text-lg ${isDark ? "text-slate-600" : "text-slate-300"}`}
        >
          ›
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ---- Menu Section ----

interface MenuSectionProps {
  title: string;
  children: React.ReactNode;
  delay?: number;
}

function MenuSection({ title, children, delay = 0 }: MenuSectionProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Animated.View
      entering={FadeInDown.duration(500).delay(delay)}
      className="mb-5"
    >
      <Text
        className={`text-xs font-semibold ${isDark ? "text-slate-500" : "text-slate-400"} uppercase tracking-wider mb-2 px-1`}
      >
        {title}
      </Text>
      <View
        className={`${isDark ? "bg-slate-800" : "bg-white"} rounded-2xl px-4`}
        style={{
          shadowColor: isDark ? "#000" : "#64748B",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0.2 : 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        {children}
      </View>
    </Animated.View>
  );
}

function Divider() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return <View className={`h-px ${isDark ? "bg-slate-700" : "bg-slate-100"}`} />;
}

// ---- Main Screen ----

export default function MoreScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  async function handleSignOut() {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? You'll need to sign in again to access your data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await supabase.auth.signOut();
          },
        },
      ]
    );
  }

  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`} edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-4 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Animated.View entering={FadeInDown.duration(500).delay(50)}>
          <Text className={`text-2xl font-bold ${textPrimary} mb-5`}>
            More
          </Text>
        </Animated.View>

        {/* Profile Card */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <TouchableOpacity
            className={`${isDark ? "bg-slate-800" : "bg-white"} rounded-2xl p-4 flex-row items-center mb-6`}
            style={{
              shadowColor: isDark ? "#000" : "#64748B",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.2 : 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/settings/profile");
            }}
            activeOpacity={0.7}
          >
            <View className="w-14 h-14 rounded-full bg-primary-100 items-center justify-center mr-4">
              <Text className="text-2xl">👤</Text>
            </View>
            <View className="flex-1">
              <Text className={`text-base font-semibold ${textPrimary}`}>
                User Name
              </Text>
              <Text className={`text-sm ${textSecondary} mt-0.5`}>
                user@example.com
              </Text>
            </View>
            <View className="bg-primary-50 dark:bg-primary-900/30 rounded-full px-3 py-1">
              <Text className="text-primary-600 text-xs font-medium">Edit</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Finance */}
        <MenuSection title="Finance" delay={200}>
          <MenuItem
            icon="💰"
            label="Budgets & Goals"
            subtitle="Track your spending limits"
            onPress={() => router.push("/budgets/")}
          />
          <Divider />
          <MenuItem
            icon="📈"
            label="Reports & Analytics"
            subtitle="Insights into your spending"
            onPress={() => router.push("/reports/")}
          />
          <Divider />
          <MenuItem
            icon="🏦"
            label="Net Worth"
            subtitle="Track assets and liabilities"
            onPress={() => router.push("/net-worth/")}
          />
          <Divider />
          <MenuItem
            icon="🧾"
            label="Tax Export"
            subtitle="FY reports, GST & CSV/PDF export"
            onPress={() => router.push("/reports/tax")}
          />
          <Divider />
          <MenuItem
            icon="🔄"
            label="Subscriptions"
            subtitle="Detected recurring subscriptions"
            onPress={() => router.push("/insights/subscriptions")}
          />
          <Divider />
          <MenuItem
            icon="🏷"
            label="Categories"
            subtitle="Manage expense categories"
            onPress={() => router.push("/categories/")}
          />
          <Divider />
          <MenuItem
            icon="👥"
            label="Contacts"
            subtitle="People you split expenses with"
            onPress={() => router.push("/contacts/")}
          />
          <Divider />
          <MenuItem
            icon="📋"
            label="Expense Templates"
            subtitle="Quick-add frequent expenses"
            onPress={() => router.push("/expenses/templates")}
          />
          <Divider />
          <MenuItem
            icon="🚗"
            label="Mileage Tracker"
            subtitle="Log trips and calculate reimbursement"
            onPress={() => router.push("/expenses/mileage")}
          />
          <Divider />
          <MenuItem
            icon="📅"
            label="Recurring Payments"
            subtitle="Manage scheduled payments"
            onPress={() => router.push("/pending/recurring")}
          />
        </MenuSection>

        {/* Intelligence */}
        <MenuSection title="Intelligence" delay={300}>
          <MenuItem
            icon="✨"
            label="AI Insights"
            subtitle="Smart spending analysis"
            onPress={() => router.push("/insights/")}
          />
          <Divider />
          <MenuItem
            icon="🔔"
            label="Notifications"
            subtitle="Alerts, reminders & AI updates"
            onPress={() => router.push("/notifications/")}
          />
        </MenuSection>

        {/* Integrations & Sync */}
        <MenuSection title="Integrations & Sync" delay={350}>
          <MenuItem
            icon="🔗"
            label="Integrations"
            subtitle="Google Sheets, Slack, QuickBooks, Xero"
            onPress={() => router.push("/integrations/")}
          />
          <Divider />
          <MenuItem
            icon="🏦"
            label="Bank Sync"
            subtitle="Connect accounts & import statements"
            onPress={() => router.push("/bank-sync/")}
          />
        </MenuSection>

        {/* Enterprise */}
        <MenuSection title="Enterprise" delay={370}>
          <MenuItem
            icon="🏢"
            label="Admin Dashboard"
            subtitle="Approvals, policies & team management"
            onPress={() => router.push("/admin/")}
          />
        </MenuSection>

        {/* Security */}
        <MenuSection title="Security" delay={380}>
          <MenuItem
            icon="🔐"
            label="Two-Factor Auth"
            subtitle="TOTP authenticator setup"
            onPress={() => router.push("/settings/two-factor")}
          />
          <Divider />
          <MenuItem
            icon="🛡️"
            label="Data & Privacy"
            subtitle="Export data, private mode, delete account"
            onPress={() => router.push("/settings/data-privacy")}
          />
        </MenuSection>

        {/* Preferences */}
        <MenuSection title="Preferences" delay={450}>
          <MenuItem
            icon="⚙️"
            label="Settings"
            subtitle="App preferences & security"
            onPress={() => router.push("/settings/")}
          />
          <Divider />
          <MenuItem
            icon="🎨"
            label="Theme"
            subtitle={isDark ? "Dark mode" : "Light mode"}
            onPress={() => {
              Alert.alert("Theme", "Theme settings will be available in Settings.");
            }}
          />
          <Divider />
          <MenuItem
            icon="💱"
            label="Currency"
            subtitle="INR (Indian Rupee)"
            onPress={() => router.push("/settings/")}
          />
          <Divider />
          <MenuItem
            icon="🌐"
            label="Language & Region"
            subtitle="Language, date & number format"
            onPress={() => router.push("/settings/language")}
          />
          <Divider />
          <MenuItem
            icon="♿"
            label="Accessibility"
            subtitle="Font size, contrast & motion"
            onPress={() => router.push("/settings/accessibility")}
          />
        </MenuSection>

        {/* Account */}
        <MenuSection title="Account" delay={500}>
          <MenuItem
            icon="ℹ️"
            label="About"
            subtitle="Version 1.0.0"
            onPress={() => {
              Alert.alert(
                "ExpenseFlow",
                "Version 1.0.0\n\nSmart expense tracking with AI-powered insights, split payments, and budgeting tools."
              );
            }}
          />
          <Divider />
          <MenuItem
            icon="🚪"
            label="Sign Out"
            onPress={handleSignOut}
            destructive
            showChevron={false}
          />
        </MenuSection>
      </ScrollView>
    </SafeAreaView>
  );
}
