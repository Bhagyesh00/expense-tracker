"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { useMileageLogs, type MileageLog, type CreateMileageInput } from "@/hooks/use-import";
import { MileageForm } from "@/components/expenses/mileage-form";
import { ArrowLeft, Plus, Car, Download, Trash2, MapPin, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMonthYear(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MileagePage() {
  const { logs, isLoading, createLog, deleteLog, isCreating } = useMileageLogs();
  const [showForm, setShowForm] = useState(false);

  const handleCreate = useCallback(
    async (data: CreateMileageInput) => {
      await createLog(data);
      setShowForm(false);
    },
    [createLog],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this trip log?")) return;
      await deleteLog(id);
    },
    [deleteLog],
  );

  // Monthly summary
  const monthlySummary = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthLogs = logs.filter((l) => {
      const d = new Date(l.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const totalKm = monthLogs.reduce((sum, l) => sum + l.distance_km, 0);
    const totalAmount = monthLogs.reduce((sum, l) => sum + l.amount, 0);
    return { totalKm, totalAmount, count: monthLogs.length };
  }, [logs]);

  // Export CSV
  const exportCSV = useCallback(() => {
    if (logs.length === 0) {
      toast.error("No trips to export");
      return;
    }
    const headers = ["Date", "From", "To", "Distance (km)", "Rate (₹/km)", "Amount (₹)", "Purpose"];
    const rows = logs.map((l) => [
      l.date,
      `"${l.from_location.replace(/"/g, '""')}"`,
      `"${l.to_location.replace(/"/g, '""')}"`,
      l.distance_km.toFixed(1),
      l.rate_per_km.toFixed(2),
      l.amount.toFixed(2),
      `"${(l.purpose ?? "").replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mileage-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported successfully");
  }, [logs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/expenses"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Back to expenses"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mileage Tracker</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Track trips and calculate reimbursable mileage
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Log Trip
          </button>
        </div>
      </div>

      {/* Monthly summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Car className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">This Month (km)</p>
            <p className="text-lg font-bold text-foreground">
              {monthlySummary.totalKm.toFixed(1)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
            <MapPin className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Reimbursable Amount</p>
            <p className="text-lg font-bold text-foreground">
              ₹{monthlySummary.totalAmount.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
            <Calendar className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Trips This Month</p>
            <p className="text-lg font-bold text-foreground">{monthlySummary.count}</p>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && logs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Car className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No trips logged yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Log your first trip to start tracking mileage and reimbursable amounts.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Log your first trip
          </button>
        </div>
      )}

      {/* Trip list */}
      {!isLoading && logs.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Route</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Distance</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rate</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Purpose</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                      {new Date(log.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-foreground">
                        <span className="truncate max-w-[120px]">{log.from_location}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="truncate max-w-[120px]">{log.to_location}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
                      {log.distance_km.toFixed(1)} km
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                      ₹{log.rate_per_km}/km
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-primary">
                      ₹{log.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[160px] truncate">
                      {log.purpose ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleDelete(log.id)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Car className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {log.from_location} → {log.to_location}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {log.distance_km.toFixed(1)} km · {new Date(log.date).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-primary">₹{log.amount.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <MileageForm
          defaultRate={14}
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
          isSubmitting={isCreating}
        />
      )}
    </div>
  );
}
