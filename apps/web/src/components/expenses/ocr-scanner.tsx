"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/cn";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  ScanLine,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
} from "lucide-react";

interface OcrData {
  amount?: number;
  merchant?: string;
  date?: string;
  items?: string[];
}

interface OcrScannerProps {
  receiptUrl: string;
  onApply: (data: OcrData) => void;
  onDismiss: () => void;
  className?: string;
}

export function OcrScanner({
  receiptUrl,
  onApply,
  onDismiss,
  className,
}: OcrScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<OcrData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  const startScan = useCallback(async () => {
    setIsScanning(true);
    setError(null);
    setResult(null);

    try {
      const supabase = createBrowserClient();
      const { data, error: fnError } = await supabase.functions.invoke(
        "ocr-receipt",
        {
          body: { receiptUrl },
        },
      );

      if (fnError) throw fnError;

      const ocrData: OcrData = {
        amount: data?.amount,
        merchant: data?.merchant,
        date: data?.date,
        items: data?.items,
      };

      setResult(ocrData);
      setHasScanned(true);
    } catch {
      setError("Failed to scan receipt. Please try again or enter details manually.");
      setHasScanned(true);
    } finally {
      setIsScanning(false);
    }
  }, [receiptUrl]);

  return (
    <div className={cn("rounded-xl border border-border bg-card", className)}>
      {!hasScanned && !isScanning && (
        <div className="flex flex-col items-center p-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ScanLine className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            Scan Receipt
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Extract amount, merchant, and date automatically
          </p>
          <button
            type="button"
            onClick={startScan}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Sparkles className="h-4 w-4" />
            Scan now
          </button>
        </div>
      )}

      {isScanning && (
        <div className="flex flex-col items-center p-6 text-center">
          <div className="relative mb-4">
            <div className="h-16 w-16 rounded-full border-4 border-primary/20">
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
            </div>
            <Loader2 className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-spin text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Scanning receipt...
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Extracting data with AI
          </p>
        </div>
      )}

      {result && (
        <div className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm font-semibold text-foreground">
              Data extracted
            </span>
          </div>

          <div className="space-y-2 rounded-lg bg-accent/50 p-3">
            {result.amount != null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold text-foreground">
                  {"\u20B9"}{result.amount.toFixed(2)}
                </span>
              </div>
            )}
            {result.merchant && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Merchant</span>
                <span className="font-medium text-foreground">
                  {result.merchant}
                </span>
              </div>
            )}
            {result.date && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium text-foreground">
                  {result.date}
                </span>
              </div>
            )}
            {result.items && result.items.length > 0 && (
              <div className="text-sm">
                <span className="text-muted-foreground">Items</span>
                <ul className="mt-1 space-y-0.5">
                  {result.items.map((item, i) => (
                    <li key={i} className="text-xs text-foreground">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => onApply(result)}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Apply to form
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Ignore
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4">
          <div className="mb-3 flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Scan failed</span>
          </div>
          <p className="text-xs text-muted-foreground">{error}</p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={startScan}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <X className="mr-1 inline h-3.5 w-3.5" />
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
