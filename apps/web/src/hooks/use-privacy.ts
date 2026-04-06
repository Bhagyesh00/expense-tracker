"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "expenseflow-private-mode";

// ── usePrivateMode ────────────────────────────────────────────────────────────
// Persists private mode preference to localStorage.

export function usePrivateMode() {
  const [isPrivate, setIsPrivate] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setIsPrivate(stored === "true");
    setIsHydrated(true);
  }, []);

  // Keyboard shortcut: Ctrl+Shift+P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        e.preventDefault();
        setIsPrivate((prev) => {
          const next = !prev;
          localStorage.setItem(STORAGE_KEY, String(next));
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const setPrivate = useCallback((value: boolean) => {
    setIsPrivate(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  }, []);

  const toggle = useCallback(() => {
    setIsPrivate((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return {
    isPrivate,
    isHydrated,
    setPrivate,
    toggle,
  };
}

// ── useBlurAmount ─────────────────────────────────────────────────────────────
// Returns the blurred or actual amount string based on private mode.

export function useBlurAmount(amount: number | string, currency = "₹") {
  const { isPrivate, isHydrated } = usePrivateMode();

  if (!isHydrated) {
    // Return the actual amount during SSR / before hydration
    return typeof amount === "number"
      ? `${currency}${amount.toLocaleString("en-IN")}`
      : amount;
  }

  if (isPrivate) {
    return `${currency} •••`;
  }

  if (typeof amount === "number") {
    return `${currency}${amount.toLocaleString("en-IN")}`;
  }

  return amount;
}

// ── useBlurAmountRaw ──────────────────────────────────────────────────────────
// Returns the raw blurred string without currency prefix.

export function useBlurAmountRaw(amount: number) {
  const { isPrivate, isHydrated } = usePrivateMode();

  if (!isHydrated) return amount.toLocaleString("en-IN");
  if (isPrivate) return "•••";
  return amount.toLocaleString("en-IN");
}
