"use client";

import { useState } from "react";
import {
  Check,
  X,
  Eye,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Receipt,
  User,
} from "lucide-react";
import { toast } from "sonner";

interface ApprovalRequest {
  id: string;
  expenseId: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  submitter: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  hasReceipt: boolean;
  comment?: string;
}

const MOCK_REQUESTS: ApprovalRequest[] = [
  {
    id: "apr_1",
    expenseId: "EXP-1234",
    description: "Client dinner at Taj Lands End",
    amount: 15000,
    currency: "INR",
    category: "Food & Dining",
    submitter: "Rajesh Kumar",
    submittedAt: "2026-03-30T08:00:00Z",
    status: "pending",
    hasReceipt: true,
  },
  {
    id: "apr_2",
    expenseId: "EXP-1235",
    description: "Flight to Delhi - Client meeting",
    amount: 8500,
    currency: "INR",
    category: "Travel",
    submitter: "Sneha Reddy",
    submittedAt: "2026-03-29T14:30:00Z",
    status: "pending",
    hasReceipt: true,
  },
  {
    id: "apr_3",
    expenseId: "EXP-1236",
    description: "Office supplies - Printer cartridges",
    amount: 3200,
    currency: "INR",
    category: "Office Supplies",
    submitter: "Vikram Singh",
    submittedAt: "2026-03-29T10:00:00Z",
    status: "pending",
    hasReceipt: false,
  },
  {
    id: "apr_4",
    expenseId: "EXP-1237",
    description: "Team building event",
    amount: 25000,
    currency: "INR",
    category: "Entertainment",
    submitter: "Anita Desai",
    submittedAt: "2026-03-28T16:00:00Z",
    status: "pending",
    hasReceipt: true,
  },
  {
    id: "apr_5",
    expenseId: "EXP-1238",
    description: "Software subscription - Annual",
    amount: 12000,
    currency: "INR",
    category: "Software",
    submitter: "Amit Patel",
    submittedAt: "2026-03-28T09:00:00Z",
    status: "pending",
    hasReceipt: true,
  },
];

type FilterStatus = "all" | "pending" | "approved" | "rejected";

export function ApprovalQueue() {
  const [requests, setRequests] = useState(MOCK_REQUESTS);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const filtered = requests.filter(
    (r) => filterStatus === "all" || r.status === filterStatus
  );

  function handleApprove(id: string) {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "approved" as const,
              comment: comment || undefined,
            }
          : r
      )
    );
    setComment("");
    setExpandedId(null);
    toast.success("Expense approved");
  }

  function handleReject(id: string) {
    if (!comment.trim()) {
      toast.error("Please add a comment explaining the rejection");
      return;
    }
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: "rejected" as const, comment } : r
      )
    );
    setComment("");
    setExpandedId(null);
    toast.success("Expense rejected");
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "approved":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "rejected":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {(["all", "pending", "approved", "rejected"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              filterStatus === status
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {status}
            {status !== "all" && (
              <span className="ml-1">
                ({requests.filter((r) => r.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Requests Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Check className="mx-auto h-8 w-8 text-green-500" />
            <p className="mt-2 text-sm font-medium text-foreground">
              No {filterStatus === "all" ? "" : filterStatus} approvals
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((request) => (
              <div key={request.id}>
                <div
                  className="flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/50"
                  onClick={() =>
                    setExpandedId(
                      expandedId === request.id ? null : request.id
                    )
                  }
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {request.description}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{request.submitter}</span>
                      <span>{request.expenseId}</span>
                      <span>{request.category}</span>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {formatCurrency(request.amount)}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusBadge(request.status)}`}
                  >
                    {request.status}
                  </span>
                  {request.hasReceipt && (
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(request.submittedAt).toLocaleDateString()}
                  </span>
                  {expandedId === request.id ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                {expandedId === request.id && (
                  <div className="border-t border-border bg-muted/30 px-4 py-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Expense Details
                        </h4>
                        <dl className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Amount</dt>
                            <dd className="font-medium text-foreground">
                              {formatCurrency(request.amount)}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Category</dt>
                            <dd className="text-foreground">
                              {request.category}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">
                              Submitted by
                            </dt>
                            <dd className="text-foreground">
                              {request.submitter}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Receipt</dt>
                            <dd className="text-foreground">
                              {request.hasReceipt ? "Attached" : "Missing"}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      {request.status === "pending" && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Action
                          </h4>
                          <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Add a comment (required for rejection)..."
                            rows={3}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(request.id)}
                              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                            >
                              <Check className="h-4 w-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                            >
                              <X className="h-4 w-4" />
                              Reject
                            </button>
                          </div>
                        </div>
                      )}

                      {request.comment && request.status !== "pending" && (
                        <div>
                          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Comment
                          </h4>
                          <p className="mt-1 text-sm text-foreground">
                            {request.comment}
                          </p>
                        </div>
                      )}
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
