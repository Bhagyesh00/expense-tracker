import "../global.css";

import { useEffect, useState, useCallback } from "react";
import { useColorScheme } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/stores/app-store";
import PinLockScreen from "@/components/pin-lock-screen";

import type { Session } from "@supabase/supabase-js";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

function useProtectedRoute(session: Session | null, isLoading: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, segments, isLoading]);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isPinLocked, isPinEnabled } = useAppStore();

  useProtectedRoute(session, isLoading);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (!isLoading) {
      await SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "slide_from_right",
              contentStyle: {
                backgroundColor: colorScheme === "dark" ? "#0F172A" : "#FFFFFF",
              },
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="expense/new"
              options={{ presentation: "modal", animation: "slide_from_bottom" }}
            />
            <Stack.Screen name="expense/[id]" />
            <Stack.Screen
              name="pending/new"
              options={{ presentation: "modal", animation: "slide_from_bottom" }}
            />
            <Stack.Screen name="pending/[id]" />
            <Stack.Screen name="pending/recurring" />
            <Stack.Screen
              name="expenses/import"
              options={{ presentation: "modal", animation: "slide_from_bottom" }}
            />
            <Stack.Screen name="expenses/templates" />
            <Stack.Screen name="expenses/mileage" />
            <Stack.Screen name="contacts/index" />
            <Stack.Screen name="contacts/[id]" />
            <Stack.Screen name="budgets/index" />
            <Stack.Screen
              name="budgets/new"
              options={{ presentation: "modal", animation: "slide_from_bottom" }}
            />
            <Stack.Screen name="budgets/[id]" />
            <Stack.Screen name="reports/index" />
            <Stack.Screen name="categories/index" />
            <Stack.Screen name="settings/index" />
            <Stack.Screen name="settings/profile" />
            <Stack.Screen
              name="settings/security"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="settings/two-factor"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="settings/data-privacy"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="net-worth/index"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="reports/tax"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="insights/subscriptions"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="onboarding/index"
              options={{
                presentation: "fullScreenModal",
                animation: "fade",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen name="insights/index" />
            <Stack.Screen name="notifications/index" />
            <Stack.Screen name="+not-found" />
          </Stack>

          {isPinEnabled && isPinLocked && <PinLockScreen />}

          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
