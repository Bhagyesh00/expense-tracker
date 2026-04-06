"use client";

import Link from "next/link";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ArrowLeft } from "lucide-react";

export default function NewExpensePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/expenses"
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Back to expenses"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Expense</h1>
          <p className="text-sm text-muted-foreground">
            Record a new transaction
          </p>
        </div>
      </div>

      <ExpenseForm mode="create" />
    </div>
  );
}
