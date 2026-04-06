"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Download,
  FileText,
  FileJson,
  Loader2,
  Receipt,
  TrendingUp,
  TrendingDown,
  Calculator,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { createBrowserClient } from "@/lib/supabase/client";
import { useUIStore } from "@/stores/ui-store";


// ── Types ─────────────────────────────────────────────────────────────────────

interface FiscalYear {
  label: string;
  startDate: string;
  endDate: string;
}

interface CategoryTaxSummary {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  totalAmount: number;
  transactionCount: number;
  isDeductible: boolean;
  gstAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
}

interface TaxSummaryData {
  totalExpenses: number;
  totalIncome: number;
  totalDeductible: number;
  totalGST: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  categories: CategoryTaxSummary[];
  transactionCount: number;
  fiscalYear: FiscalYear;
}

// ── Fiscal Year Helpers ───────────────────────────────────────────────────────

function getFiscalYears(): FiscalYear[] {
  const now = new Date();
  const currentFYStart =
    now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const years: FiscalYear[] = [];

  for (let i = 0; i < 4; i++) {
    const start = currentFYStart - i;
    const end = start + 1;
    years.push({
      label: `FY ${start}-${String(end).slice(-2)}`,
      startDate: `${start}-04-01`,
      endDate: `${end}-03-31`,
    });
  }
  return years;
}

const DEDUCTIBLE_CATEGORIES = [
  "Medical",
  "Health",
  "Education",
  "Insurance",
  "Charity",
  "Investment",
  "Professional",
  "Business",
  "Office",
  "Travel",
  "Transport",
];

