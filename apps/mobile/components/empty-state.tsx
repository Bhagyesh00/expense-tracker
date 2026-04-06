import { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  useColorScheme,
  StyleSheet,
} from "react-native";

// ---- Types ----

export interface EmptyStateProps {
  /** Emoji or short string to display as the icon */
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Additional vertical padding around the component */
  paddingVertical?: number;
}

// ---- Component ----

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  paddingVertical = 32,
}: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // FadeIn animation
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const textPrimary = isDark ? "#F8FAFC" : "#0F172A";
  const textSecondary = isDark ? "#64748B" : "#94A3B8";
  const buttonBg = "#4F46E5";

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingVertical, opacity, transform: [{ translateY }] },
      ]}
    >
      {/* Icon */}
      <View style={styles.iconWrapper}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>

      {/* Description */}
      {description ? (
        <Text style={[styles.description, { color: textSecondary }]}>
          {description}
        </Text>
      ) : null}

      {/* CTA */}
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: buttonBg }]}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}

// ---- Styles ----

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(79, 70, 229, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconText: {
    fontSize: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
});
