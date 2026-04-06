"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { useCreateExpense, useUpdateExpense } from "@/hooks/use-expenses";
import { useUIStore } from "@/stores/ui-store";
import { SUPPORTED_CURRENCIES, CURRENCY_CODES } from "@expenseflow/utils";
import { CategorySelector } from "./category-selector";
import { RecurringConfig } from "./recurring-config";
import { SplitConfig } from "./split-config";
import { ReceiptUpload } from "./receipt-upload";
import { TagsInput } from "@/components/shared/tags-input";
import { DatePicker } from "@/components/shared/date-picker";
import {
  Loader2,
  ArrowLeft,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
} from "lucide-react";

// Extended form schema
const formSchema = z
  .object({
    amount: z
      .number({ required_error: "Amount is required", invalid_type_error: "Enter a valid amount" })
      .positive("Amount must be greater than zero"),
    currency: z.string().min(3).max(3),
    type: z.enum(["expense", "income"]),
    categoryId: z.string().min(1, "Category is required"),
    description: z
      .string()
      .min(1, "Description is required")
      .max(255, "Description too long")
      .trim(),
    notes: z.string().max(2000).optional(),
    expenseDate: z.date({ required_error: "Date is required" }),
    tags: z.array(z.string().max(50)).max(10).optional(),
    receiptUrl: z.string().nullable().optional(),
    isRecurring: z.boolean().default(false),
    recurrenceInterval: z.string().nullable().optional(),
    recurrenceEndDate: z.date().nullable().optional(),
    isSplit: z.boolean().default(false),
    splitMethod: z.enum(["equal", "percentage", "exact"]).optional(),
  })
  .refine(
    (data) => !data.isRecurring || (data.recurrenceInterval != null && data.recurrenceInterval !== ""),
    {
      message: "Select a recurrence interval",
      path: ["recurrenceInterval"],
    },
  );

type FormValues = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  mode: "create" | "edit";
  initialData?: Partial<FormValues> & { id?: string };
  ocrData?: {
    amount?: number;
    merchant?: string;
    date?: string;
  };
  onSuccess?: () => void;
  className?: string;
}

