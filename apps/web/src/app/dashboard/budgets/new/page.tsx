"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BudgetForm } from "@/components/budgets/budget-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

function NewBudgetContent() {
  const searchParams = useSearchParams();
  const type = (searchParams.get("type") as "budget" | "goal") ?? "budget";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/budgets"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Budgets
      </Link>

      {/* Form */}
      <BudgetForm mode="create" type={type} />
    </div>
  );
}

export default function NewBudgetPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border border-border bg-card"
              />
            ))}
          </div>
        </div>
      }
    >
      <NewBudgetContent />
    </Suspense>
  );
}
