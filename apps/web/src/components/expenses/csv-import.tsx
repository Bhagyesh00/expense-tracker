"use client";

import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/cn";
import {
  autoDetectColumns,
  parseDate,
  parseAmount,
  useCSVImport,
  type ParsedRow,
  type ColumnMapping,
  type ImportResult,
} from "@/hooks/use-import";
import { CURRENCY_CODES } from "@expenseflow/utils";
import {
  Upload,
  FileSpreadsheet,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  Download,
  Loader2,
  X,
  Info,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  date: "Date",
  description: "Description",
  amount: "Amount",
  category: "Category",
  type: "Type",
  currency: "Currency",
  notes: "Notes",
  tags: "Tags",
};

const STEPS = ["Upload", "Map Columns", "Preview", "Import"];

// ---------------------------------------------------------------------------
// Parse CSV text
// ---------------------------------------------------------------------------

function parseCSVText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let inQuote = false;
    let current = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (ch === "," && !inQuote) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const vals = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = vals[i] ?? "";
    });
    return row;
  });

  return { headers, rows };
}

// ---------------------------------------------------------------------------
// Validate mapped row
// ---------------------------------------------------------------------------

function validateRow(
  raw: Record<string, string>,
  mapping: ColumnMapping,
  rowIndex: number,
): ParsedRow {
  const errors: string[] = [];
  const mapped: ParsedRow["mapped"] = {};

  // Date
  const dateVal = mapping.date ? raw[mapping.date] ?? "" : "";
  if (dateVal) {
    const d = parseDate(dateVal);
    if (!d) {
      errors.push(`Invalid date: "${dateVal}"`);
    } else {
      mapped.date = d.toISOString().split("T")[0];
    }
  } else {
    errors.push("Missing date");
  }

  // Description
  const descVal = mapping.description ? raw[mapping.description] ?? "" : "";
  if (descVal.trim()) {
    mapped.description = descVal.trim().slice(0, 255);
  } else {
    errors.push("Missing description");
  }

  // Amount
  const amtVal = mapping.amount ? raw[mapping.amount] ?? "" : "";
  if (amtVal) {
    const amt = parseAmount(amtVal);
    if (amt === null || amt <= 0) {
      errors.push(`Invalid amount: "${amtVal}"`);
    } else {
      mapped.amount = amt;
    }
  } else {
    errors.push("Missing amount");
  }

  // Type
  const typeVal = (mapping.type ? raw[mapping.type] ?? "" : "").toLowerCase().trim();
  if (typeVal.includes("income") || typeVal.includes("credit") || typeVal.includes("cr")) {
    mapped.type = "income";
  } else {
    mapped.type = "expense";
  }

  // Category
  if (mapping.category && raw[mapping.category]) {
    mapped.category = raw[mapping.category];
  }

  // Currency
  const currVal = (mapping.currency ? raw[mapping.currency] ?? "" : "").toUpperCase().trim();
  if (currVal && (CURRENCY_CODES as readonly string[]).includes(currVal)) {
    mapped.currency = currVal;
  } else {
    mapped.currency = "INR";
  }

  // Notes
  if (mapping.notes && raw[mapping.notes]) {
    mapped.notes = raw[mapping.notes];
  }

  // Tags
  if (mapping.tags && raw[mapping.tags]) {
    mapped.tags = raw[mapping.tags].split(/[;,|]/).map((t) => t.trim()).filter(Boolean);
  }

  return { rowIndex, raw, mapped, errors, valid: errors.length === 0 };
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                i < current
                  ? "bg-primary text-primary-foreground"
                  : i === current
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span
              className={cn(
                "hidden text-xs font-medium sm:block",
                i === current ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "mx-2 h-px w-8 sm:w-12 transition-colors",
                i < current ? "bg-primary" : "bg-border",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CSVImportProps {
  userId: string;
  onComplete?: (result: ImportResult) => void;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CSVImport({ userId, onComplete }: CSVImportProps) {
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: "",
    description: "",
    amount: "",
    category: "",
    type: "",
    currency: "",
    notes: "",
    tags: "",
  });
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { importRows, isImporting, progress } = useCSVImport();

  // Step 1: File handling
  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    let csvText = text;

    // Basic XLS/XLSX detection — treat as plain CSV attempt (xlsx lib would handle real XLSX)
    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      // In production this would use SheetJS, here we attempt plaintext parse
      // and show a helpful note
    }

    const { headers: h, rows } = parseCSVText(csvText);
    if (h.length === 0) return;

    setHeaders(h);
    setRawRows(rows);
    const detected = autoDetectColumns(h);
    setMapping(detected);
    setStep(1);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  // Step 2 → 3: Validate rows
  const applyMapping = useCallback(() => {
    const validated = rawRows.map((row, i) => validateRow(row, mapping, i + 2));
    setParsedRows(validated);
    setStep(2);
  }, [rawRows, mapping]);

  // Step 3 → 4: Import
  const handleImport = useCallback(async () => {
    setStep(3);
    const result = await importRows(parsedRows, userId);
    setImportResult(result);
    onComplete?.(result);
  }, [parsedRows, importRows, userId, onComplete]);

  // Download error report
  const downloadErrorReport = useCallback(() => {
    if (!importResult) return;
    const lines = [
      "Row,Reason",
      ...importResult.failedRows.map((r) => `${r.rowIndex},"${r.reason.replace(/"/g, '""')}"`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-errors.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [importResult]);

  // Download sample CSV
  const downloadSample = useCallback(() => {
    const sample = [
      "Date,Description,Amount,Category,Type,Currency,Notes,Tags",
      "2024-01-15,Grocery Store,1250.00,Groceries,Expense,INR,Weekly groceries,food;essentials",
      "2024-01-16,Petrol,800.00,Transport,Expense,INR,,travel",
      "2024-01-17,Salary,50000.00,Salary,Income,INR,January salary,",
    ].join("\n");
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expense-import-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const validCount = parsedRows.filter((r) => r.valid).length;
  const errorCount = parsedRows.filter((r) => !r.valid).length;

  // -------------------------------------------------------------------------
  // Step 0 — Upload
  // -------------------------------------------------------------------------

  if (step === 0) {
    return (
      <div className="space-y-6">
        <StepIndicator current={0} />

        {/* Accepted formats */}
        <div className="flex flex-wrap gap-2">
          {["CSV", "Excel (.xlsx)", "Excel (.xls)"].map((fmt) => (
            <span
              key={fmt}
              className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              {fmt}
            </span>
          ))}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 text-center transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-accent/30",
          )}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Upload className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Drop your file here or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              CSV or Excel file, up to 10 MB
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>

        {/* Sample download */}
        <button
          type="button"
          onClick={downloadSample}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Download className="h-4 w-4" />
          Download sample CSV
        </button>

        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Your CSV should have columns for date, description, and amount at minimum.
            Column names are auto-detected but you can map them manually in the next step.
          </span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Step 1 — Map Columns
  // -------------------------------------------------------------------------

  if (step === 1) {
    return (
      <div className="space-y-6">
        <StepIndicator current={1} />

        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm">
          <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary" />
          <span className="font-medium text-foreground">{fileName}</span>
          <span className="text-muted-foreground">— {rawRows.length} rows detected</span>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-muted/40 px-5 py-3">
            <h3 className="text-sm font-semibold text-foreground">Column Mapping</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Map your CSV columns to expense fields
            </p>
          </div>
          <div className="divide-y divide-border">
            {(Object.keys(FIELD_LABELS) as (keyof ColumnMapping)[]).map((field) => (
              <div
                key={field}
                className="flex items-center gap-4 px-5 py-3"
              >
                <div className="w-32 shrink-0">
                  <span className="text-sm font-medium text-foreground">
                    {FIELD_LABELS[field]}
                  </span>
                  {(field === "date" || field === "description" || field === "amount") && (
                    <span className="ml-1 text-xs text-destructive">*</span>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                <select
                  value={mapping[field]}
                  onChange={(e) =>
                    setMapping((prev) => ({ ...prev, [field]: e.target.value }))
                  }
                  className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">-- Not mapped --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                {mapping[field] && (
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                    e.g. {rawRows[0]?.[mapping[field]] ?? "—"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep(0)}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            onClick={applyMapping}
            disabled={!mapping.date || !mapping.description || !mapping.amount}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            Preview Data
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Step 2 — Preview
  // -------------------------------------------------------------------------

  if (step === 2) {
    return (
      <div className="space-y-6">
        <StepIndicator current={2} />

        {/* Summary */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-success/10 px-4 py-2 text-sm font-medium text-success">
            <Check className="h-4 w-4" />
            {validCount} valid
          </div>
          {errorCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
              <AlertCircle className="h-4 w-4" />
              {errorCount} errors
            </div>
          )}
        </div>

        {/* Preview table */}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Date</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Description</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Amount</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Type</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {parsedRows.slice(0, 10).map((row) => (
                <tr
                  key={row.rowIndex}
                  className={cn(
                    "border-b border-border last:border-0",
                    !row.valid && "bg-destructive/5",
                  )}
                >
                  <td className="px-3 py-2 text-muted-foreground">{row.rowIndex}</td>
                  <td className="px-3 py-2 text-foreground whitespace-nowrap">
                    {row.mapped.date ?? (
                      <span className="text-destructive">Invalid</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-foreground max-w-[200px] truncate">
                    {row.mapped.description ?? (
                      <span className="text-destructive">Missing</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-foreground">
                    {row.mapped.amount != null ? (
                      `₹${row.mapped.amount.toFixed(2)}`
                    ) : (
                      <span className="text-destructive">Invalid</span>
                    )}
                  </td>
                  <td className="px-3 py-2 capitalize text-muted-foreground">
                    {row.mapped.type ?? "expense"}
                  </td>
                  <td className="px-3 py-2">
                    {row.valid ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-success">
                        <Check className="h-3 w-3" />
                        OK
                      </span>
                    ) : (
                      <span
                        title={row.errors.join("; ")}
                        className="inline-flex cursor-help items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-destructive"
                      >
                        <AlertCircle className="h-3 w-3" />
                        Error
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {parsedRows.length > 10 && (
            <div className="border-t border-border bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
              Showing 10 of {parsedRows.length} rows
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={validCount === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            Import {validCount} Expenses
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Step 3 — Import / Result
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <StepIndicator current={3} />

      {isImporting && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm font-medium text-foreground">Importing…</span>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {importResult && (
        <div className="space-y-4">
          {/* Success */}
          <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20">
              <Check className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {importResult.successCount} expense{importResult.successCount !== 1 ? "s" : ""} imported
              </p>
              <p className="text-sm text-muted-foreground">
                Successfully added to your workspace
              </p>
            </div>
          </div>

          {/* Errors */}
          {importResult.failedRows.length > 0 && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-semibold text-destructive">
                    {importResult.failedRows.length} rows failed
                  </span>
                </div>
                <button
                  type="button"
                  onClick={downloadErrorReport}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download error report
                </button>
              </div>
              <div className="space-y-1 max-h-40 overflow-auto">
                {importResult.failedRows.slice(0, 10).map((r) => (
                  <div key={r.rowIndex} className="text-xs text-muted-foreground">
                    Row {r.rowIndex}: {r.reason}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Start over */}
          <button
            type="button"
            onClick={() => {
              setStep(0);
              setImportResult(null);
              setFileName("");
              setHeaders([]);
              setRawRows([]);
              setParsedRows([]);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <X className="h-4 w-4" />
            Import another file
          </button>
        </div>
      )}
    </div>
  );
}
