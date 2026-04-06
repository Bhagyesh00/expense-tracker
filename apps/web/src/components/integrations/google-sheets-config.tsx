"use client";

import { useState } from "react";
import {
  X,
  FileSpreadsheet,
  RefreshCw,
  Check,
  ExternalLink,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface GoogleSheetsConfigProps {
  onClose: () => void;
}

const SYNC_FREQUENCIES = [
  { value: "manual", label: "Manual only" },
  { value: "hourly", label: "Every hour" },
  { value: "daily", label: "Daily at midnight" },
];

const COLUMN_PREVIEW = [
  { sheet: "Date", expense: "date" },
  { sheet: "Description", expense: "description" },
  { sheet: "Amount", expense: "amount" },
  { sheet: "Currency", expense: "currency" },
  { sheet: "Category", expense: "category" },
  { sheet: "Payment Method", expense: "payment_method" },
  { sheet: "Tags", expense: "tags" },
  { sheet: "Notes", expense: "notes" },
];

export function GoogleSheetsConfig({ onClose }: GoogleSheetsConfigProps) {
  const [connected, setConnected] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [syncFrequency, setSyncFrequency] = useState("daily");
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  function handleConnect() {
    // Simulate OAuth
    setTimeout(() => {
      setConnected(true);
      toast.success("Google account connected");
    }, 1000);
  }

  async function handleSync() {
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 2000));
    setSyncing(false);
    setLastSynced(new Date().toISOString());
    toast.success("Expenses synced to Google Sheets");
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500 text-white">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            Google Sheets Configuration
          </h3>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {/* Step 1: Connect */}
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                1. Connect Google Account
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Authorize ExpenseFlow to access your Google Sheets
              </p>
            </div>
            {connected ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                <Check className="h-3.5 w-3.5" />
                Connected
              </span>
            ) : (
              <button
                onClick={handleConnect}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Connect with Google
              </button>
            )}
          </div>
        </div>

        {/* Step 2: Select/create spreadsheet */}
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-foreground">
            2. Select Spreadsheet
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Choose an existing spreadsheet or create a new one
          </p>
          <div className="mt-2 flex gap-2">
            <select
              value={selectedSheet}
              onChange={(e) => setSelectedSheet(e.target.value)}
              disabled={!connected}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select a spreadsheet...</option>
              <option value="existing_1">ExpenseFlow - Expenses 2026</option>
              <option value="existing_2">Monthly Budget Tracker</option>
              <option value="new">+ Create new spreadsheet</option>
            </select>
            {selectedSheet && (
              <button className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
                <ExternalLink className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Column mapping */}
        {selectedSheet && (
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-medium text-foreground">
              3. Column Mapping
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Preview of how data will be mapped to spreadsheet columns
            </p>
            <div className="mt-3 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Sheet Column
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      ExpenseFlow Field
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {COLUMN_PREVIEW.map((col) => (
                    <tr key={col.expense}>
                      <td className="px-3 py-2 text-foreground">
                        {col.sheet}
                      </td>
                      <td className="px-3 py-2">
                        <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
                          {col.expense}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sync frequency */}
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-foreground">
            {selectedSheet ? "4." : "3."} Sync Frequency
          </p>
          <div className="mt-2 flex gap-2">
            {SYNC_FREQUENCIES.map((freq) => (
              <button
                key={freq.value}
                onClick={() => setSyncFrequency(freq.value)}
                disabled={!connected}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                  syncFrequency === freq.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground hover:bg-accent"
                }`}
              >
                {freq.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sync controls */}
        {connected && (
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {lastSynced
                ? `Last synced ${new Date(lastSynced).toLocaleString()}`
                : "Not synced yet"}
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
              />
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
