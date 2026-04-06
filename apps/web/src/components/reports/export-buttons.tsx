"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/cn";
import { Download, FileText, Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type {
  ReportSummary,
  CategoryBreakdownItem,
  TopCategoryItem,
} from "@/hooks/use-reports";
import { formatCurrency } from "@expenseflow/utils";

interface ExportButtonsProps {
  dateRange: { startDate: string; endDate: string };
  summary?: ReportSummary;
  categoryBreakdown?: CategoryBreakdownItem[];
  topCategories?: TopCategoryItem[];
}

export function ExportButtons({
  dateRange,
  summary,
  categoryBreakdown,
  topCategories,
}: ExportButtonsProps) {
  const [csvLoading, setCsvLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const filenameDate = `${dateRange.startDate}_to_${dateRange.endDate}`;

  const exportCSV = useCallback(() => {
    setCsvLoading(true);
    try {
      const rows: string[][] = [];

      // Summary section
      rows.push(["Report Summary"]);
      rows.push([
        "Period",
        `${dateRange.startDate} to ${dateRange.endDate}`,
      ]);
      if (summary) {
        rows.push([
          "Total Expenses",
          formatCurrency(summary.totalExpenses, "INR"),
        ]);
        rows.push([
          "Total Income",
          formatCurrency(summary.totalIncome, "INR"),
        ]);
        rows.push([
          "Net Savings",
          formatCurrency(summary.netSavings, "INR"),
        ]);
        rows.push(["Savings Rate", `${summary.savingsRate.toFixed(1)}%`]);
        rows.push([
          "Avg Daily Spend",
          formatCurrency(summary.avgDailySpend, "INR"),
        ]);
        rows.push([
          "Transaction Count",
          summary.transactionCount.toString(),
        ]);
      }
      rows.push([]);

      // Category breakdown
      if (categoryBreakdown && categoryBreakdown.length > 0) {
        rows.push(["Category Breakdown"]);
        rows.push(["Category", "Amount", "Transactions", "Percentage"]);
        for (const cat of categoryBreakdown) {
          rows.push([
            cat.categoryName,
            cat.totalAmount.toString(),
            cat.transactionCount.toString(),
            `${cat.percentage.toFixed(1)}%`,
          ]);
        }
        rows.push([]);
      }

      // Top categories
      if (topCategories && topCategories.length > 0) {
        rows.push(["Top Categories"]);
        rows.push(["Rank", "Category", "Amount", "Percentage"]);
        topCategories.forEach((cat, i) => {
          rows.push([
            (i + 1).toString(),
            cat.categoryName,
            cat.totalAmount.toString(),
            `${cat.percentage.toFixed(1)}%`,
          ]);
        });
      }

      const csv = rows
        .map((row) =>
          row
            .map((cell) => `"${cell.replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expense-report-${filenameDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported successfully");
    } catch {
      toast.error("Failed to export CSV");
    } finally {
      setCsvLoading(false);
    }
  }, [dateRange, summary, categoryBreakdown, topCategories, filenameDate]);

  const exportPDF = useCallback(() => {
    setPdfLoading(true);
    try {
      // Use the browser's built-in print functionality for PDF generation
      // Add a small delay for state update
      setTimeout(() => {
        window.print();
        setPdfLoading(false);
        toast.success("Print dialog opened");
      }, 100);
    } catch {
      setPdfLoading(false);
      toast.error("Failed to open print dialog");
    }
  }, []);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={exportCSV}
        disabled={csvLoading}
        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
      >
        {csvLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">CSV</span>
      </button>
      <button
        type="button"
        onClick={exportPDF}
        disabled={pdfLoading}
        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
      >
        {pdfLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">PDF</span>
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
      >
        <Printer className="h-4 w-4" />
        <span className="hidden sm:inline">Print</span>
      </button>
    </div>
  );
}
