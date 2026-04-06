import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
  StyleSheet,
  useColorScheme,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

// ---- Constants ----

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ONBOARDING_KEY = "onboarding_complete";

// ---- Slide data ----

interface Slide {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  accentColor: string;
  bgLight: string;
  bgDark: string;
}

const SLIDES: Slide[] = [
  {
    id: "1",
    emoji: "⚡",
    title: "Track Every Expense",
    subtitle: "Add expenses in 3 seconds with smart categorization and receipt scanning.",
    accentColor: "#4F46E5",
    bgLight: "#EEF2FF",
    bgDark: "#1E1B4B",
  },
  {
    id: "2",
    emoji: "🤝",
    title: "Manage Pending Payments",
    subtitle: "Never forget who owes you. Split bills, track IOUs, and settle up instantly via UPI.",
    accentColor: "#059669",
    bgLight: "#ECFDF5",
    bgDark: "#064E3B",
  },
  {
    id: "3",
    emoji: "✨",
    title: "Smart Budgets",
    subtitle: "AI-powered budget recommendations based on your spending patterns. Stay on track effortlessly.",
    accentColor: "#7C3AED",
    bgLight: "#F5F3FF",
    bgDark: "#2E1065",
  },
  {
    id: "4",
    emoji: "📡",
    title: "Works Offline",
    subtitle: "Add expenses anywhere, even without internet. Everything syncs automatically when you reconnect.",
    accentColor: "#B45309",
    bgLight: "#FFFBEB",
    bgDark: "#451A03",
  },
];

// ---- Slide Component ----

interface SlideProps {
  item: Slide;
  isDark: boolean;
}

function SlideItem({ item, isDark }: SlideProps) {
  const bgColor = isDark ? item.bgDark : item.bgLight;

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      {/* Illustration area */}
      <View
        style={[
          styles.illustrationContainer,
          { backgroundColor: bgColor },
        ]}
      >
        {/* Decorative circles */}
        <View
          style={[
            styles.decorCircle,
            styles.decorCircleLg,
            {
              backgroundColor: item.accentColor + "15",
              borderColor: item.accentColor + "25",
            },
          ]}
        />
        <View
          style={[
            styles.decorCircle,
            styles.decorCircleMd,
            {
              backgroundColor: item.accentColor + "20",
              borderColor: item.accentColor + "30",
            },
          ]}
        />

        {/* Main emoji */}
        <Animated.View
          entering={FadeIn.duration(500).delay(100)}
          style={styles.emojiWrapper}
        >
          <View
            style={[
              styles.emojiCircle,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)",
                borderColor: item.accentColor + "30",
              },
            ]}
          >
            <Text style={styles.emoji}>{item.emoji}</Text>
          </View>
        </Animated.View>

        {/* Feature badges */}
        <View style={styles.badgesRow}>
          {[
            item.id === "1" ? ["🏷 Auto-tag", "📸 Scan Receipt", "⚡ 3 sec"] :
            item.id === "2" ? ["💸 Split bills", "📱 UPI Pay", "⏰ Reminders"] :
            item.id === "3" ? ["🤖 AI Insights", "📊 Analytics", "🎯 Goals"] :
            ["💾 Offline", "🔄 Auto Sync", "🔒 Secure"]
          ][0].map((badge) => (
            <View
              key={badge}
              style={[
                styles.badge,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.85)",
                  borderColor: item.accentColor + "30",
                },
              ]}
            >
              <Text
                style={[styles.badgeText, { color: item.accentColor }]}
              >
                {badge}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Text content */}
      <Animated.View
        entering={FadeIn.duration(400).delay(200)}
        style={styles.textContent}
      >
        <Text
          style={[
            styles.slideTitle,
            { color: isDark ? "#F8FAFC" : "#0F172A" },
          ]}
        >
          {item.title}
        </Text>
        <Text
          style={[
            styles.slideSubtitle,
            { color: isDark ? "#94A3B8" : "#64748B" },
          ]}
        >
          {item.subtitle}
        </Text>
      </Animated.View>
    </View>
  );
}

