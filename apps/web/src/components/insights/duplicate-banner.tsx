"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { AlertTriangle, X, ExternalLink, CheckCircle } from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DuplicateInfo {
  id: string;
  description: string;
  amount: number;
  date: Date;
  expenseId: string;
}

interface DuplicateBannerProps {
  duplicate: DuplicateInfo;
  onDismiss: () => void;
  onMarkSame: () => Promise<void>;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// DuplicateBanner
// ---------------------------------------------------------------------------

export function DuplicateBanner({
  duplicate,
  onDismiss,
  onMarkSame,
  className,
}: DuplicateBannerProps) {
  const [isMarkingDuplicate, setIsMarkingDuplicate] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const handleMarkSame = useCallback(async () => {
    setIsMarkingDuplicate(true);
    try {
      await onMarkSame();
      toast.success("Original expense marked as void");
      setIsDismissed(true);
    } catch {
      toast.error("Failed to mark as duplicate");
    } finally {
      setIsMarkingDuplicate(false);
    }
  }, [onMarkSame]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    setTimeout(() => onDismiss(), 300);
  }, [onDismiss]);

  if (isDismissed) return null;

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3.5 transition-all duration-300",
        isDismissed && "opacity-0 scale-95",
        className
      )}
      role="alert"
    >
      {/* Icon */}
      <div className="shrink-0 mt-0.5">
        <AlertTriangle className="h-5 w-5 text-warning" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          Possible duplicate detected
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          We found{" "}
          <span className="font-medium text-foreground">
            &ldquo;{duplicate.description}&rdquo;
          </span>{" "}
          on{" "}
          <span className="font-medium text-foreground">
            {duplicate.date.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>{" "}
          for{" "}
          <span className="font-semibold text-foreground">
            {formatCurrency(duplicate.amount)}
          </span>
        </p>

        {/* Actions */}
        <div className="mt-2.5 flex items-center gap-3 flex-wrap">
          <Link
            href={`/dashboard/expenses/${duplicate.expenseId}`}
            className="flex items-center gap-1 text-xs font-medium text-warning hover:underline"
            target="_blank"
          >
            View original
            <ExternalLink className="h-3 w-3" />
          </Link>

          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Not a duplicate
          </button>

          <button
            type="button"
            onClick={handleMarkSame}
            disabled={isMarkingDuplicate}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium transition-colors",
              "text-destructive hover:text-destructive/80",
              isMarkingDuplicate && "opacity-50 cursor-not-allowed"
            )}
          >
            {isMarkingDuplicate ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border border-destructive border-t-transparent" />
                Marking...
              </>
            ) : (
              <>
                <CheckCircle className="h-3 w-3" />
                It&apos;s the same expense
              </>
            )}
          </button>
        </div>
      </div>

      {/* Close */}
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 rounded-md p-0.5 text-muted-foreground/40 transition-colors hover:bg-accent hover:text-muted-foreground"
        aria-label="Dismiss duplicate warning"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Usage helper: useDuplicateBanner hook (optional, for form integration)
// ---------------------------------------------------------------------------

export function useDuplicateBanner() {
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);

  const show = useCallback((info: DuplicateInfo) => {
    setDuplicate(info);
  }, []);

  const dismiss = useCallback(() => {
    setDuplicate(null);
  }, []);

  return { duplicate, show, dismiss };
}
