"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  RefreshCw,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/cn";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RolloverMode = "full" | "partial" | "none";

export interface BudgetRolloverConfig {
  enabled: boolean;
  mode: RolloverMode;
  percentage: number; // 0-100, used when mode === "partial"
  maxRolloverAmount: number | null; // null = no cap
}

interface BudgetRolloverProps {
  budgetId: string;
  budgetAmount: number;
  spentAmount: number;
  currentConfig?: BudgetRolloverConfig;
  onSave?: (config: BudgetRolloverConfig) => Promise<void>;
  currency?: string;
}

const DEFAULT_CONFIG: BudgetRolloverConfig = {
  enabled: false,
  mode: "full",
  percentage: 100,
  maxRolloverAmount: null,
};

// ── Component ─────────────────────────────────────────────────────────────────

export function BudgetRollover({
  budgetId: _budgetId,
  budgetAmount,
  spentAmount,
  currentConfig,
  onSave,
  currency = "₹",
}: BudgetRolloverProps) {
  const [config, setConfig] = useState<BudgetRolloverConfig>(
    currentConfig ?? DEFAULT_CONFIG
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const unusedAmount = Math.max(0, budgetAmount - spentAmount);

  const rolloverPreview = useCallback((): number => {
    if (!config.enabled || unusedAmount <= 0) return 0;

    let amount = unusedAmount;
    if (config.mode === "partial") {
      amount = (unusedAmount * config.percentage) / 100;
    }

    if (config.maxRolloverAmount !== null && config.maxRolloverAmount > 0) {
      amount = Math.min(amount, config.maxRolloverAmount);
    }

    return Math.round(amount * 100) / 100;
  }, [config, unusedAmount]);

  const preview = rolloverPreview();

  const handleToggle = () => {
    setConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
  };

  const handleModeChange = (mode: RolloverMode) => {
    setConfig((prev) => ({
      ...prev,
      mode,
      percentage: mode === "full" ? 100 : prev.percentage,
    }));
  };

  const handlePercentageChange = (value: number) => {
    setConfig((prev) => ({ ...prev, percentage: Math.min(100, Math.max(0, value)) }));
  };

  const handleMaxAmountChange = (value: string) => {
    const num = parseFloat(value);
    setConfig((prev) => ({
      ...prev,
      maxRolloverAmount: isNaN(num) || num <= 0 ? null : num,
    }));
  };

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(config);
      toast.success("Rollover settings saved");
    } catch {
      toast.error("Failed to save rollover settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <RefreshCw className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Budget Rollover
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Carry unused budget to next month
            </p>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={handleToggle}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            config.enabled ? "bg-primary" : "bg-muted"
          )}
          role="switch"
          aria-checked={config.enabled}
          aria-label="Toggle budget rollover"
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
              config.enabled ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>

      {/* Rollover Preview */}
      <div
        className={cn(
          "rounded-lg border px-4 py-3 transition-all",
          config.enabled && unusedAmount > 0
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/20"
            : "border-border bg-muted/30"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">
              Rollover amount this month
            </span>
          </div>
          <span
            className={cn(
              "text-sm font-semibold",
              config.enabled && preview > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground"
            )}
          >
            {currency}
            {preview.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span>
            Budget: {currency}
            {budgetAmount.toLocaleString("en-IN")}
          </span>
          <span>
            Spent: {currency}
            {spentAmount.toLocaleString("en-IN")}
          </span>
          <span>
            Unused: {currency}
            {unusedAmount.toLocaleString("en-IN")}
          </span>
          <span
            className={cn(
              "font-medium",
              config.enabled ? "text-emerald-600 dark:text-emerald-400" : ""
            )}
          >
            Will roll over: {currency}
            {preview.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Options (only shown when enabled) */}
      {config.enabled && (
        <div className="space-y-4">
          {/* Mode Selection */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">
              Rollover Amount
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleModeChange("full")}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-lg border p-3 text-left text-xs transition-colors",
                  config.mode === "full"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                <span className="font-semibold text-foreground">Full</span>
                <span>Carry 100% of unused</span>
              </button>
              <button
                onClick={() => handleModeChange("partial")}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-lg border p-3 text-left text-xs transition-colors",
                  config.mode === "partial"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                <span className="font-semibold text-foreground">Partial</span>
                <span>Carry a percentage</span>
              </button>
            </div>
          </div>

          {/* Percentage Slider (only for partial) */}
          {config.mode === "partial" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">
                  Rollover Percentage
                </label>
                <span className="text-sm font-bold text-primary">
                  {config.percentage}%
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={config.percentage}
                onChange={(e) => handlePercentageChange(parseInt(e.target.value))}
                className="w-full h-2 rounded-full bg-muted accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>5%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* Advanced Settings */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {showAdvanced ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            Advanced options
          </button>

          {showAdvanced && (
            <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/20">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Maximum Rollover Cap
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{currency}</span>
                  <input
                    type="number"
                    placeholder="No cap"
                    min={0}
                    value={config.maxRolloverAmount ?? ""}
                    onChange={(e) => handleMaxAmountChange(e.target.value)}
                    className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty for no cap on rollover amount
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Button */}
      {onSave && (
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Rollover Settings"
          )}
        </button>
      )}
    </div>
  );
}
