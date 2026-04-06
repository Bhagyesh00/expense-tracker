"use client";

import { useState } from "react";
import {
  Landmark,
  Plus,
  RefreshCw,
  Upload,
  MessageSquareText,
  Check,
  AlertCircle,
  Clock,
  CreditCard,
  ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";
import { ConnectBankModal } from "@/components/bank/connect-bank-modal";
import { TransactionMatcher } from "@/components/bank/transaction-matcher";
import { StatementImport } from "@/components/bank/statement-import";
import { SmsRules } from "@/components/bank/sms-rules";

interface BankAccount {
  id: string;
  name: string;
  institution: string;
  accountNumber: string;
  type: "savings" | "current" | "credit";
  balance: number;
  currency: string;
  lastSynced: string | null;
  status: "connected" | "error" | "syncing";
}

const MOCK_ACCOUNTS: BankAccount[] = [
  {
    id: "ba_1",
    name: "HDFC Savings",
    institution: "HDFC Bank",
    accountNumber: "****4521",
    type: "savings",
    balance: 125430,
    currency: "INR",
    lastSynced: "2026-03-30T08:00:00Z",
    status: "connected",
  },
  {
    id: "ba_2",
    name: "ICICI Credit Card",
    institution: "ICICI Bank",
    accountNumber: "****8892",
    type: "credit",
    balance: -15600,
    currency: "INR",
    lastSynced: "2026-03-29T22:00:00Z",
    status: "connected",
  },
];

type ActiveSection = "matcher" | "import" | "sms" | null;

export default function BankSyncPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>(MOCK_ACCOUNTS);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  async function handleSync(id: string) {
    setSyncingId(id);
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "syncing" as const } : a))
    );
    await new Promise((r) => setTimeout(r, 2000));
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: "connected" as const,
              lastSynced: new Date().toISOString(),
            }
          : a
      )
    );
    setSyncingId(null);
    toast.success("Bank account synced successfully");
  }

  function handleAccountConnected(account: BankAccount) {
    setAccounts((prev) => [...prev, account]);
    setShowConnectModal(false);
    toast.success(`${account.name} connected`);
  }

  function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Bank Sync
          </h1>
          <p className="mt-1 text-muted-foreground">
            Connect bank accounts and automatically import transactions
          </p>
        </div>
        <button
          onClick={() => setShowConnectModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Connect Bank
        </button>
      </div>

      {/* Connected Accounts */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Connected Accounts
        </h2>
        {accounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <Landmark className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 text-sm font-semibold text-foreground">
              No bank accounts connected
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Connect a bank account to automatically import transactions
            </p>
            <button
              onClick={() => setShowConnectModal(true)}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Connect Your First Account
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      {account.type === "credit" ? (
                        <CreditCard className="h-5 w-5 text-primary" />
                      ) : (
                        <Landmark className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {account.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {account.institution} {account.accountNumber}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      account.status === "connected"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : account.status === "error"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }`}
                  >
                    {account.status === "connected" && (
                      <Check className="h-3 w-3" />
                    )}
                    {account.status === "error" && (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {account.status === "syncing" && (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    )}
                    {account.status}
                  </span>
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p
                      className={`text-lg font-bold ${account.balance < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}
                    >
                      {account.balance < 0 ? "-" : ""}
                      {formatCurrency(account.balance, account.currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {account.lastSynced
                          ? `Synced ${new Date(account.lastSynced).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" })}`
                          : "Never synced"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleSync(account.id)}
                      disabled={syncingId === account.id}
                      className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                      title="Sync now"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${syncingId === account.id ? "animate-spin" : ""}`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <button
          onClick={() =>
            setActiveSection(activeSection === "matcher" ? null : "matcher")
          }
          className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:shadow-md ${
            activeSection === "matcher"
              ? "border-primary bg-primary/5"
              : "border-border bg-card"
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <ArrowRightLeft className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Match Transactions
            </p>
            <p className="text-xs text-muted-foreground">
              3 unmatched transactions
            </p>
          </div>
        </button>

        <button
          onClick={() =>
            setActiveSection(activeSection === "import" ? null : "import")
          }
          className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:shadow-md ${
            activeSection === "import"
              ? "border-primary bg-primary/5"
              : "border-border bg-card"
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <Upload className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Import Statement
            </p>
            <p className="text-xs text-muted-foreground">
              Upload CSV, OFX, QIF, or PDF
            </p>
          </div>
        </button>

        <button
          onClick={() =>
            setActiveSection(activeSection === "sms" ? null : "sms")
          }
          className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:shadow-md ${
            activeSection === "sms"
              ? "border-primary bg-primary/5"
              : "border-border bg-card"
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <MessageSquareText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">SMS Rules</p>
            <p className="text-xs text-muted-foreground">
              Parse Indian bank SMS
            </p>
          </div>
        </button>
      </div>

      {/* Active Section */}
      {activeSection === "matcher" && <TransactionMatcher />}
      {activeSection === "import" && <StatementImport />}
      {activeSection === "sms" && <SmsRules />}

      {/* Connect Bank Modal */}
      {showConnectModal && (
        <ConnectBankModal
          onClose={() => setShowConnectModal(false)}
          onConnected={handleAccountConnected}
        />
      )}
    </div>
  );
}
