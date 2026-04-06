"use client";

import { useState, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { toast } from "sonner";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import { useI18n } from "@/providers/i18n-provider";

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", example: "30/03/2026" },
  { value: "MM/DD/YYYY", example: "03/30/2026" },
  { value: "YYYY-MM-DD", example: "2026-03-30" },
  { value: "DD MMM YYYY", example: "30 Mar 2026" },
  { value: "MMM DD, YYYY", example: "Mar 30, 2026" },
];

const NUMBER_FORMATS = [
  { value: "indian", label: "Indian (1,00,000.00)", example: "1,00,000.00" },
  {
    value: "international",
    label: "International (1,000,000.00)",
    example: "1,000,000.00",
  },
  { value: "european", label: "European (1.000.000,00)", example: "1.000.000,00" },
];

export default function LanguagePage() {
  const { locale, setLocale, formatNumber, formatDate } = useI18n();
  const [selectedLocale, setSelectedLocale] = useState<Locale>(locale);
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [numberFormat, setNumberFormat] = useState("indian");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedLocale(locale);
  }, [locale]);

  async function handleSave() {
    setSaving(true);
    await setLocale(selectedLocale);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    toast.success("Language preferences updated");
  }

  const previewDate = new Date("2026-03-30T14:30:00");
  const previewNumber = 150000.5;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Language & Region
        </h1>
        <p className="mt-1 text-muted-foreground">
          Set your preferred language, date format, and number format
        </p>
      </div>

      {/* Language Selector */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Language</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the language for the ExpenseFlow interface
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {SUPPORTED_LOCALES.map((loc) => (
            <button
              key={loc.code}
              onClick={() => setSelectedLocale(loc.code)}
              className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
                selectedLocale === loc.code
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent"
              }`}
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {loc.nativeName}
                </p>
                <p className="text-xs text-muted-foreground">{loc.name}</p>
              </div>
              {selectedLocale === loc.code && (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Date Format */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Date Format</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how dates are displayed throughout the app
        </p>
        <div className="mt-4 space-y-2">
          {DATE_FORMATS.map((fmt) => (
            <label
              key={fmt.value}
              className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                dateFormat === fmt.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="dateFormat"
                  value={fmt.value}
                  checked={dateFormat === fmt.value}
                  onChange={() => setDateFormat(fmt.value)}
                  className="h-4 w-4 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-foreground">
                  {fmt.value}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {fmt.example}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Number Format */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Number Format</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how numbers and currency amounts are formatted
        </p>
        <div className="mt-4 space-y-2">
          {NUMBER_FORMATS.map((fmt) => (
            <label
              key={fmt.value}
              className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                numberFormat === fmt.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="numberFormat"
                  value={fmt.value}
                  checked={numberFormat === fmt.value}
                  onChange={() => setNumberFormat(fmt.value)}
                  className="h-4 w-4 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-foreground">
                  {fmt.label}
                </span>
              </div>
              <span className="font-mono text-sm text-muted-foreground">
                {fmt.example}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Preview</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          See how dates and numbers will appear with your settings
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Date
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {formatDate(previewDate)}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Number
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {formatNumber(previewNumber)}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Currency
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {formatNumber(previewNumber, {
                style: "currency",
                currency: "INR",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}
