import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";

import { supabase } from "./supabase";

/**
 * Configure how notifications are displayed when the app is in the foreground.
 */
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Register for push notifications and return the Expo push token.
 * Returns null if registration fails or device is a simulator.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn("Push notifications require a physical device");
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not already granted
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("Push notification permission not granted");
    return null;
  }

  // Get Expo push token
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn("Missing EAS project ID for push notifications");
      return null;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    // Android requires a notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6366F1",
      });

      await Notifications.setNotificationChannelAsync("reminders", {
        name: "Expense Reminders",
        description: "Daily reminders to log your expenses",
        importance: Notifications.AndroidImportance.DEFAULT,
      });

      await Notifications.setNotificationChannelAsync("budget-alerts", {
        name: "Budget Alerts",
        description: "Notifications when you approach budget limits",
        importance: Notifications.AndroidImportance.HIGH,
      });

      await Notifications.setNotificationChannelAsync("payment-due", {
        name: "Payment Due",
        description: "Reminders for pending payment due dates",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    return tokenResponse.data;
  } catch (error: unknown) {
    console.error("Failed to get push token:", error);
    return null;
  }
}

/**
 * Save the push notification token to the user's profile in Supabase.
 */
export async function savePushToken(
  userId: string,
  token: string
): Promise<void> {
  try {
    const { error } = await supabase.from("user_push_tokens").upsert(
      {
        user_id: userId,
        push_token: token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      } as any,
      {
        onConflict: "user_id,platform",
      }
    );

    if (error) {
      console.error("Failed to save push token:", error);
    }
  } catch (error: unknown) {
    console.error("Error saving push token:", error);
  }
}

/**
 * Set up a listener for notification responses (user taps on notification).
 * Returns a cleanup function.
 */
export function setupNotificationResponseHandler(
  onResponse: (notification: Notifications.NotificationResponse) => void
): () => void {
  const subscription =
    Notifications.addNotificationResponseReceivedListener(onResponse);

  return () => subscription.remove();
}

/**
 * Handle deep links from notification data.
 */
export function getNotificationDeepLink(
  notification: Notifications.Notification
): string | null {
  const data = notification.request.content.data;

  if (!data) return null;

  // Expected data shapes:
  // { type: 'expense', id: '...' } → /expense/[id]
  // { type: 'pending', id: '...' } → /pending/[id]
  // { type: 'budget_alert' } → /reports
  // { type: 'reminder' } → /expense/new

  switch (data.type) {
    case "expense":
      return data.id ? `/expense/${data.id}` : null;
    case "pending":
      return data.id ? `/pending/${data.id}` : null;
    case "budget_alert":
      return "/reports";
    case "reminder":
      return "/expense/new";
    default:
      return null;
  }
}
