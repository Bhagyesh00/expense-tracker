"use client";

import { useCallback, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/cn";
import { BriefcaseBusiness, Calculator } from "lucide-react";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const perDiemSchema = z.object({
  enabled: z.boolean().default(false),
  trip_name: z.string().max(255).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  daily_rate: z
    .number({ invalid_type_error: "Enter a valid rate" })
    .positive()
    .optional()
    .nullable(),
  city: z.string().max(255).optional(),
});

type PerDiemValues = z.infer<typeof perDiemSchema>;

// ---------------------------------------------------------------------------
// Export types
// ---------------------------------------------------------------------------

export interface PerDiemData {
  enabled: boolean;
  trip_name?: string;
  start_date?: string;
  end_date?: string;
  days?: number;
  daily_rate?: number;
  total?: number;
  city?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateDays(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
  const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : null;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PerDiemFormProps {
  defaultRate?: number;
  value?: PerDiemData;
  onChange?: (data: PerDiemData) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PerDiemForm({ defaultRate = 500, value, onChange, className }: PerDiemFormProps) {
  const { register, watch, setValue, control } = useForm<PerDiemValues>({
    defaultValues: {
      enabled: value?.enabled ?? false,
      trip_name: value?.trip_name ?? "",
      start_date: value?.start_date ?? "",
      end_date: value?.end_date ?? "",
      daily_rate: value?.daily_rate ?? defaultRate,
      city: value?.city ?? "",
    },
  });

  const watchEnabled = watch("enabled");
  const watchStart = watch("start_date");
  const watchEnd = watch("end_date");
  const watchRate = watch("daily_rate");
  const watchAll = watch();

  const days = calculateDays(watchStart, watchEnd);
  const total = days != null && watchRate != null ? days * watchRate : null;

  // Propagate changes upward
  useEffect(() => {
    if (!onChange) return;
    onChange({
      enabled: watchAll.enabled,
      trip_name: watchAll.trip_name,
      start_date: watchAll.start_date,
      end_date: watchAll.end_date,
      days: days ?? undefined,
      daily_rate: watchAll.daily_rate ?? undefined,
      total: total ?? undefined,
      city: watchAll.city,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchAll.enabled, watchAll.trip_name, watchAll.start_date, watchAll.end_date, watchAll.daily_rate, watchAll.city]);

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      {/* Toggle header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Per-Diem Allowance</span>
        </div>
        <button
          type="button"
          onClick={() => setValue("enabled", !watchEnabled)}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            watchEnabled ? "bg-primary" : "bg-muted",
          )}
          aria-label="Toggle per-diem"
        >
          <span
            className={cn(
              "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
              watchEnabled ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
      </div>

      {/* Expanded fields */}
      {watchEnabled && (
        <div className="mt-5 space-y-4 border-t border-border pt-5">
          {/* Trip name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Trip Name
            </label>
            <input
              {...register("trip_name")}
              placeholder="e.g. Mumbai Business Trip"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Start / End date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Start Date
              </label>
              <input
                type="date"
                {...register("start_date")}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                End Date
              </label>
              <input
                type="date"
                {...register("end_date")}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Days calculated */}
          {days !== null && (
            <div className="text-xs text-muted-foreground">
              Duration:{" "}
              <span className="font-semibold text-foreground">
                {days} day{days !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Daily rate + city */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Daily Rate (₹/day)
              </label>
              <input
                type="number"
                step="50"
                min="0"
                {...register("daily_rate", { valueAsNumber: true })}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                City / Location
              </label>
              <input
                {...register("city")}
                placeholder="e.g. Mumbai"
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Calculated total */}
          {total !== null && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-3">
              <Calculator className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Total per-diem:{" "}
                <span className="font-bold text-primary">₹{total.toFixed(2)}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({days} days × ₹{watchRate}/day)
                </span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