// ---- Dot Indicator ----

interface DotsProps {
  count: number;
  activeIndex: number;
  accentColor: string;
  isDark: boolean;
}

function DotIndicator({ count, activeIndex, accentColor, isDark }: DotsProps) {
  return (
    <View style={styles.dotsContainer}>
      {Array.from({ length: count }).map((_, i) => {
        const isActive = i === activeIndex;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                width: isActive ? 24 : 8,
                backgroundColor: isActive
                  ? accentColor
                  : isDark
                  ? "#334155"
                  : "#CBD5E1",
              },
            ]}
          />
        );
      })}
    </View>
  );
}

// ---- Main Screen ----

export default function OnboardingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const currentSlide = SLIDES[currentIndex];

  // ---- Complete onboarding ----

  const completeOnboarding = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    router.replace("/(auth)/login");
  }, [router]);

  // ---- Skip ----

  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    completeOnboarding();
  }, [completeOnboarding]);

  // ---- Next ----

  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      completeOnboarding();
    }
  }, [currentIndex, completeOnboarding]);

  // ---- Scroll handler ----

  const handleMomentumScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SCREEN_WIDTH);
      setCurrentIndex(index);
    },
    []
  );

  const isLastSlide = currentIndex === SLIDES.length - 1;
  const bgColor = isDark ? "#0F172A" : "#FFFFFF";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Skip button */}
      <View style={styles.header}>
        <View style={{ flex: 1 }} />
        {!isLastSlide && (
          <TouchableOpacity
            onPress={handleSkip}
            activeOpacity={0.7}
            style={styles.skipButton}
          >
            <Text
              style={[
                styles.skipText,
                { color: isDark ? "#64748B" : "#94A3B8" },
              ]}
            >
              Skip
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        renderItem={({ item }) => <SlideItem item={item} isDark={isDark} />}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Bottom area */}
      <View style={styles.footer}>
        {/* Dots */}
        <DotIndicator
          count={SLIDES.length}
          activeIndex={currentIndex}
          accentColor={currentSlide.accentColor}
          isDark={isDark}
        />

        {/* Buttons */}
        <View style={styles.buttonsRow}>
          {/* Back button (hidden on first slide) */}
          {currentIndex > 0 ? (
            <TouchableOpacity
              style={[
                styles.backButton,
                {
                  backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const prevIndex = currentIndex - 1;
                flatListRef.current?.scrollToIndex({
                  index: prevIndex,
                  animated: true,
                });
                setCurrentIndex(prevIndex);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: 20,
                  color: isDark ? "#94A3B8" : "#64748B",
                }}
              >
                ←
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}

          {/* Next / Get Started */}
          <TouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: currentSlide.accentColor },
            ]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.nextButtonText}>
              {isLastSlide ? "Get Started" : "Next"}
            </Text>
            {!isLastSlide && (
              <Text style={[styles.nextArrow]}>→</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ---- Styles ----

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    height: 56,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "600",
  },
  slide: {
    flex: 1,
  },
  illustrationContainer: {
    marginHorizontal: 20,
    borderRadius: 28,
    height: 340,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  decorCircle: {
    position: "absolute",
    borderWidth: 1,
    borderRadius: 999,
  },
  decorCircleLg: {
    width: 300,
    height: 300,
  },
  decorCircleMd: {
    width: 200,
    height: 200,
  },
  emojiWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emojiCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  emoji: {
    fontSize: 56,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  textContent: {
    paddingHorizontal: 28,
    paddingTop: 28,
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 12,
    lineHeight: 32,
  },
  slideSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 12 : 20,
    paddingTop: 20,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  buttonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButton: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  nextArrow: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 20,
    fontWeight: "300",
  },
});
