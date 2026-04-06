"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/cn";
import { useFormatCurrency } from "@/hooks/use-currency";
import { X, Banknote, Loader2 } from "lucide-react";
import type { PendingPaymentRow } from "@expenseflow/api";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
] as const;

const settleSchema = z.object({
  amount: z
    .number({ required_error: "Amount is required", invalid_type_error: "Must be a number" })
    .positive("Amount must be positive"),
  method: z.enum(["cash", "upi", "bank_transfer", "card", "other"]).default("cash"),
  notes: z.string().max(500).optional(),
});

type SettleFormValues = z.infer<typeof settleSchema>;

interface SettleModalProps {
  payment: PendingPaymentRow;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    amount: number;
    method: string;
    notes?: string;
  }) => Promise<void>;
}

export function SettleModal({
  payment,
  open,
  onClose,
  onSubmit,
}: SettleModalProps) {
  const { formatCurrency } = useFormatCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const remaining = payment.amount - payment.paid_amount;
  const isReceive = payment.direction === "receive";
  const contactName = payment.contacts?.name ?? "Unknown";

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SettleFormValues>({
    resolver: zodResolver(settleSchema),
    defaultValues: {
      amount: Math.round(remaining * 100) / 100,
      method: "cash",
      notes: "",
    },
  });

  const onFormSubmit = useCallback(
    async (data: SettleFormValues) => {
      setIsSubmitting(true);
      try {
        await onSubmit({
          amount: data.amount,
          method: data.method,
          notes: data.notes,
        });
        reset();
        onClose();
      } catch {
        // Error handled by parent
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSubmit, onClose, reset],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                isReceive ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30",
              )}
            >
              <Banknote
                className={cn(
                  "h-4 w-4",
                  isReceive ? "text-green-600" : "text-red-600",
                )}
              />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Record Payment
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Payment info */}
        <div className="mb-6 rounded-lg border border-border bg-muted/30 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Contact</span>
            <span className="font-medium text-foreground">{contactName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Amount</span>
            <span className="font-medium text-foreground">
              {formatCurrency(payment.amount, payment.currency)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Already Paid</span>
            <span className="font-medium text-foreground">
              {formatCurrency(payment.paid_amount, payment.currency)}
            </span>
          </div>
          <hr className="border-border" />
          <div className="flex justify-between text-sm">
            <span className="font-medium text-foreground">Remaining</span>
            <span
              className={cn(
                "font-bold",
                isReceive ? "text-green-600" : "text-red-600",
              )}
            >
              {formatCurrency(remaining, payment.currency)}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={remaining}
              {...register("amount", { valueAsNumber: true })}
              className={cn(
                "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
                errors.amount ? "border-destructive" : "border-input",
              )}
            />
            {errors.amount && (
              <p className="mt-1 text-xs text-destructive">
                {errors.amount.message}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Payment Method
            </label>
            <select
              {...register("method")}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Notes (optional)
            </label>
            <textarea
              {...register("notes")}
              rows={2}
              placeholder="Add a note..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors disabled:opacity-50",
                isReceive
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700",
              )}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
