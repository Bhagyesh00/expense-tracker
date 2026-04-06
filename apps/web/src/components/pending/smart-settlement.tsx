"use client";

import { useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/cn";
import { useFormatCurrency } from "@/hooks/use-currency";
import {
  calculateSettlements,
  type Debt,
} from "@expenseflow/utils";
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import type { PendingPaymentRow } from "@expenseflow/api";

interface SmartSettlementProps {
  payments: PendingPaymentRow[];
  currentUserName: string;
  onSettleAll: (
    settlements: Array<{
      from: string;
      to: string;
      amount: number;
    }>,
  ) => Promise<void>;
  className?: string;
}

export function SmartSettlement({
  payments,
  currentUserName,
  onSettleAll,
  className,
}: SmartSettlementProps) {
  const { formatCurrency } = useFormatCurrency();
  const [isSettling, setIsSettling] = useState(false);

  // Convert pending payments to debts
  const debts: Debt[] = useMemo(() => {
    return payments
      .filter(
        (p) =>
          p.status !== "settled" &&
          p.status !== "cancelled" &&
          p.total_amount - p.paid_amount > 0,
      )
      .map((p) => {
        const contactName = p.contacts?.name ?? "Unknown";
        const remaining = p.total_amount - p.paid_amount;

        if (p.direction === "give") {
          // You owe them
          return { from: currentUserName, to: contactName, amount: remaining };
        } else {
          // They owe you
          return { from: contactName, to: currentUserName, amount: remaining };
        }
      });
  }, [payments, currentUserName]);

  const settlements = useMemo(
    () => calculateSettlements(debts),
    [debts],
  );

  const handleSettleAll = useCallback(async () => {
    setIsSettling(true);
    try {
      await onSettleAll(settlements);
    } catch {
      // Error handled by parent
    } finally {
      setIsSettling(false);
    }
  }, [settlements, onSettleAll]);

  if (debts.length === 0) {
    return (
      <div className={cn("rounded-xl border border-border bg-card p-6 text-center", className)}>
        <CheckCircle2 className="mx-auto h-10 w-10 text-green-500 mb-3" />
        <p className="text-sm font-medium text-foreground">All settled!</p>
        <p className="text-xs text-muted-foreground mt-1">
          No pending payments to settle.
        </p>
      </div>
    );
  }

  if (settlements.length === 0) {
    return (
      <div className={cn("rounded-xl border border-border bg-card p-6 text-center", className)}>
        <CheckCircle2 className="mx-auto h-10 w-10 text-green-500 mb-3" />
        <p className="text-sm font-medium text-foreground">
          Balances cancel out!
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          All debts are balanced. No payments needed.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-6 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Smart Settlement
          </h3>
          <p className="text-xs text-muted-foreground">
            {settlements.length} optimized transaction{settlements.length !== 1 ? "s" : ""} to settle all debts
          </p>
        </div>
      </div>

      {/* Settlement list */}
      <div className="divide-y divide-border">
        {settlements.map((settlement, index) => {
          const isYouPaying = settlement.from === currentUserName;

          return (
            <div
              key={index}
              className="flex items-center gap-4 px-6 py-4"
            >
              {/* From */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                    isYouPaying ? "bg-red-500" : "bg-blue-500",
                  )}
                >
                  {settlement.from.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-foreground truncate">
                  {isYouPaying ? "You" : settlement.from}
                </span>
              </div>

              {/* Arrow + Amount */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-foreground">
                    {formatCurrency(settlement.amount, "INR")}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* To */}
              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                <span className="text-sm font-medium text-foreground truncate">
                  {settlement.to === currentUserName ? "You" : settlement.to}
                </span>
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                    settlement.to === currentUserName
                      ? "bg-green-500"
                      : "bg-blue-500",
                  )}
                >
                  {settlement.to.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Settle All button */}
      <div className="border-t border-border px-6 py-4">
        <button
          type="button"
          onClick={handleSettleAll}
          disabled={isSettling}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isSettling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Settle All ({settlements.length} transaction{settlements.length !== 1 ? "s" : ""})
        </button>
      </div>
    </div>
  );
}
