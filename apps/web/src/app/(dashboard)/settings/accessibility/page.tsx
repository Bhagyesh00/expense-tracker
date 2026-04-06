"use client";

import { useAccessibility } from "@/hooks/use-accessibility";
import {
  Eye,
  Zap,
  Type,
  Ear,
  Monitor,
} from "lucide-react";
import { toast } from "sonner";

export default function AccessibilityPage() {
  const {
    highContrast,
    reducedMotion,
    fontScale,
    screenReaderHints,
    setHighContrast,
    setReducedMotion,
    setFontScale,
    setScreenReaderHints,
  } = useAccessibility();

  function Toggle({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
  }) {
    return (
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => {
          onChange(!checked);
          toast.success("Accessibility setting updated");
        }}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Accessibility
        </h1>
        <p className="mt-1 text-muted-foreground">
          Customize the interface to meet your accessibility needs
        </p>
      </div>

      {/* Settings */}
      <div className="space-y-4">
        {/* High Contrast */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  High Contrast Mode
                </p>
                <p className="text-xs text-muted-foreground">
                  Increase contrast between foreground and background colors
                </p>
              </div>
            </div>
            <Toggle checked={highContrast} onChange={setHighContrast} />
          </div>
        </div>

        {/* Reduced Motion */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Reduced Motion
                </p>
                <p className="text-xs text-muted-foreground">
                  Minimize animations and transitions throughout the interface
                </p>
              </div>
            </div>
            <Toggle checked={reducedMotion} onChange={setReducedMotion} />
          </div>
        </div>

        {/* Font Size */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <Type className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Font Size
              </p>
              <p className="text-xs text-muted-foreground">
                Adjust the base font size of the entire interface
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">0.8x</span>
              <span className="text-sm font-medium text-foreground">
                {fontScale.toFixed(1)}x
              </span>
              <span className="text-xs text-muted-foreground">1.5x</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.5"
              step="0.1"
              value={fontScale}
              onChange={(e) => setFontScale(parseFloat(e.target.value))}
              className="mt-2 w-full accent-primary"
              aria-label="Font scale"
            />
            <div className="mt-2 flex justify-between">
              {[0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5].map((v) => (
                <button
                  key={v}
                  onClick={() => setFontScale(v)}
                  className={`rounded px-1.5 py-0.5 text-xs ${
                    Math.abs(fontScale - v) < 0.05
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {v.toFixed(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Screen Reader Hints */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Ear className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Screen Reader Hints
                </p>
                <p className="text-xs text-muted-foreground">
                  Show additional ARIA labels and descriptive text for screen
                  readers
                </p>
              </div>
            </div>
            <Toggle
              checked={screenReaderHints}
              onChange={setScreenReaderHints}
            />
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">
            Live Preview
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Changes are applied in real time. This panel shows how content will
          appear.
        </p>

        <div className="mt-4 rounded-lg border border-border p-4">
          <h3 className="text-base font-bold text-foreground">
            Sample Expense
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Team lunch at the office cafeteria
          </p>
          <div className="mt-3 flex items-center gap-4">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              Food & Dining
            </span>
            <span className="text-lg font-bold text-foreground">$45.00</span>
          </div>
          <div className="mt-3 flex gap-2">
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90">
              Edit Expense
            </button>
            <button className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-accent">
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
