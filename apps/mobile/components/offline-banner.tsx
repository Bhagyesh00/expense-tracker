import { useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOfflineSyncStore } from "@/lib/offline-sync";

// ---- Component ----

export default function OfflineBanner() {
  const isOnline = useOfflineSyncStore((s) => s.isOnline);
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Animated height for slide in/out
  const translateY = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Track previous online state to avoid animating on first render
  const prevOnline = useRef<boolean | null>(null);

  useEffect(() => {
    if (prevOnline.current === null) {
      // First render — skip animation if online
      if (!isOnline) {
        translateY.setValue(0);
        opacity.setValue(1);
      }
      prevOnline.current = isOnline;
      return;
    }

    prevOnline.current = isOnline;

    if (!isOnline) {
      // Slide in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 70,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide out
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -60,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOnline]);

  // Don't render anything when online (allow animated exit first)
  if (isOnline && prevOnline.current === null) return null;

  const bannerBg = isDark
    ? "rgba(120, 53, 15, 0.95)"  // dark amber
    : "#FEF3C7"; // light amber
  const borderColor = isDark ? "#92400E" : "#F59E0B";
  const textColor = isDark ? "#FCD34D" : "#92400E";
  const iconColor = isDark ? "#FCD34D" : "#B45309";

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          top: insets.top,
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="none"
    >
      <View
        style={[
          styles.banner,
          {
            backgroundColor: bannerBg,
            borderColor,
          },
        ]}
      >
        {/* Wifi-off icon (drawn with text) */}
        <Text style={[styles.icon, { color: iconColor }]}>📶</Text>

        <Text style={[styles.text, { color: textColor }]}>
          You're offline. Changes will sync when connected.
        </Text>
      </View>
    </Animated.View>
  );
}

// ---- Styles ----

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    gap: 10,
  },
  icon: {
    fontSize: 16,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
});
