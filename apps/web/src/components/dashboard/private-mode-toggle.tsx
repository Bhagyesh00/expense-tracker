"use client";

import { useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { usePrivateMode } from "@/hooks/use-privacy";

interface PrivateModeToggleProps {
  className?: string;
  showLabel?: boolean;
  showBadge?: boolean;
}

export function PrivateModeToggle({
  className,
  showLabel = false,
  showBadge = true,
}: PrivateModeToggleProps) {
  const { isPrivate, toggle, isHydrated } = usePrivateMode();

  // Show keyboard shortcut tooltip
  useEffect(() => {
    // The keyboard shortcut is handled in the usePrivateMode hook
    // This is just for documentation
  }, []);

  if (!isHydrated) {
    // Render placeholder to prevent layout shift
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium",
          className
        )}
      >
        <Eye className="h-4 w-4 text-muted-foreground" />
        {showLabel && (
          <span className="text-muted-foreground text-sm">Private</span>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={toggle}
      title={`${isPrivate ? "Disable" : "Enable"} private mode (Ctrl+Shift+P)`}
      aria-pressed={isPrivate}
      aria-label={isPrivate ? "Disable private mode" : "Enable private mode"}
      className={cn(
        "group relative flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all",
        isPrivate
          ? "bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:bg-violet-900/50"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        className
      )}
    >
      {/* Icon */}
      {isPrivate ? (
        <EyeOff
          className={cn(
            "h-4 w-4 transition-transform",
            "group-active:scale-90"
          )}
        />
      ) : (
        <Eye
          className={cn(
            "h-4 w-4 transition-transform",
            "group-active:scale-90"
          )}
        />
      )}

      {/* Label */}
      {showLabel && (
        <span className="text-sm">{isPrivate ? "Private" : "Private"}</span>
      )}

      {/* Badge */}
      {showBadge && isPrivate && (
        <span className="ml-0.5 rounded-full bg-violet-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white leading-none">
          ON
        </span>
      )}

      {/* Tooltip on hover (non-private state) */}
      <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] font-medium text-background opacity-0 transition-opacity group-hover:opacity-100 z-50">
        {isPrivate ? "Show amounts" : "Hide amounts"} (⌃⇧P)
      </span>
    </button>
  );
}

// ── Inline blur wrapper ────────────────────────────────────────────────────────
// Use this to wrap any amount display and it will blur when private mode is on.

interface BlurredAmountProps {
  amount: number | string;
  currency?: string;
  className?: string;
}

export function BlurredAmount({
  amount,
  currency = "₹",
  className,
}: BlurredAmountProps) {
  const { isPrivate, isHydrated } = usePrivateMode();

  const displayValue = isHydrated && isPrivate
    ? `${currency} •••`
    : typeof amount === "number"
    ? `${currency}${amount.toLocaleString("en-IN")}`
    : amount;

  return (
    <span
      className={cn(
        "transition-all duration-150",
        isHydrated && isPrivate && "select-none",
        className
      )}
      aria-hidden={isPrivate ? "true" : undefined}
    >
      {displayValue}
    </span>
  );
}
