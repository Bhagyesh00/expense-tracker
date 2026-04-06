"use client";

import { useState } from "react";
import {
  X,
  Download,
  FileText,
  Calendar,
  Filter,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

interface AccountingExportProps {
  onClose: () => void;
}

interface ExportRecord {
  id: string;
  format: string;
  dateRange: string;
  categories: string;
  status: "completed" | "processing";
  createdAt: string;
  fileSize: string;
}

const FORMATS = [
  {
    id: "quickbooks",
    name: "QuickBooks",
    ext: ".iif",
    description: "Intuit Interchange Format",
  },
  {
    id: "xero",
    name: "Xero",
    ext: ".csv",
    description: "Xero-compatible CSV",
  },
  {
    id: "zoho",
    name: "Zoho Books",
    ext: ".csv",
    description: "Zoho Books import format",
  },
];

const CATEGORIES = [
  "All Categories",
  "Food & Dining",
  "Transportation",
  "Entertainment",
  "Utilities",
  "Shopping",
  "Healthcare",
  "Education",
  "Travel",
  "Other",
];

const MOCK_HISTORY: ExportRecord[] = [
  {
    id: "exp_1",
    format: "QuickBooks",
    dateRange: "Jan 2026 - Mar 2026",
    categories: "All Categories",
    status: "completed",
    createdAt: "2026-03-28T10:00:00Z",
    fileSize: "245 KB",
  },
  {
    id: "exp_2",
    format: "Xero",
    dateRange: "Feb 2026",
    categories: "Food & Dining, Transportation",
    status: "completed",
    createdAt: "2026-03-15T14:30:00Z",
    fileSize: "128 KB",
  },
];

export function AccountingExport({ onClose }: AccountingExportProps) {
  const [selectedFormat, setSelectedFormat] = useState("quickbooks");
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-03-30");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "All Categories",
  ]);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [history, setHistory] = useState<ExportRecord[]>(MOCK_HISTORY);

  function toggleCategory(cat: string) {
    if (cat === "All Categories") {
      setSelectedCategories(["All Categories"]);
      return;
    }
    setSelectedCategories((prev) => {
      const next = prev.filter((c) => c !== "All Categories");
      if (next.includes(cat)) {
        const filtered = next.filter((c) => c !== cat);
        return filtered.length === 0 ? ["All Categories"] : filtered;
      }
      return [...next, cat];
    });
  }

  async function handleExport() {
    setExporting(true);
    setExportProgress(0);

    for (let i = 0; i <= 100; i += 10) {
      await new Promise((r) => setTimeout(r, 300));
      setExportProgress(i);
    }

    const format = FORMATS.find((f) => f.id === selectedFormat);
    const newExport: ExportRecord = {
      id: `exp_${Date.now()}`,
      format: format?.name ?? selectedFormat,
      dateRange: `${new Date(dateFrom).toLocaleDateString("en-US", { month: "short", year: "numeric" })} - ${new Date(dateTo).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`,
      categories: selectedCategories.join(", "),
      status: "completed",
      createdAt: new Date().toISOString(),
      fileSize: `${Math.floor(Math.random() * 300 + 50)} KB`,
    };

    setHistory((prev) => [newExport, ...prev]);
    setExporting(false);
    setExportProgress(0);
    toast.success("Export completed successfully");
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          Accounting Export
        </h3>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        {/* Export form */}
        <div className="space-y-4">
          {/* Format selector */}
          <div>
            <label className="block text-sm font-medium text-foreground">
              Export Format
            </label>
            <div className="mt-2 space-y-2">
              {FORMATS.map((format) => (
                <label
                  key={format.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                    selectedFormat === format.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    value={format.id}
                    checked={selectedFormat === format.id}
                    onChange={() => setSelectedFormat(format.id)}
                    className="h-4 w-4 text-primary focus:ring-primary"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {format.name}{" "}
                      <span className="text-muted-foreground">
                        ({format.ext})
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Date Range
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="flex items-center text-sm text-muted-foreground">
                to
              </span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Category filter */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Filter className="h-4 w-4 text-muted-foreground" />
              Categories
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    selectedCategories.includes(cat)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {exporting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting... {exportProgress}%
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export
              </span>
            )}
          </button>

          {exporting && (
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* Export history */}
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            Export History
          </h4>
          <div className="mt-2 space-y-2">
            {history.map((record) => (
              <div
                key={record.id}
                className="rounded-lg border border-border p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {record.format}
                    </span>
                  </div>
                  {record.status === "completed" ? (
                    <button className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                      <Download className="h-3 w-3" />
                      Download
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Processing
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{record.dateRange}</span>
                  <span>{record.fileSize}</span>
                  <span>
                    {new Date(record.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
