"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  CheckCircle2,
  Circle,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";

interface ChecklistStep {
  id: string;
  label: string;
  description: string;
  href?: string;
  cta?: string;
  complete: boolean;
}

interface OnboardingChecklistProps {
  hasExpenses: boolean;
  hasBudgets: boolean;
  hasContacts: boolean;
  hasPendingPayments: boolean;
  /** Controlled dismiss — parent persists to localStorage / DB */
  onDismiss?: () => void;
}

export function OnboardingChecklist({
  hasExpenses,
  hasBudgets,
  hasContacts,
  hasPendingPayments,
  onDismiss,
}: OnboardingChecklistProps) {
  const [collapsed, setCollapsed] = useState(false);

  const steps: ChecklistStep[] = [
    {
      id: "account",
      label: "Create your account",
      description: "You're in! Your workspace is ready.",
      complete: true,
    },
    {
      id: "expense",
      label: "Add your first expense",
      description: "Log an income or expense to start tracking.",
      href: "/dashboard/expenses/new",
      cta: "Add expense",
      complete: hasExpenses,
    },
    {
      id: "budget",
      label: "Set a budget",
      description: "Create a category budget to stay on track.",
      href: "/dashboard/budgets/new",
      cta: "Create budget",
      complete: hasBudgets,
    },
    {
      id: "contact",
      label: "Add a contact",
      description: "Add a friend, family member, or colleague.",
      href: "/dashboard/contacts",
      cta: "Add contact",
      complete: hasContacts,
    },
    {
      id: "pending",
      label: "Record a pending payment",
      description: "Track money you owe or are owed.",
      href: "/dashboard/pending/new",
      cta: "Record payment",
      complete: hasPendingPayments,
    },
  ];

  const completedCount = steps.filter((s) => s.complete).length;
  const totalCount = steps.length;
  const allComplete = completedCount === totalCount;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const handleDismiss = useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  if (allComplete && !onDismiss) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm overflow-hidden transition-all duration-200",
        allComplete && "border-primary/30 bg-gradient-to-r from-primary/5 to-card"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              allComplete ? "bg-primary/15" : "bg-primary/10"
            )}
          >
            <Sparkles
              className={cn(
                "h-4 w-4",
                allComplete ? "text-primary" : "text-primary/70"
              )}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {allComplete ? "Setup complete!" : "Get started with ExpenseFlow"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {completedCount} of {totalCount} steps complete
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={collapsed ? "Expand checklist" : "Collapse checklist"}
          >
            {collapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
          {(allComplete || onDismiss) && (
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Dismiss checklist"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mx-5 mb-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <p className="px-5 pb-3 text-right text-[10px] text-muted-foreground">
        {progressPercent}%
      </p>

      {/* Steps */}
      {!collapsed && (
        <div className="divide-y divide-border border-t border-border">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-3 px-5 py-3.5 transition-colors",
                step.complete
                  ? "bg-primary/[0.03]"
                  : "hover:bg-accent/40"
              )}
            >
              {/* Checkbox icon */}
              <div className="mt-0.5 shrink-0">
                {step.complete ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/40" />
                )}
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    step.complete
                      ? "text-muted-foreground line-through decoration-primary/30"
                      : "text-foreground"
                  )}
                >
                  {step.label}
                </p>
                {!step.complete && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {step.description}
                  </p>
                )}
              </div>

              {/* CTA */}
              {!step.complete && step.href && step.cta && (
                <Link
                  href={step.href}
                  className="shrink-0 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  {step.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
