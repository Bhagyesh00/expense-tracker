import { useState, useEffect, useCallback } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ---- Types ----

export type FontScale = "small" | "normal" | "large" | "extra_large";

interface AccessibilitySettings {
  highContrast: boolean;
  reduceMotion: boolean;
  fontScale: FontScale;
  screenReaderOptimizations: boolean;
}

interface UseAccessibilityReturn extends AccessibilitySettings {
  /** Whether a screen reader (VoiceOver/TalkBack) is currently active */
  screenReaderActive: boolean;
  /** Whether settings have been loaded from storage */
  ready: boolean;
  /** Set high contrast mode */
  setHighContrast: (value: boolean) => Promise<void>;
  /** Set reduce motion preference */
  setReduceMotion: (value: boolean) => Promise<void>;
  /** Set font scale */
  setFontScale: (value: FontScale) => Promise<void>;
  /** Set screen reader optimizations */
  setScreenReaderOptimizations: (value: boolean) => Promise<void>;
  /** Get numeric font scale multiplier */
  fontScaleMultiplier: number;
}

// ---- Constants ----

const STORAGE_KEY = "@expenseflow_accessibility";

const FONT_SCALE_MAP: Record<FontScale, number> = {
  small: 0.85,
  normal: 1.0,
  large: 1.2,
  extra_large: 1.4,
};

const DEFAULT_SETTINGS: AccessibilitySettings = {
  highContrast: false,
  reduceMotion: false,
  fontScale: "normal",
  screenReaderOptimizations: false,
};

// ---- Hook ----

/**
 * Hook for managing accessibility settings.
 * Reads/writes to AsyncStorage and integrates with React Native AccessibilityInfo.
 */
export function useAccessibility(): UseAccessibilityReturn {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const [screenReaderActive, setScreenReaderActive] = useState(false);
  const [ready, setReady] = useState(false);

  // Load settings from AsyncStorage
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && mounted) {
          const parsed = JSON.parse(stored) as Partial<AccessibilitySettings>;
          setSettings((prev) => ({ ...prev, ...parsed }));
        }
      } catch {
        // Use defaults
      }
      if (mounted) setReady(true);
    }

    load();
    return () => { mounted = false; };
  }, []);

  // Listen to screen reader changes
  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (mounted) setScreenReaderActive(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      (enabled) => {
        if (mounted) setScreenReaderActive(enabled);
      }
    );

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  // Listen to system reduce motion preference
  useEffect(() => {
    let mounted = true;

    if (Platform.OS === "ios") {
      AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
        if (mounted && enabled) {
          setSettings((prev) => ({ ...prev, reduceMotion: true }));
        }
      });

      const subscription = AccessibilityInfo.addEventListener(
        "reduceMotionChanged",
        (enabled) => {
          if (mounted) {
            setSettings((prev) => ({ ...prev, reduceMotion: enabled }));
          }
        }
      );

      return () => {
        mounted = false;
        subscription?.remove();
      };
    }

    return () => { mounted = false; };
  }, []);

  // Persist settings whenever they change
  const persistSettings = useCallback(async (newSettings: AccessibilitySettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch {
      // Silent fail
    }
  }, []);

  const setHighContrast = useCallback(async (value: boolean) => {
    const updated = { ...settings, highContrast: value };
    setSettings(updated);
    await persistSettings(updated);
  }, [settings, persistSettings]);

  const setReduceMotion = useCallback(async (value: boolean) => {
    const updated = { ...settings, reduceMotion: value };
    setSettings(updated);
    await persistSettings(updated);

    // Announce to screen reader
    if (screenReaderActive) {
      AccessibilityInfo.announceForAccessibility(
        value ? "Reduced motion enabled" : "Reduced motion disabled"
      );
    }
  }, [settings, persistSettings, screenReaderActive]);

  const setFontScale = useCallback(async (value: FontScale) => {
    const updated = { ...settings, fontScale: value };
    setSettings(updated);
    await persistSettings(updated);

    if (screenReaderActive) {
      AccessibilityInfo.announceForAccessibility(
        `Font size set to ${value.replace("_", " ")}`
      );
    }
  }, [settings, persistSettings, screenReaderActive]);

  const setScreenReaderOptimizations = useCallback(async (value: boolean) => {
    const updated = { ...settings, screenReaderOptimizations: value };
    setSettings(updated);
    await persistSettings(updated);
  }, [settings, persistSettings]);

  return {
    ...settings,
    screenReaderActive,
    ready,
    setHighContrast,
    setReduceMotion,
    setFontScale,
    setScreenReaderOptimizations,
    fontScaleMultiplier: FONT_SCALE_MAP[settings.fontScale],
  };
}