export function ExpenseForm({
  mode,
  initialData,
  ocrData,
  onSuccess,
  className,
}: ExpenseFormProps) {
  const router = useRouter();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);
  const { createExpense, isPending: isCreating } = useCreateExpense();
  const { updateExpense, isPending: isUpdating } = useUpdateExpense();
  const isSaving = isCreating || isUpdating;

  const [hasRecurrenceEndDate, setHasRecurrenceEndDate] = useState(
    !!initialData?.recurrenceEndDate,
  );
  const [splitParticipants, setSplitParticipants] = useState<
    { id: string; name: string; amount: number; percentage: number }[]
  >([]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: initialData?.amount ?? undefined,
      currency: initialData?.currency ?? "INR",
      type: initialData?.type ?? "expense",
      categoryId: initialData?.categoryId ?? "",
      description: initialData?.description ?? "",
      notes: initialData?.notes ?? "",
      expenseDate: initialData?.expenseDate ?? new Date(),
      tags: initialData?.tags ?? [],
      receiptUrl: initialData?.receiptUrl ?? null,
      isRecurring: initialData?.isRecurring ?? false,
      recurrenceInterval: initialData?.recurrenceInterval ?? null,
      recurrenceEndDate: initialData?.recurrenceEndDate ?? null,
      isSplit: initialData?.isSplit ?? false,
      splitMethod: initialData?.splitMethod ?? "equal",
    },
  });

  const watchType = watch("type");
  const watchAmount = watch("amount");
  const watchCurrency = watch("currency");
  const watchIsRecurring = watch("isRecurring");
  const watchRecurrenceInterval = watch("recurrenceInterval");
  const watchRecurrenceEndDate = watch("recurrenceEndDate");
  const watchIsSplit = watch("isSplit");
  const watchSplitMethod = watch("splitMethod");
  const watchExpenseDate = watch("expenseDate");

  // Apply OCR data
  useEffect(() => {
    if (ocrData) {
      if (ocrData.amount) setValue("amount", ocrData.amount);
      if (ocrData.merchant) setValue("description", ocrData.merchant);
      if (ocrData.date) {
        const parsed = new Date(ocrData.date);
        if (!isNaN(parsed.getTime())) setValue("expenseDate", parsed);
      }
    }
  }, [ocrData, setValue]);

  const onSubmit = useCallback(
    async (data: FormValues) => {
      if (!workspaceId) return;

      const payload = {
        workspace_id: workspaceId,
        user_id: "", // Will be set by RLS
        category_id: data.categoryId,
        type: data.type as "expense" | "income",
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        notes: data.notes || null,
        date: data.expenseDate.toISOString().split("T")[0],
        tags: data.tags ?? null,
        receipt_url: data.receiptUrl || null,
        is_recurring: data.isRecurring,
        recurrence_interval: data.isRecurring
          ? data.recurrenceInterval
          : null,
      };

      try {
        if (mode === "create") {
          await createExpense(payload);
        } else if (initialData?.id) {
          const { workspace_id, user_id, ...updatePayload } = payload;
          await updateExpense(initialData.id, updatePayload);
        }
        onSuccess?.();
        router.push("/dashboard/expenses");
      } catch {
        // Toast already handled by hooks
      }
    },
    [mode, workspaceId, createExpense, updateExpense, initialData, onSuccess, router],
  );

  const handleOcrResult = useCallback(
    (result: { amount?: number; merchant?: string; date?: string }) => {
      if (result.amount) setValue("amount", result.amount);
      if (result.merchant) setValue("description", result.merchant);
      if (result.date) {
        const parsed = new Date(result.date);
        if (!isNaN(parsed.getTime())) setValue("expenseDate", parsed);
      }
    },
    [setValue],
  );

  const currencySymbol =
    SUPPORTED_CURRENCIES[watchCurrency]?.symbol ?? watchCurrency;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn("space-y-6", className)}
    >
      {/* Amount + Type */}
      <div className="rounded-xl border border-border bg-card p-5">
        {/* Type toggle */}
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setValue("type", "expense")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              watchType === "expense"
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            <ArrowDownCircle className="h-4 w-4" />
            Expense
          </button>
          <button
            type="button"
            onClick={() => setValue("type", "income")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              watchType === "income"
                ? "bg-success/10 text-success"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            <ArrowUpCircle className="h-4 w-4" />
            Income
          </button>
        </div>

        {/* Amount input */}
        <div className="flex items-start gap-3">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">
              {currencySymbol}
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register("amount", { valueAsNumber: true })}
              className={cn(
                "h-16 w-full rounded-xl border bg-background pl-12 pr-4 text-3xl font-bold text-foreground outline-none transition-colors focus:ring-2 focus:ring-ring",
                errors.amount ? "border-destructive" : "border-input",
              )}
            />
            {errors.amount && (
              <p className="mt-1 text-xs text-destructive">
                {errors.amount.message}
              </p>
            )}
          </div>

          {/* Currency selector */}
          <div className="relative">
            <select
              {...register("currency")}
              className="h-16 appearance-none rounded-xl border border-input bg-background px-4 pr-8 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
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

      {/* Category */}
      <div className="rounded-xl border border-border bg-card p-5">
        <label className="mb-3 block text-sm font-semibold text-foreground">
          Category
        </label>
        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <CategorySelector
              value={field.value}
              onChange={field.onChange}
              type={watchType}
              error={errors.categoryId?.message}
            />
          )}
        />
      </div>

      {/* Description */}
      <div className="rounded-xl border border-border bg-card p-5">
        <label className="mb-1.5 block text-sm font-semibold text-foreground">
          Description
        </label>
        <input
          type="text"
          placeholder="What was this for?"
          {...register("description")}
          className={cn(
            "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
            errors.description ? "border-destructive" : "border-input",
          )}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Date */}
      <div className="rounded-xl border border-border bg-card p-5">
        <label className="mb-1.5 block text-sm font-semibold text-foreground">
          Date
        </label>
        <Controller
          name="expenseDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              value={field.value}
              onChange={(date) => field.onChange(date ?? new Date())}
              error={errors.expenseDate?.message}
            />
          )}
        />
      </div>

      {/* Tags */}
      <div className="rounded-xl border border-border bg-card p-5">
        <label className="mb-1.5 block text-sm font-semibold text-foreground">
          Tags
        </label>
        <Controller
          name="tags"
          control={control}
          render={({ field }) => (
            <TagsInput
              value={field.value ?? []}
              onChange={field.onChange}
              placeholder="Add tags..."
            />
          )}
        />
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-border bg-card p-5">
        <label className="mb-1.5 block text-sm font-semibold text-foreground">
          Notes
        </label>
        <textarea
          placeholder="Additional notes..."
          rows={3}
          {...register("notes")}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {/* Receipt */}
      <div className="rounded-xl border border-border bg-card p-5">
        <label className="mb-3 block text-sm font-semibold text-foreground">
          Receipt
        </label>
        <Controller
          name="receiptUrl"
          control={control}
          render={({ field }) => (
            <ReceiptUpload
              value={field.value ?? null}
              onChange={field.onChange}
              onOcrResult={handleOcrResult}
            />
          )}
        />
      </div>

      {/* Recurring */}
      <div className="rounded-xl border border-border bg-card p-5">
        <Controller
          name="isRecurring"
          control={control}
          render={({ field: isRecField }) => (
            <Controller
              name="recurrenceInterval"
              control={control}
              render={({ field: intervalField }) => (
                <Controller
                  name="recurrenceEndDate"
                  control={control}
                  render={({ field: endDateField }) => (
                    <RecurringConfig
                      isRecurring={isRecField.value}
                      onIsRecurringChange={isRecField.onChange}
                      interval={intervalField.value ?? null}
                      onIntervalChange={intervalField.onChange}
                      endDate={endDateField.value ?? null}
                      onEndDateChange={endDateField.onChange}
                      hasEndDate={hasRecurrenceEndDate}
                      onHasEndDateChange={setHasRecurrenceEndDate}
                      expenseDate={watchExpenseDate}
                    />
                  )}
                />
              )}
            />
          )}
        />
        {errors.recurrenceInterval && (
          <p className="mt-2 text-xs text-destructive">
            {errors.recurrenceInterval.message}
          </p>
        )}
      </div>

      {/* Split */}
      <div className="rounded-xl border border-border bg-card p-5">
        <Controller
          name="isSplit"
          control={control}
          render={({ field: splitField }) => (
            <Controller
              name="splitMethod"
              control={control}
              render={({ field: methodField }) => (
                <SplitConfig
                  isSplit={splitField.value}
                  onIsSplitChange={splitField.onChange}
                  splitMethod={(methodField.value as "equal" | "percentage" | "exact") ?? "equal"}
                  onSplitMethodChange={methodField.onChange}
                  participants={splitParticipants}
                  onParticipantsChange={setSplitParticipants}
                  totalAmount={watchAmount || 0}
                  currency={watchCurrency}
                />
              )}
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
          {mode === "create" ? "Add Expense" : "Save Changes"}
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