function isDeductibleCategory(name: string): boolean {
  return DEDUCTIBLE_CATEGORIES.some((d) =>
    name.toLowerCase().includes(d.toLowerCase())
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

function useTaxSummary(fy: FiscalYear) {
  const client = createBrowserClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  return useQuery({
    queryKey: ["tax-summary", workspaceId, fy.startDate, fy.endDate],
    queryFn: async (): Promise<TaxSummaryData> => {
      const { data: expenses, error } = await client
        .from("expenses")
        .select(
          "type, amount, category_id, categories(id, name, icon), expense_date"
        )
        .eq("workspace_id", workspaceId!)
        .gte("expense_date", fy.startDate)
        .lte("expense_date", fy.endDate)
        .is("deleted_at", null);

      if (error) throw error;

      const rows = (expenses ?? []) as unknown as {
        type: string;
        amount: number;
        category_id: string;
        categories: { id: string; name: string; icon: string | null } | null;
        tax_amount: number | null;
        cgst: number | null;
        sgst: number | null;
        igst: number | null;
        expense_date: string;
      }[];

      let totalExpenses = 0;
      let totalIncome = 0;
      const categoryMap = new Map<string, CategoryTaxSummary>();

      for (const row of rows) {
        if (row.type === "income") {
          totalIncome += row.amount;
          continue;
        }

        totalExpenses += row.amount;
        const catId = row.category_id ?? "uncategorized";
        const catName = row.categories?.name ?? "Uncategorized";
        const cgst = row.cgst ?? 0;
        const sgst = row.sgst ?? 0;
        const igst = row.igst ?? 0;
        const taxAmount = row.tax_amount ?? cgst + sgst + igst;

        if (!categoryMap.has(catId)) {
          categoryMap.set(catId, {
            categoryId: catId,
            categoryName: catName,
            categoryIcon: row.categories?.icon ?? null,
            totalAmount: 0,
            transactionCount: 0,
            isDeductible: isDeductibleCategory(catName),
            gstAmount: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
          });
        }

        const entry = categoryMap.get(catId)!;
        entry.totalAmount += row.amount;
        entry.transactionCount += 1;
        entry.gstAmount += taxAmount;
        entry.cgst += cgst;
        entry.sgst += sgst;
        entry.igst += igst;
      }

      const categories = Array.from(categoryMap.values()).sort(
        (a, b) => b.totalAmount - a.totalAmount
      );

      const totalDeductible = categories
        .filter((c) => c.isDeductible)
        .reduce((sum, c) => sum + c.totalAmount, 0);

      const totalCGST = categories.reduce((sum, c) => sum + c.cgst, 0);
      const totalSGST = categories.reduce((sum, c) => sum + c.sgst, 0);
      const totalIGST = categories.reduce((sum, c) => sum + c.igst, 0);
      const totalGST = totalCGST + totalSGST + totalIGST;

      return {
        totalExpenses,
        totalIncome,
        totalDeductible,
        totalGST,
        totalCGST,
        totalSGST,
        totalIGST,
        categories,
        transactionCount: rows.filter((r) => r.type !== "income").length,
        fiscalYear: fy,
      };
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TaxExportPage() {
  const fiscalYears = useMemo(() => getFiscalYears(), []);
  const [selectedFY, setSelectedFY] = useState(fiscalYears[0]);
  const [showFYDropdown, setShowFYDropdown] = useState(false);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);
  const [isDownloadingJson, setIsDownloadingJson] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const { data, isLoading, error } = useTaxSummary(selectedFY);

  const handleDownloadCSV = () => {
    if (!data) return;
    setIsDownloadingCsv(true);
    try {
      const header = [
        "Category",
        "Total Amount",
        "Transactions",
        "Deductible",
        "GST",
        "CGST",
        "SGST",
        "IGST",
      ].join(",");

      const rows = data.categories.map((c) =>
        [
          `"${c.categoryName}"`,
          c.totalAmount.toFixed(2),
          c.transactionCount,
          c.isDeductible ? "Yes" : "No",
          c.gstAmount.toFixed(2),
          c.cgst.toFixed(2),
          c.sgst.toFixed(2),
          c.igst.toFixed(2),
        ].join(",")
      );

      const summaryRows = [
        "",
        `"Total Expenses",${data.totalExpenses.toFixed(2)}`,
        `"Total Income",${data.totalIncome.toFixed(2)}`,
        `"Total Deductible",${data.totalDeductible.toFixed(2)}`,
        `"Total GST",${data.totalGST.toFixed(2)}`,
        `"Total CGST",${data.totalCGST.toFixed(2)}`,
        `"Total SGST",${data.totalSGST.toFixed(2)}`,
        `"Total IGST",${data.totalIGST.toFixed(2)}`,
      ];

      const content = [header, ...rows, ...summaryRows].join("\n");
      const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenseflow-tax-${selectedFY.label.replace(/ /g, "-")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    } catch {
      toast.error("Failed to download CSV");
    } finally {
      setIsDownloadingCsv(false);
    }
  };

  const handleDownloadJSON = () => {
    if (!data) return;
    setIsDownloadingJson(true);
    try {
      const exportData = {
        generatedAt: new Date().toISOString(),
        fiscalYear: selectedFY,
        summary: {
          totalExpenses: data.totalExpenses,
          totalIncome: data.totalIncome,
          totalDeductible: data.totalDeductible,
          netSavings: data.totalIncome - data.totalExpenses,
          transactionCount: data.transactionCount,
        },
        gstSummary: {
          totalGST: data.totalGST,
          cgst: data.totalCGST,
          sgst: data.totalSGST,
          igst: data.totalIGST,
        },
        categories: data.categories,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenseflow-tax-${selectedFY.label.replace(/ /g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("JSON downloaded");
    } catch {
      toast.error("Failed to download JSON");
    } finally {
      setIsDownloadingJson(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 print:hidden">
        <Link
          href="/reports"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Tax Export
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate tax-ready reports for your financial year
          </p>
        </div>
      </div>

      {/* Print Header (only visible when printing) */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">
          Tax Report — {selectedFY.label}
        </h1>
        <p className="text-sm text-gray-500">
          Period: {selectedFY.startDate} to {selectedFY.endDate} · Generated:{" "}
          {new Date().toLocaleDateString("en-IN")}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        {/* FY Selector */}
        <div className="relative">
          <button
            onClick={() => setShowFYDropdown(!showFYDropdown)}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
          >
            <Calculator className="h-4 w-4 text-muted-foreground" />
            {selectedFY.label}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                showFYDropdown && "rotate-180"
              )}
            />
          </button>
          {showFYDropdown && (
            <div className="absolute top-full left-0 mt-1 z-10 w-44 rounded-lg border border-border bg-popover py-1 shadow-lg">
              {fiscalYears.map((fy) => (
                <button
                  key={fy.label}
                  onClick={() => {
                    setSelectedFY(fy);
                    setShowFYDropdown(false);
                  }}
                  className={cn(
                    "w-full px-4 py-2 text-left text-sm transition-colors hover:bg-accent",
                    selectedFY.label === fy.label
                      ? "font-semibold text-primary"
                      : "text-foreground"
                  )}
                >
                  {fy.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex gap-2">
          <button
            onClick={handleDownloadCSV}
            disabled={isDownloadingCsv || isLoading || !data}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            {isDownloadingCsv ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Download CSV
          </button>
          <button
            onClick={handleDownloadJSON}
            disabled={isDownloadingJson || isLoading || !data}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            {isDownloadingJson ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileJson className="h-3.5 w-3.5" />
            )}
            Download JSON
          </button>
          <button
            onClick={handlePrint}
            disabled={isPrinting || isLoading || !data}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isPrinting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
            Download PDF
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load tax data. Please try again.
        </div>
      )}

      {/* Data Loaded */}
      {data && !isLoading && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SummaryCard
              icon={TrendingDown}
              label="Total Expenses"
              value={fmt(data.totalExpenses)}
              color="text-red-500"
              bgColor="bg-red-100 dark:bg-red-900/20"
            />
            <SummaryCard
              icon={TrendingUp}
              label="Total Income"
              value={fmt(data.totalIncome)}
              color="text-emerald-600"
              bgColor="bg-emerald-100 dark:bg-emerald-900/20"
            />
            <SummaryCard
              icon={Receipt}
              label="Deductible"
              value={fmt(data.totalDeductible)}
              color="text-blue-600"
              bgColor="bg-blue-100 dark:bg-blue-900/20"
            />
            <SummaryCard
              icon={Calculator}
              label="Total GST"
              value={fmt(data.totalGST)}
              color="text-purple-600"
              bgColor="bg-purple-100 dark:bg-purple-900/20"
            />
          </div>

          {/* Category Breakdown Table */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-sm font-semibold text-foreground">
                Category-wise Expense Breakdown
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.transactionCount} transactions · {selectedFY.label}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      Category
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                      Total
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                      Txns
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">
                      Deductible
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                      CGST
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                      SGST
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                      IGST
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.categories.map((cat) => (
                    <tr
                      key={cat.categoryId}
                      className={cn(
                        "transition-colors hover:bg-muted/30",
                        cat.isDeductible && "bg-blue-50/30 dark:bg-blue-950/10"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {cat.categoryIcon && (
                            <span className="text-base">{cat.categoryIcon}</span>
                          )}
                          <span className="font-medium text-foreground">
                            {cat.categoryName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-foreground">
                        {fmt(cat.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {cat.transactionCount}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {cat.isDeductible ? (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            Yes
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                        {cat.cgst > 0 ? fmt(cat.cgst) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                        {cat.sgst > 0 ? fmt(cat.sgst) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                        {cat.igst > 0 ? fmt(cat.igst) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                    <td className="px-4 py-3 text-sm text-foreground">
                      Total
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-foreground">
                      {fmt(data.totalExpenses)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {data.transactionCount}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                        {fmt(data.totalDeductible)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                      {fmt(data.totalCGST)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                      {fmt(data.totalSGST)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                      {fmt(data.totalIGST)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* GST Summary */}
          {data.totalGST > 0 && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-foreground">
                GST Summary (India)
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Total GST</p>
                  <p className="text-lg font-bold text-foreground">
                    {fmt(data.totalGST)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">CGST</p>
                  <p className="text-lg font-bold text-foreground">
                    {fmt(data.totalCGST)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">SGST</p>
                  <p className="text-lg font-bold text-foreground">
                    {fmt(data.totalSGST)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">IGST</p>
                  <p className="text-lg font-bold text-foreground">
                    {fmt(data.totalIGST)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Income Summary */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              Summary for {selectedFY.label}
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Income</span>
                <span className="font-semibold text-emerald-600">
                  {fmt(data.totalIncome)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Expenses</span>
                <span className="font-semibold text-red-500">
                  {fmt(data.totalExpenses)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Deductible Expenses</span>
                <span className="font-semibold text-blue-600">
                  {fmt(data.totalDeductible)}
                </span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between text-sm font-semibold">
                <span className="text-foreground">Net Savings</span>
                <span
                  className={
                    data.totalIncome - data.totalExpenses >= 0
                      ? "text-emerald-600"
                      : "text-red-500"
                  }
                >
                  {fmt(Math.abs(data.totalIncome - data.totalExpenses))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className={cn("mb-2 flex h-8 w-8 items-center justify-center rounded-lg", bgColor)}>
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-base font-bold mt-0.5", color)}>{value}</p>
    </div>
  );
}
