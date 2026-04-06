"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/cn";
import { useFormatCurrency } from "@/hooks/use-currency";
import { useAddFunds } from "@/hooks/use-budgets";
import { BudgetProgress } from "./budget-progress";
import type { SavingsGoalRow } from "./savings-goal-card";
import { X, Loader2, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const addFundsSchema = z.object({
  amount: z
    .number({ required_error: "Amount is required", invalid_type_error: "Enter a valid amount" })
    .positive("Amount must be greater than zero"),
  notes: z.string().max(500).optional(),
});

type AddFundsValues = z.infer<typeof addFundsSchema>;

const QUICK_AMOUNTS = [100, 500, 1000, 5000];

interface AddFundsModalProps {
  goal: SavingsGoalRow;
  open: boolean;
  onClose: () => void;
}

export function AddFundsModal({ goal, open, onClose }: AddFundsModalProps) {
  const { formatCurrency } = useFormatCurrency();
  const { addFunds, isPending } = useAddFunds();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AddFundsValues>({
    resolver: zodResolver(addFundsSchema),
    defaultValues: {
      amount: undefined,
      notes: "",
    },
  });

  const watchAmount = watch("amount");

  const percent =
    goal.target_amount > 0
      ? (goal.current_amount / goal.target_amount) * 100
      : 0;

  const newPercent =
    goal.target_amount > 0 && watchAmount
      ? ((goal.current_amount + watchAmount) / goal.target_amount) * 100
      : percent;

  const onSubmit = useCallback(
    async (data: AddFundsValues) => {
      try {
        await addFunds(goal.id, data.amount, goal.current_amount);
        reset();
        onClose();
      } catch {
        // toast handled in hook
      }
    },
    [addFunds, goal.id, goal.current_amount, reset, onClose],
  );

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-border bg-card shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Add Funds
                </h2>
                <p className="text-xs text-muted-foreground">{goal.name}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">
              {/* Goal progress summary */}
              <div className="rounded-xl bg-muted/50 p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Current progress</span>
                  <span>{Math.min(Math.round(percent), 100)}%</span>
                </div>
                <BudgetProgress
                  spent={goal.current_amount}
                  budget={goal.target_amount}
                  showLabels={false}
                  height="sm"
                  className="mt-1.5"
                />
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">
                    {formatCurrency(goal.current_amount, goal.currency)}
                  </span>
                  <span className="text-muted-foreground">
                    of {formatCurrency(goal.target_amount, goal.currency)}
                  </span>
                </div>

                {watchAmount > 0 && (
                  <div className="mt-2 rounded-md bg-primary/10 px-2 py-1 text-center text-[11px] font-medium text-primary">
                    After adding: {Math.min(Math.round(newPercent), 100)}% (
                    {formatCurrency(
                      Math.min(goal.current_amount + watchAmount, goal.target_amount),
                      goal.currency,
                    )}
                    )
                  </div>
                )}
              </div>

              {/* Amount input */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register("amount", { valueAsNumber: true })}
                  className={cn(
                    "h-12 w-full rounded-xl border bg-background px-4 text-lg font-bold text-foreground outline-none transition-colors focus:ring-2 focus:ring-ring",
                    errors.amount ? "border-destructive" : "border-input",
                  )}
                />
                {errors.amount && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.amount.message}
                  </p>
                )}
              </div>

              {/* Quick amounts */}
              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setValue("amount", amt, { shouldValidate: true })}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                      watchAmount === amt
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    +{formatCurrency(amt, goal.currency)}
                  </button>
                ))}
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">
                  Notes
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <textarea
                  placeholder="e.g., Birthday money, Tax refund..."
                  rows={2}
                  {...register("notes")}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Add Funds
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
