"use client";

import { useState } from "react";
import {
  ScrollText,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  Search,
} from "lucide-react";
import { toast } from "sonner";

interface AuditEntry {
  id: string;
  action: string;
  actionType: "create" | "update" | "delete" | "auth" | "config";
  user: string;
  timestamp: string;
  details: string;
  diff?: { field: string; from: string; to: string }[];
}

const MOCK_ENTRIES: AuditEntry[] = [
  {
    id: "aud_1",
    action: "Expense approved",
    actionType: "update",
    user: "Priya Sharma",
    timestamp: "2026-03-30T10:30:00Z",
    details: "Approved EXP-1234 (Client dinner, 15,000 INR)",
    diff: [
      { field: "status", from: "pending", to: "approved" },
      { field: "approved_by", from: "-", to: "Priya Sharma" },
    ],
  },
  {
    id: "aud_2",
    action: "Policy updated",
    actionType: "config",
    user: "Priya Sharma",
    timestamp: "2026-03-30T09:15:00Z",
    details: "Updated General Spending Policy",
    diff: [
      {
        field: "max_amount",
        from: "25,000 INR",
        to: "50,000 INR",
      },
      {
        field: "receipt_required_above",
        from: "1,000 INR",
        to: "500 INR",
      },
    ],
  },
  {
    id: "aud_3",
    action: "Member added",
    actionType: "create",
    user: "Admin",
    timestamp: "2026-03-30T08:00:00Z",
    details: "Rajesh Kumar joined workspace as Member",
  },
  {
    id: "aud_4",
    action: "SSO enabled",
    actionType: "config",
    user: "Admin",
    timestamp: "2026-03-29T16:00:00Z",
    details: "Enabled Okta SSO for workspace",
    diff: [{ field: "sso_enabled", from: "false", to: "true" }],
  },
  {
    id: "aud_5",
    action: "Expense deleted",
    actionType: "delete",
    user: "Vikram Singh",
    timestamp: "2026-03-29T14:30:00Z",
    details: "Deleted EXP-1220 (Duplicate entry, 500 INR)",
  },
  {
    id: "aud_6",
    action: "User login",
    actionType: "auth",
    user: "Sneha Reddy",
    timestamp: "2026-03-29T09:00:00Z",
    details: "Logged in via SSO (Okta)",
  },
  {
    id: "aud_7",
    action: "Budget created",
    actionType: "create",
    user: "Amit Patel",
    timestamp: "2026-03-28T11:00:00Z",
    details: "Created budget 'Q2 Marketing' with limit 200,000 INR",
  },
  {
    id: "aud_8",
    action: "Expense rejected",
    actionType: "update",
    user: "Priya Sharma",
    timestamp: "2026-03-28T10:00:00Z",
    details: "Rejected EXP-1218 - Missing receipt",
    diff: [
      { field: "status", from: "pending", to: "rejected" },
      { field: "rejection_reason", from: "-", to: "Missing receipt" },
    ],
  },
];

const ACTION_TYPE_COLORS: Record<string, string> = {
  create:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  update:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  auth: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  config:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

type FilterType = "all" | "create" | "update" | "delete" | "auth" | "config";

export function AuditLog() {
  const [entries] = useState(MOCK_ENTRIES);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = entries.filter((entry) => {
    if (filterType !== "all" && entry.actionType !== filterType) return false;
    if (
      searchQuery &&
      !entry.action.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !entry.user.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !entry.details.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    if (dateFrom && entry.timestamp < dateFrom) return false;
    if (dateTo && entry.timestamp > dateTo + "T23:59:59Z") return false;
    return true;
  });

  function handleExport() {
    const csv = [
      ["Timestamp", "Action", "Type", "User", "Details"].join(","),
      ...filtered.map((e) =>
        [
          new Date(e.timestamp).toISOString(),
          `"${e.action}"`,
          e.actionType,
          `"${e.user}"`,
          `"${e.details}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Audit log exported as CSV");
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit log..."
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Action type filters */}
      <div className="flex gap-1.5">
        {(
          ["all", "create", "update", "delete", "auth", "config"] as const
        ).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              filterType === type
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Log entries */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            Audit Log ({filtered.length} entries)
          </h3>
        </div>
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <ScrollText className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              No matching audit entries
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((entry) => (
              <div key={entry.id}>
                <div
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
                  onClick={() =>
                    setExpandedId(
                      expandedId === entry.id ? null : entry.id
                    )
                  }
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {entry.action}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${ACTION_TYPE_COLORS[entry.actionType]}`}
                      >
                        {entry.actionType}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {entry.details}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-foreground">
                      {entry.user}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {entry.diff && (
                    <>
                      {expandedId === entry.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </>
                  )}
                </div>

                {expandedId === entry.id && entry.diff && (
                  <div className="border-t border-border bg-muted/30 px-4 py-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Changes
                    </p>
                    <div className="space-y-1.5">
                      {entry.diff.map((d, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs"
                        >
                          <code className="font-medium text-foreground">
                            {d.field}
                          </code>
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700 line-through dark:bg-red-900/30 dark:text-red-400">
                            {d.from}
                          </span>
                          <span className="text-muted-foreground">&rarr;</span>
                          <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            {d.to}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
