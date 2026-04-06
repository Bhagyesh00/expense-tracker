"use client";

import { cn } from "@/lib/cn";
import { useFormatCurrency } from "@/hooks/use-currency";
import {
  CircleDot,
  Banknote,
  AlertCircle,
} from "lucide-react";
import type { PaymentRecordRow } from "@expenseflow/api";

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  card: "Card",
  other: "Other",
};

interface PaymentTimelineProps {
  records: PaymentRecordRow[];
  totalAmount: number;
  currency: string;
  createdAt: string;
  direction: string;
  className?: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PaymentTimeline({
  records,
  totalAmount,
  currency,
  createdAt,
  direction,
  className,
}: PaymentTimelineProps) {
  const { formatCurrency } = useFormatCurrency();
  const isReceive = direction === "receive";

  // Sort records most recent first
  const sortedRecords = [...records].sort(
    (a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime(),
  );

  return (
    <div className={cn("space-y-0", className)}>
      <h3 className="mb-4 text-sm font-semibold text-foreground uppercase tracking-wider">
        Payment Timeline
      </h3>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-0">
          {/* Payment records */}
          {sortedRecords.map((record, index) => (
            <div key={record.id} className="relative flex gap-4 pb-6">
              {/* Dot */}
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 border-2 border-green-500">
                <Banknote className="h-3.5 w-3.5 text-green-600" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    Payment recorded
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold whitespace-nowrap",
                      isReceive ? "text-green-600" : "text-red-600",
                    )}
                  >
                    {formatCurrency(record.amount, currency)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(record.paid_at)}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  {record.method && (
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {METHOD_LABELS[record.method] ?? record.method}
                    </span>
                  )}
                </div>
                {record.notes && (
                  <p className="mt-1.5 text-xs text-muted-foreground italic">
                    {record.notes}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Creation entry */}
          <div className="relative flex gap-4 pb-2">
            {/* Dot */}
            <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500">
              <CircleDot className="h-3.5 w-3.5 text-blue-600" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  Payment created
                </span>
                <span className="text-sm font-bold text-foreground whitespace-nowrap">
                  {formatCurrency(totalAmount, currency)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {records.length === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 mt-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">
            No payments recorded yet. Use the &quot;Record Payment&quot; button
            to log a payment.
          </p>
        </div>
      )}
    </div>
  );
}
