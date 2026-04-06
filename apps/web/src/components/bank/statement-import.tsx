"use client";

import { useState, useCallback } from "react";
import {
  Upload,
  FileText,
  X,
  Check,
  AlertCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

type ImportStep = "upload" | "mapping" | "preview" | "importing";

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  balance: number | null;
}

const COLUMN_OPTIONS = [
  { value: "date", label: "Date" },
  { value: "description", label: "Description" },
  { value: "amount", label: "Amount" },
  { value: "credit", label: "Credit" },
  { value: "debit", label: "Debit" },
  { value: "balance", label: "Balance" },
  { value: "skip", label: "Skip" },
];

export function StatementImport() {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({
    0: "date",
    1: "description",
    2: "amount",
    3: "balance",
  });
  const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);
  const [importProgress, setImportProgress] = useState(0);

  // Simulated CSV headers
  const [headers] = useState(["Date", "Narration", "Withdrawal Amt", "Closing Balance"]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) processFile(dropped);
  }, []);

  function processFile(f: File) {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    const supportedTypes = ["csv", "ofx", "qif", "pdf"];
    if (!supportedTypes.includes(ext)) {
      toast.error("Unsupported file type. Please use CSV, OFX, QIF, or PDF.");
      return;
    }
    setFile(f);
    setFileType(ext.toUpperCase());
    setStep("mapping");
    toast.success(`File detected as ${ext.toUpperCase()}`);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  }

  function handleMappingConfirm() {
    // Generate mock parsed transactions
    const mockParsed: ParsedTransaction[] = [
      { date: "2026-03-29", description: "SWIGGY*ORDER 847293", amount: -456, balance: 124974 },
      { date: "2026-03-28", description: "UBER TRIP MAR28", amount: -289, balance: 125263 },
      { date: "2026-03-28", description: "SALARY CREDIT MAR26", amount: 85000, balance: 125552 },
      { date: "2026-03-27", description: "AMAZON PAY IN*AMZ", amount: -1299, balance: 40552 },
      { date: "2026-03-26", description: "FLIPKART*PURCHASE", amount: -2499, balance: 41851 },
    ];
    setParsedData(mockParsed);
    setStep("preview");
  }

  async function handleImport() {
    setStep("importing");
    for (let i = 0; i <= 100; i += 5) {
      await new Promise((r) => setTimeout(r, 100));
      setImportProgress(i);
    }
    toast.success(`${parsedData.length} transactions imported successfully`);
    setStep("upload");
    setFile(null);
    setParsedData([]);
    setImportProgress(0);
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">
          Import Bank Statement
        </h3>
        {/* Step indicator */}
        <div className="mt-2 flex items-center gap-2">
          {["Upload", "Map Columns", "Preview", "Import"].map((label, i) => {
            const steps: ImportStep[] = [
              "upload",
              "mapping",
              "preview",
              "importing",
            ];
            const isActive = steps.indexOf(step) >= i;
            return (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && (
                  <div
                    className={`h-px w-6 ${isActive ? "bg-primary" : "bg-border"}`}
                  />
                )}
                <span
                  className={`text-xs font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4">
        {/* Upload step */}
        {step === "upload" && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
              dragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">
              Drag and drop your bank statement
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Supports CSV, OFX, QIF, and PDF files
            </p>
            <label className="mt-4 cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Browse Files
              <input
                type="file"
                accept=".csv,.ofx,.qif,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Mapping step */}
        {step === "mapping" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{file?.name}</span>
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                {fileType}
              </span>
              <button
                onClick={() => {
                  setStep("upload");
                  setFile(null);
                }}
                className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground">
                Map columns to fields
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Auto-detected column mappings. Adjust if needed.
              </p>
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Column Header
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Maps To
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {headers.map((header, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 font-medium text-foreground">
                        {header}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={columnMapping[idx] ?? "skip"}
                          onChange={(e) =>
                            setColumnMapping((prev) => ({
                              ...prev,
                              [idx]: e.target.value,
                            }))
                          }
                          className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
                        >
                          {COLUMN_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setStep("upload");
                  setFile(null);
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Back
              </button>
              <button
                onClick={handleMappingConfirm}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Preview
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Preview step */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <p className="text-sm font-medium text-foreground">
                {parsedData.length} transactions parsed
              </p>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsedData.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-accent/50">
                      <td className="px-3 py-2 text-foreground">
                        {new Date(tx.date).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 text-foreground">
                        {tx.description}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-medium ${tx.amount < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
                      >
                        {tx.amount < 0 ? "-" : "+"}
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {tx.balance !== null
                          ? formatCurrency(tx.balance)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setStep("mapping")}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Import {parsedData.length} Transactions
              </button>
            </div>
          </div>
        )}

        {/* Importing step */}
        {step === "importing" && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-sm font-medium text-foreground">
              Importing transactions...
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {importProgress}% complete
            </p>
            <div className="mt-3 h-2 w-64 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-200"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
