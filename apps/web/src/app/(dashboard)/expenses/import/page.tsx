"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CSVImport } from "@/components/expenses/csv-import";
import { createBrowserClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { ImportResult } from "@/hooks/use-import";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ImportExpensesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const client = createBrowserClient();
    client.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const handleComplete = (result: ImportResult) => {
    if (result.successCount > 0) {
      toast.success(`Imported ${result.successCount} expense${result.successCount !== 1 ? "s" : ""}`);
    }
    if (result.failedRows.length === 0 && result.successCount > 0) {
      setTimeout(() => router.push("/dashboard/expenses"), 1500);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/expenses"
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Back to expenses"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Upload a CSV or Excel file to bulk-import transactions
          </p>
        </div>
      </div>

      {/* Import wizard */}
      <div className="rounded-xl border border-border bg-card p-6">
        <CSVImport userId={userId} onComplete={handleComplete} />
      </div>
    </div>
  );
}
