"use client";

import { useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/cn";
import { CURRENCY_CODES } from "@expenseflow/utils";
import { CategorySelector } from "./category-selector";
import { TagsInput } from "@/components/shared/tags-input";
import type { ExpenseTemplate, CreateTemplateInput } from "@/hooks/use-import";
import {
  X,
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(100).trim(),
  type: z.enum(["expense", "income"]),
  categoryId: z.string().optional(),
  description: z.string().max(255).optional(),
  variableAmount: z.boolean().default(false),
  amount: z.number().positive().optional().nullable(),
  currency: z.string().min(3).max(3).default("INR"),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  icon: z.string().optional(),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TemplateFormProps {
  template?: ExpenseTemplate | null;
  onSubmit: (data: CreateTemplateInput) => Promise<void>;
  onClose: () => void;
  isSubmitting?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TemplateForm({ template, onSubmit, onClose, isSubmitting = false }: TemplateFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: template?.name ?? "",
      type: template?.type ?? "expense",
      categoryId: template?.category_id ?? "",
      description: template?.description ?? "",
      variableAmount: template?.variable_amount ?? false,
      amount: template?.amount ?? null,
      currency: template?.currency ?? "INR",
      notes: template?.notes ?? "",
      tags: template?.tags ?? [],
      icon: template?.icon ?? "",
    },
  });

  const watchType = watch("type");
  const watchVariableAmount = watch("variableAmount");

  const handleFormSubmit = useCallback(
    async (values: TemplateFormValues) => {
      await onSubmit({
        name: values.name,
        description: values.description,
        category_id: values.categoryId || undefined,
        type: values.type,
        amount: values.variableAmount ? undefined : (values.amount ?? undefined),
        variable_amount: values.variableAmount,
        currency: values.currency,
        notes: values.notes,
        tags: values.tags,
        icon: values.icon,
      });
    },
    [onSubmit],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">
            {template ? "Edit Template" : "Create Template"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5 p-6">
          {/* Template name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Template Name <span className="text-destructive">*</span>
            </label>
            <input
              {...register("name")}
              placeholder="e.g. Monthly Rent, Lunch, Petrol"
              className={cn(
                "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
                errors.name ? "border-destructive" : "border-input",
              )}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Type toggle */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setValue("type", "expense")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
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
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  watchType === "income"
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                <ArrowUpCircle className="h-4 w-4" />
                Income
              </button>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Category</label>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <CategorySelector
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  type={watchType}
                />
              )}
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Description
            </label>
            <input
              {...register("description")}
              placeholder="What is this expense for?"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Variable amount toggle */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Variable amount</p>
              <p className="text-xs text-muted-foreground">
                When enabled, you will be asked to enter the amount each time you use this template
              </p>
            </div>
            <button
              type="button"
              onClick={() => setValue("variableAmount", !watchVariableAmount)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                watchVariableAmount ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                  watchVariableAmount ? "translate-x-6" : "translate-x-1",
                )}
              />
            </button>
          </div>

          {/* Amount + Currency */}
          {!watchVariableAmount && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Amount
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register("amount", { valueAsNumber: true })}
                  className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                />
                <div className="relative">
                  <select
                    {...register("currency")}
                    className="h-10 appearance-none rounded-lg border border-input bg-background px-3 pr-7 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
                  >
                    {CURRENCY_CODES.map((code) => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Tags</label>
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
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Notes</label>
            <textarea
              {...register("notes")}
              rows={3}
              placeholder="Additional notes..."
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {template ? "Save Changes" : "Create Template"}
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
