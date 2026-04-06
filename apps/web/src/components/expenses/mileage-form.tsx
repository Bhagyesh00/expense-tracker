"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/cn";
import type { CreateMileageInput } from "@/hooks/use-import";
import { X, Loader2, ExternalLink, Car, Calculator } from "lucide-react";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const mileageSchema = z.object({
  from_location: z.string().min(1, "From location is required").max(255),
  to_location: z.string().min(1, "To location is required").max(255),
  distance_km: z
    .number({ required_error: "Distance is required", invalid_type_error: "Enter a valid number" })
    .positive("Must be greater than 0"),
  rate_per_km: z
    .number({ required_error: "Rate is required", invalid_type_error: "Enter a valid number" })
    .positive("Must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  purpose: z.string().max(255).optional(),
  create_expense: z.boolean().default(false),
});

type MileageFormValues = z.infer<typeof mileageSchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MileageFormProps {
  defaultRate?: number;
  onSubmit: (data: CreateMileageInput) => Promise<void>;
  onClose: () => void;
  isSubmitting?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MileageForm({ defaultRate = 14, onSubmit, onClose, isSubmitting = false }: MileageFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MileageFormValues>({
    resolver: zodResolver(mileageSchema),
    defaultValues: {
      from_location: "",
      to_location: "",
      distance_km: undefined,
      rate_per_km: defaultRate,
      date: new Date().toISOString().split("T")[0],
      purpose: "",
      create_expense: false,
    },
  });

  const watchFrom = watch("from_location");
  const watchTo = watch("to_location");
  const watchDistance = watch("distance_km");
  const watchRate = watch("rate_per_km");
  const watchCreateExpense = watch("create_expense");

  const calculatedAmount =
    typeof watchDistance === "number" &&
    typeof watchRate === "number" &&
    watchDistance > 0 &&
    watchRate > 0
      ? watchDistance * watchRate
      : null;

  const openGoogleMaps = useCallback(() => {
    if (!watchFrom || !watchTo) return;
    const url = `https://www.google.com/maps/dir/${encodeURIComponent(watchFrom)}/${encodeURIComponent(watchTo)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [watchFrom, watchTo]);

  const handleFormSubmit = useCallback(
    async (values: MileageFormValues) => {
      await onSubmit({
        from_location: values.from_location,
        to_location: values.to_location,
        distance_km: values.distance_km,
        rate_per_km: values.rate_per_km,
        date: values.date,
        purpose: values.purpose,
        create_expense: values.create_expense,
      });
    },
    [onSubmit],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Log Trip</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5 p-6">
          {/* From / To */}
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                From <span className="text-destructive">*</span>
              </label>
              <input
                {...register("from_location")}
                placeholder="Starting location"
                className={cn(
                  "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
                  errors.from_location ? "border-destructive" : "border-input",
                )}
              />
              {errors.from_location && (
                <p className="mt-1 text-xs text-destructive">{errors.from_location.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                To <span className="text-destructive">*</span>
              </label>
              <input
                {...register("to_location")}
                placeholder="Destination"
                className={cn(
                  "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
                  errors.to_location ? "border-destructive" : "border-input",
                )}
              />
              {errors.to_location && (
                <p className="mt-1 text-xs text-destructive">{errors.to_location.message}</p>
              )}
            </div>

            {/* Google Maps helper */}
            {watchFrom && watchTo && (
              <button
                type="button"
                onClick={openGoogleMaps}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in Google Maps for directions
              </button>
            )}
          </div>

          {/* Distance + Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Distance (km) <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="0"
                {...register("distance_km", { valueAsNumber: true })}
                className={cn(
                  "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
                  errors.distance_km ? "border-destructive" : "border-input",
                )}
              />
              {errors.distance_km && (
                <p className="mt-1 text-xs text-destructive">{errors.distance_km.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Rate (₹/km) <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register("rate_per_km", { valueAsNumber: true })}
                className={cn(
                  "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
                  errors.rate_per_km ? "border-destructive" : "border-input",
                )}
              />
              {errors.rate_per_km && (
                <p className="mt-1 text-xs text-destructive">{errors.rate_per_km.message}</p>
              )}
            </div>
          </div>

          {/* Calculated amount */}
          {calculatedAmount !== null && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-3">
              <Calculator className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Calculated amount:{" "}
                <span className="font-bold text-primary">
                  ₹{calculatedAmount.toFixed(2)}
                </span>
              </span>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Date <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              {...register("date")}
              className={cn(
                "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring",
                errors.date ? "border-destructive" : "border-input",
              )}
            />
          </div>

          {/* Purpose */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Purpose</label>
            <input
              {...register("purpose")}
              placeholder="e.g. Client visit, Site inspection"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Create expense toggle */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Create expense record</p>
              <p className="text-xs text-muted-foreground">
                Automatically create an expense entry for this trip
              </p>
            </div>
            <button
              type="button"
              onClick={() => setValue("create_expense", !watchCreateExpense)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                watchCreateExpense ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                  watchCreateExpense ? "translate-x-6" : "translate-x-1",
                )}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Log Trip
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
