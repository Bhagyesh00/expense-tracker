"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { useCreateBudget, useUpdateBudget, useCreateGoal, useUpdateGoal, useBudgetsList } from "@/hooks/use-budgets";
import { useCategoriesList } from "@/hooks/use-categories";
import { useUIStore } from "@/stores/ui-store";
import { DatePicker } from "@/components/shared/date-picker";
import { CURRENCY_CODES, budgetSchema, savingsGoalSchema } from "@expenseflow/utils";
import {
  Loader2,
  ChevronDown,
  Wallet,
  Target,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Extended budget form schema (adds optional end date + alert threshold)
// ---------------------------------------------------------------------------

const budgetFormSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  amount: z
    .number({ required_error: "Amount is required", invalid_type_error: "Enter a valid amount" })
    .positive("Amount must be greater than zero"),
  currency: z.string().min(3).max(3),
  period: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
  alertThreshold: z.number().int().min(1).max(100).default(80),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date().nullable().optional(),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

// ---------------------------------------------------------------------------
// Savings goal form schema
// ---------------------------------------------------------------------------

const goalFormSchema = z.object({
  name: z.string().min(1, "Goal name is required").max(100).trim(),
  targetAmount: z
    .number({ required_error: "Amount is required", invalid_type_error: "Enter a valid amount" })
    .positive("Amount must be greater than zero"),
  currentAmount: z.number().min(0).default(0),
  currency: z.string().min(3).max(3),
  targetDate: z.date({ required_error: "Target date is required" }),
  icon: z.string().optional(),
  color: z.string().optional(),
});

type GoalFormValues = z.infer<typeof goalFormSchema>;

// ---------------------------------------------------------------------------
// Icon options for savings goals
// ---------------------------------------------------------------------------

const GOAL_ICON_OPTIONS = [
  { value: "home", label: "Home", emoji: "🏠" },
  { value: "car", label: "Car", emoji: "🚗" },
  { value: "vacation", label: "Vacation", emoji: "✈️" },
  { value: "education", label: "Education", emoji: "🎓" },
  { value: "emergency", label: "Emergency", emoji: "🛡️" },
  { value: "wedding", label: "Wedding", emoji: "💍" },
  { value: "gadget", label: "Gadget", emoji: "📱" },
  { value: "investment", label: "Investment", emoji: "📈" },
  { value: "other", label: "Other", emoji: "🎯" },
];

const COLOR_OPTIONS = [
  "#FF6B6B", "#4ECDC4", "#FF9F43", "#54A0FF", "#A55EEA",
  "#EE5A6F", "#1DD1A1", "#10AC84", "#0ABDE3", "#F368E0",
  "#2E86DE", "#27AE60",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface BudgetFormProps {
  mode: "create" | "edit";
  type: "budget" | "goal";
  initialData?: Partial<BudgetFormValues & GoalFormValues> & { id?: string };
  onSuccess?: () => void;
  className?: string;
}

export function BudgetForm({
  mode,
  type,
  initialData,
  onSuccess,
  className,
}: BudgetFormProps) {
  const router = useRouter();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  // Budget mutations
  const { createBudget, isPending: isCreatingBudget } = useCreateBudget();
  const { updateBudget, isPending: isUpdatingBudget } = useUpdateBudget();

  // Goal mutations
  const { createGoal, isPending: isCreatingGoal } = useCreateGoal();
  const { updateGoal, isPending: isUpdatingGoal } = useUpdateGoal();

  const isSaving = isCreatingBudget || isUpdatingBudget || isCreatingGoal || isUpdatingGoal;

  // Categories for budget form
  const { data: categories } = useCategoriesList();
  const { data: existingBudgets } = useBudgetsList();

  // Filter out categories that already have active budgets (for create mode)
  const availableCategories = useMemo(() => {
    if (!categories) return [];
    if (mode === "edit") return categories;
    const budgetedCategoryIds = new Set(
      (existingBudgets ?? []).map((b) => b.category_id).filter(Boolean),
    );
    return categories.filter(
      (c) => c.type === "expense" && !budgetedCategoryIds.has(c.id),
    );
  }, [categories, existingBudgets, mode]);

  // ---- Budget form ----
  const budgetForm = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      categoryId: initialData?.categoryId ?? "",
      amount: initialData?.amount ?? undefined,
      currency: initialData?.currency ?? "INR",
      period: (initialData as any)?.period ?? "monthly",
      alertThreshold: (initialData as any)?.alertThreshold ?? 80,
      startDate: (initialData as any)?.startDate ?? new Date(),
      endDate: (initialData as any)?.endDate ?? null,
    },
  });

  // ---- Goal form ----
  const goalForm = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      name: (initialData as any)?.name ?? "",
      targetAmount: initialData?.targetAmount ?? undefined,
      currentAmount: (initialData as any)?.currentAmount ?? 0,
      currency: initialData?.currency ?? "INR",
      targetDate: (initialData as any)?.targetDate ?? undefined,
      icon: (initialData as any)?.icon ?? "other",
      color: (initialData as any)?.color ?? COLOR_OPTIONS[0],
    },
  });

  // ---- Budget submit ----
  const onBudgetSubmit = useCallback(
    async (data: BudgetFormValues) => {
      if (!workspaceId) return;
      try {
        if (mode === "create") {
          await createBudget({
            workspace_id: workspaceId,
            category_id: data.categoryId,
            amount: data.amount,
            period: data.period,
            currency: data.currency,
            start_date: data.startDate.toISOString().split("T")[0],
            end_date: data.endDate
              ? data.endDate.toISOString().split("T")[0]
              : null,
          });
        } else if (initialData?.id) {
          await updateBudget(initialData.id, {
            category_id: data.categoryId,
            amount: data.amount,
            period: data.period,
            currency: data.currency,
            start_date: data.startDate.toISOString().split("T")[0],
            end_date: data.endDate
              ? data.endDate.toISOString().split("T")[0]
              : null,
          });
        }
        onSuccess?.();
        router.push("/dashboard/budgets");
      } catch {
        // Toast handled by hooks
      }
    },
    [mode, workspaceId, createBudget, updateBudget, initialData, onSuccess, router],
  );

  // ---- Goal submit ----
  const onGoalSubmit = useCallback(
    async (data: GoalFormValues) => {
      if (!workspaceId) return;
      try {
        if (mode === "create") {
          await createGoal({
            workspace_id: workspaceId,
            name: data.name,
            target_amount: data.targetAmount,
            current_amount: data.currentAmount,
            currency: data.currency,
            target_date: data.targetDate.toISOString().split("T")[0],
            icon: data.icon ?? null,
            color: data.color ?? null,
          });
        } else if (initialData?.id) {
          await updateGoal(initialData.id, {
            name: data.name,
            target_amount: data.targetAmount,
            current_amount: data.currentAmount,
            currency: data.currency,
            target_date: data.targetDate.toISOString().split("T")[0],
            icon: data.icon ?? null,
            color: data.color ?? null,
          });
        }
        onSuccess?.();
        router.push("/dashboard/budgets");
      } catch {
        // Toast handled by hooks
      }
    },
    [mode, workspaceId, createGoal, updateGoal, initialData, onSuccess, router],
  );

  // ---- Budget form fields ----
  if (type === "budget") {
    const {
      register,
      control,
      handleSubmit,
      watch,
      setValue,
      formState: { errors },
    } = budgetForm;

    const watchPeriod = watch("period");
    const watchAlertThreshold = watch("alertThreshold");

    return (
      <form
        onSubmit={handleSubmit(onBudgetSubmit)}
        className={cn("space-y-6", className)}
      >
        {/* Type header */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {mode === "create" ? "New Budget" : "Edit Budget"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Set a spending limit for a category
            </p>
          </div>
        </div>

        {/* Category selector */}
        <div className="rounded-xl border border-border bg-card p-5">
          <label className="mb-1.5 block text-sm font-semibold text-foreground">
            Category
          </label>
          <div className="relative">
            <select
              {...register("categoryId")}
              className={cn(
                "h-10 w-full appearance-none rounded-lg border bg-background px-3 pr-8 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring",
                errors.categoryId ? "border-destructive" : "border-input",
              )}
            >
              <option value="">Select a category</option>
              {availableCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          {errors.categoryId && (
            <p className="mt-1 text-xs text-destructive">
              {errors.categoryId.message}
            </p>
          )}
          {availableCategories.length === 0 && mode === "create" && (
            <p className="mt-1 text-xs text-amber-600">
              All expense categories already have budgets.
            </p>
          )}
        </div>

        {/* Amount + Currency */}
        <div className="rounded-xl border border-border bg-card p-5">
          <label className="mb-1.5 block text-sm font-semibold text-foreground">
            Budget Amount
          </label>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("amount", { valueAsNumber: true })}
                className={cn(
                  "h-12 w-full rounded-xl border bg-background px-4 text-xl font-bold text-foreground outline-none transition-colors focus:ring-2 focus:ring-ring",
                  errors.amount ? "border-destructive" : "border-input",
                )}
              />
              {errors.amount && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.amount.message}
                </p>
              )}
            </div>
            <div className="relative">
              <select
                {...register("currency")}
                className="h-12 appearance-none rounded-xl border border-input bg-background px-4 pr-8 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                {CURRENCY_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Period */}
        <div className="rounded-xl border border-border bg-card p-5">
          <label className="mb-3 block text-sm font-semibold text-foreground">
            Period
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["weekly", "monthly", "quarterly", "yearly"] as const).map(
              (period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setValue("period", period)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors",
                    watchPeriod === period
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {period}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Alert threshold */}
        <div className="rounded-xl border border-border bg-card p-5">
          <label className="mb-1.5 block text-sm font-semibold text-foreground">
            Alert Threshold
          </label>
          <p className="mb-3 text-xs text-muted-foreground">
            Get notified when spending reaches this percentage of budget
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              {...register("alertThreshold", { valueAsNumber: true })}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
            <span className="min-w-[3ch] text-right text-sm font-bold text-foreground">
              {watchAlertThreshold}%
            </span>
          </div>
        </div>

        {/* Start date */}
        <div className="rounded-xl border border-border bg-card p-5">
          <label className="mb-1.5 block text-sm font-semibold text-foreground">
            Start Date
          </label>
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value}
                onChange={(date) => field.onChange(date ?? new Date())}
                error={errors.startDate?.message}
              />
            )}
          />
        </div>

        {/* End date (optional) */}
        <div className="rounded-xl border border-border bg-card p-5">
          <label className="mb-1.5 block text-sm font-semibold text-foreground">
            End Date
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              (optional)
            </span>
          </label>
          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value ?? null}
                onChange={(date) => field.onChange(date ?? null)}
              />
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 sm:flex-none sm:min-w-[200px]"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "create" ? "Create Budget" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  // ---- Goal form fields ----
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = goalForm;

  const watchIcon = watch("icon");
  const watchColor = watch("color");

  return (
    <form
      onSubmit={handleSubmit(onGoalSubmit)}
      className={cn("space-y-6", className)}
    >
      {/* Type header */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
          <Target className="h-5 w-5 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {mode === "create" ? "New Savings Goal" : "Edit Savings Goal"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Set a savings target and track your progress
          </p>
        </div>
      </div>

      {/* Goal name */}
      <div className="rounded-xl border border-border bg-card p-5">
        <label className="mb-1.5 block text-sm font-semibold text-foreground">
          Goal Name
        </label>
        <input
          type="text"
          placeholder="e.g., Emergency Fund, New Laptop..."
          {...register("name")}
          className={cn(
            "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
            errors.name ? "border-destructive" : "border-input",
          )}
        />
        {errors.name && (
          <p className="mt-1 text-xs text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Target amount + Currency */}
      <div className="rounded-xl border border-border bg-card p-5">
        <label className="mb-1.5 block text-sm font-semibold text-foreground">
          Target Amount
        </label>
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register("targetAmount", { valueAsNumber: true })}
              className={cn(
                "h-12 w-full rounded-xl border bg-background px-4 text-xl font-bold text-foreground outline-none transition-colors focus:ring-2 focus:ring-ring",
                errors.targetAmount ? "border-destructive" : "border-input",
              )}
            />
            {errors.targetAmount && (
              <p className="mt-1 text-xs text-destructive">
                {errors.targetAmount.message}
              </p>
            )}
          </div>
          <div className="relative">
            <select
              {...register("currency")}
              className="h-12 appearance-none rounded-xl border border-input bg-background px-4 pr-8 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              {CURRENCY_CODES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Initial deposit */}
      <div className="rounded-xl border border-border bg-card p-5">
        <label className="mb-1.5 block text-sm font-semibold text-foreground">
          Initial Deposit
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            (optional)
          </span>
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          {...register("currentAmount", { valueAsNumber: true })}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Target date */}
      <div className="rounded-xl border border-border bg-card p-5">
        <label className="mb-1.5 block text-sm font-semibold text-foreground">
          Target Date
        </label>
        <Controller
          name="targetDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              value={field.value}
              onChange={(date) => field.onChange(date ?? new Date())}
              error={errors.targetDate?.message}
            />
          )}
        />
      </div>

      {/* Icon picker */}
      <div className="rounded-xl border border-border bg-card p-5">
        <label className="mb-3 block text-sm font-semibold text-foreground">
          Icon
        </label>
        <div className="flex flex-wrap gap-2">
          {GOAL_ICON_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setValue("icon", opt.value)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg border text-lg transition-colors",
                watchIcon === opt.value
                  ? "border-primary bg-primary/10"
                  : "border-input hover:bg-accent",
              )}
              title={opt.label}
            >
              {opt.emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div className="rounded-xl border border-border bg-card p-5">
        <label className="mb-3 block text-sm font-semibold text-foreground">
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setValue("color", color)}
              className={cn(
                "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                watchColor === color
                  ? "border-foreground scale-110"
                  : "border-transparent",
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 sm:flex-none sm:min-w-[200px]"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? "Create Goal" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
