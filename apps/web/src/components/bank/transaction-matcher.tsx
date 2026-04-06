"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  X,
  Plus,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  bank: string;
}

interface PotentialMatch {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  confidence: number;
}

interface UnmatchedTransaction extends BankTransaction {
  matches: PotentialMatch[];
}

const MOCK_UNMATCHED: UnmatchedTransaction[] = [
  {
    id: "bt_1",
    date: "2026-03-29",
    description: "SWIGGY*ORDER 847293",
    amount: -456,
    currency: "INR",
    bank: "HDFC Bank",
    matches: [
      {
        id: "exp_101",
        description: "Swiggy Food Delivery",
        amount: 456,
        category: "Food & Dining",
        date: "2026-03-29",
        confidence: 95,
      },
      {
        id: "exp_102",
        description: "Swiggy groceries",
        amount: 460,
        category: "Groceries",
        date: "2026-03-28",
        confidence: 42,
      },
    ],
  },
  {
    id: "bt_2",
    date: "2026-03-28",
    description: "UBER TRIP MAR28 BANGALORE",
    amount: -289,
    currency: "INR",
    bank: "HDFC Bank",
    matches: [
      {
        id: "exp_201",
        description: "Uber ride to office",
        amount: 289,
        category: "Transportation",
        date: "2026-03-28",
        confidence: 98,
      },
    ],
  },
  {
    id: "bt_3",
    date: "2026-03-27",
    description: "AMAZON PAY IN*AMZ 9384721",
    amount: -1299,
    currency: "INR",
    bank: "ICICI Bank",
    matches: [],
  },
];

export function TransactionMatcher() {
  const [transactions, setTransactions] =
    useState<UnmatchedTransaction[]>(MOCK_UNMATCHED);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleMatch(transactionId: string, matchId: string) {
    setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
    toast.success("Transaction matched to expense");
  }

  function handleCreate(transactionId: string) {
    setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
    toast.success("New expense created from transaction");
  }

  function handleDismiss(transactionId: string) {
    setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
    toast.info("Transaction dismissed");
  }

  function handleBulkMatch() {
    const highConfidence = transactions.filter(
      (t) => t.matches.length > 0 && t.matches[0].confidence >= 90
    );
    if (highConfidence.length === 0) {
      toast.info("No high-confidence matches found");
      return;
    }
    setTransactions((prev) =>
      prev.filter(
        (t) =>
          !highConfidence.find((hc) => hc.id === t.id)
      )
    );
    toast.success(`Matched ${highConfidence.length} transactions automatically`);
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  }

  function getConfidenceColor(confidence: number) {
    if (confidence >= 90) return "text-green-600 dark:text-green-400";
    if (confidence >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <Check className="mx-auto h-8 w-8 text-green-500" />
        <p className="mt-2 text-sm font-medium text-foreground">
          All transactions matched
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          No unmatched bank transactions remaining
        </p>
      </div>
    );
  }

  const highConfidenceCount = transactions.filter(
    (t) => t.matches.length > 0 && t.matches[0].confidence >= 90
  ).length;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Unmatched Transactions ({transactions.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            Match bank transactions to existing expenses or create new ones
          </p>
        </div>
        {highConfidenceCount > 0 && (
          <button
            onClick={handleBulkMatch}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
          >
            <Zap className="h-3.5 w-3.5" />
            Auto-match {highConfidenceCount} high-confidence
          </button>
        )}
      </div>

      <div className="divide-y divide-border">
        {transactions.map((tx) => (
          <div key={tx.id}>
            <div
              className="flex cursor-pointer items-center gap-4 px-4 py-3 hover:bg-accent/50"
              onClick={() =>
                setExpandedId(expandedId === tx.id ? null : tx.id)
              }
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {tx.description}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{tx.bank}</span>
                  <span>{new Date(tx.date).toLocaleDateString()}</span>
                </div>
              </div>
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                -{formatCurrency(tx.amount)}
              </p>
              <span className="text-xs text-muted-foreground">
                {tx.matches.length} match
                {tx.matches.length !== 1 ? "es" : ""}
              </span>
              {expandedId === tx.id ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            {expandedId === tx.id && (
              <div className="border-t border-border bg-muted/30 p-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Bank transaction */}
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Bank Transaction
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {tx.description}
                    </p>
                    <p className="mt-1 text-sm font-bold text-foreground">
                      {formatCurrency(tx.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.date).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Matches */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Potential Matches
                    </p>
                    {tx.matches.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No matching expenses found
                      </p>
                    ) : (
                      tx.matches.map((match) => (
                        <div
                          key={match.id}
                          className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-foreground">
                              {match.description}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{match.category}</span>
                              <span>{formatCurrency(match.amount)}</span>
                            </div>
                          </div>
                          <span
                            className={`text-xs font-bold ${getConfidenceColor(match.confidence)}`}
                          >
                            {match.confidence}%
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMatch(tx.id, match.id);
                            }}
                            className="rounded-md bg-green-600 p-1.5 text-white hover:bg-green-700"
                            title="Match"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <button
                    onClick={() => handleDismiss(tx.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                  >
                    <X className="h-3 w-3" />
                    Dismiss
                  </button>
                  <button
                    onClick={() => handleCreate(tx.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="h-3 w-3" />
                    Create Expense
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
