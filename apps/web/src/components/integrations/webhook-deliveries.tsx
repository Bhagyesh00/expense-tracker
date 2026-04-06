"use client";

import { useState } from "react";
import {
  Check,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface Delivery {
  id: string;
  event: string;
  status: "success" | "failed";
  responseCode: number;
  timestamp: string;
  requestPayload: string;
  responseBody: string;
  duration: number;
}

const MOCK_DELIVERIES: Delivery[] = [
  {
    id: "del_1",
    event: "expense.created",
    status: "success",
    responseCode: 200,
    timestamp: "2026-03-30T10:15:00Z",
    duration: 234,
    requestPayload: JSON.stringify(
      {
        event: "expense.created",
        data: {
          id: "exp_abc123",
          amount: 1500,
          currency: "INR",
          category: "Food & Dining",
          description: "Team lunch",
        },
        timestamp: "2026-03-30T10:15:00Z",
      },
      null,
      2
    ),
    responseBody: JSON.stringify({ received: true }, null, 2),
  },
  {
    id: "del_2",
    event: "budget.exceeded",
    status: "failed",
    responseCode: 500,
    timestamp: "2026-03-30T09:45:00Z",
    duration: 5012,
    requestPayload: JSON.stringify(
      {
        event: "budget.exceeded",
        data: {
          budget_id: "bud_xyz",
          name: "Monthly Food",
          limit: 10000,
          spent: 10500,
        },
        timestamp: "2026-03-30T09:45:00Z",
      },
      null,
      2
    ),
    responseBody: "Internal Server Error",
  },
  {
    id: "del_3",
    event: "payment.settled",
    status: "success",
    responseCode: 200,
    timestamp: "2026-03-29T18:30:00Z",
    duration: 189,
    requestPayload: JSON.stringify(
      {
        event: "payment.settled",
        data: {
          id: "pay_def456",
          amount: 2500,
          payer: "Rahul",
          payee: "Priya",
        },
        timestamp: "2026-03-29T18:30:00Z",
      },
      null,
      2
    ),
    responseBody: JSON.stringify({ ok: true }, null, 2),
  },
  {
    id: "del_4",
    event: "expense.updated",
    status: "failed",
    responseCode: 0,
    timestamp: "2026-03-29T15:12:00Z",
    duration: 30000,
    requestPayload: JSON.stringify(
      {
        event: "expense.updated",
        data: { id: "exp_ghi789", amount: 800 },
      },
      null,
      2
    ),
    responseBody: "Connection timed out",
  },
];

export function WebhookDeliveries() {
  const [deliveries, setDeliveries] = useState(MOCK_DELIVERIES);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  async function handleRetry(id: string) {
    setRetrying(id);
    await new Promise((r) => setTimeout(r, 1500));
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, status: "success" as const, responseCode: 200 }
          : d
      )
    );
    setRetrying(null);
    toast.success("Webhook delivery retried successfully");
  }

  function formatTime(ts: string) {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (deliveries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          No webhook deliveries yet
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">
          Recent Deliveries
        </h3>
      </div>
      <div className="divide-y divide-border">
        {deliveries.map((delivery) => (
          <div key={delivery.id}>
            <div
              className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
              onClick={() =>
                setExpandedId(
                  expandedId === delivery.id ? null : delivery.id
                )
              }
            >
              {delivery.status === "success" ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                </span>
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <code className="text-xs font-medium text-foreground">
                  {delivery.event}
                </code>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  delivery.status === "success"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {delivery.responseCode || "Timeout"}
              </span>
              <span className="text-xs text-muted-foreground">
                {delivery.duration}ms
              </span>
              <span className="text-xs text-muted-foreground">
                {formatTime(delivery.timestamp)}
              </span>
              {delivery.status === "failed" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRetry(delivery.id);
                  }}
                  disabled={retrying === delivery.id}
                  className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                  title="Retry delivery"
                >
                  <RotateCcw
                    className={`h-3.5 w-3.5 ${retrying === delivery.id ? "animate-spin" : ""}`}
                  />
                </button>
              )}
              {expandedId === delivery.id ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            {expandedId === delivery.id && (
              <div className="border-t border-border bg-muted/30 px-4 py-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Request Payload
                    </p>
                    <pre className="max-h-48 overflow-auto rounded-lg bg-background p-3 text-xs text-foreground">
                      {delivery.requestPayload}
                    </pre>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Response Body
                    </p>
                    <pre className="max-h-48 overflow-auto rounded-lg bg-background p-3 text-xs text-foreground">
                      {delivery.responseBody}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
