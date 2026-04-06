"use client";

import { useState, useEffect, useCallback } from "react";

interface AccessibilityPreferences {
  highContrast: boolean;
  reducedMotion: boolean;
  fontScale: number;
  screenReaderHints: boolean;
}

const STORAGE_KEY = "expenseflow-accessibility";

const DEFAULTS: AccessibilityPreferences = {
  highContrast: false,
  reducedMotion: false,
  fontScale: 1,
  screenReaderHints: true,
};

function loadPreferences(): AccessibilityPreferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULTS, ...JSON.parse(stored) };
  } catch {
    // ignore
  }
  return DEFAULTS;
}

function savePreferences(prefs: AccessibilityPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

function applyToDocument(prefs: AccessibilityPreferences) {
  const root = document.documentElement;

  // Font scale
  root.style.setProperty("--font-scale", String(prefs.fontScale));
  root.style.fontSize = `${prefs.fontScale * 100}%`;

  // High contrast
  if (prefs.highContrast) {
    root.classList.add("high-contrast");
  } else {
    root.classList.remove("high-contrast");
  }

  // Reduced motion
  if (prefs.reducedMotion) {
    root.classList.add("reduce-motion");
    root.style.setProperty("--transition-duration", "0ms");
  } else {
    root.classList.remove("reduce-motion");
    root.style.removeProperty("--transition-duration");
  }

  // Screen reader hints
  if (prefs.screenReaderHints) {
    root.setAttribute("data-sr-hints", "true");
  } else {
    root.removeAttribute("data-sr-hints");
  }
}

export function useAccessibility() {
  const [prefs, setPrefsState] = useState<AccessibilityPreferences>(DEFAULTS);

  useEffect(() => {
    const loaded = loadPreferences();

    // Also respect prefers-reduced-motion OS setting
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches && !loaded.reducedMotion) {
      loaded.reducedMotion = true;
    }

    // Respect prefers-contrast OS setting
    const contrastQuery = window.matchMedia("(prefers-contrast: more)");
    if (contrastQuery.matches && !loaded.highContrast) {
      loaded.highContrast = true;
    }

    setPrefsState(loaded);
    applyToDocument(loaded);

    // Listen for OS changes
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefsState((prev) => {
        const next = { ...prev, reducedMotion: e.matches };
        applyToDocument(next);
        savePreferences(next);
        return next;
      });
    };
    motionQuery.addEventListener("change", handleMotionChange);
    return () => motionQuery.removeEventListener("change", handleMotionChange);
  }, []);

  const setPreferences = useCallback(
    (update: Partial<AccessibilityPreferences>) => {
      setPrefsState((prev) => {
        const next = { ...prev, ...update };
        applyToDocument(next);
        savePreferences(next);
        return next;
      });
    },
    []
  );

  const setHighContrast = useCallback(
    (v: boolean) => setPreferences({ highContrast: v }),
    [setPreferences]
  );

  const setReducedMotion = useCallback(
    (v: boolean) => setPreferences({ reducedMotion: v }),
    [setPreferences]
  );

  const setFontScale = useCallback(
    (v: number) => setPreferences({ fontScale: v }),
    [setPreferences]
  );

  const setScreenReaderHints = useCallback(
    (v: boolean) => setPreferences({ screenReaderHints: v }),
    [setPreferences]
  );

  return {
    ...prefs,
    setHighContrast,
    setReducedMotion,
    setFontScale,
    setScreenReaderHints,
    setPreferences,
  };
}
