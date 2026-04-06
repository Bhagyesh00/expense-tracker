"use client";

import { useState } from "react";
import {
  X,
  MessageSquare,
  Send,
  Check,
  Hash,
  Bell,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface SlackConfigProps {
  provider: "slack" | "teams";
  onClose: () => void;
}

const NOTIFICATION_EVENTS = [
  { id: "expense_added", label: "Expense added", description: "When a new expense is created" },
  { id: "budget_exceeded", label: "Budget exceeded", description: "When a budget limit is exceeded" },
  { id: "payment_due", label: "Payment due", description: "When a pending payment is due soon" },
  { id: "payment_settled", label: "Payment settled", description: "When a payment is marked as settled" },
  { id: "weekly_summary", label: "Weekly summary", description: "Weekly spending summary on Monday" },
  { id: "anomaly_detected", label: "Anomaly detected", description: "When unusual spending is detected" },
];

export function SlackConfig({ provider, onClose }: SlackConfigProps) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [connected, setConnected] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [enabledEvents, setEnabledEvents] = useState<string[]>([
    "expense_added",
    "budget_exceeded",
    "payment_due",
  ]);
  const [testing, setTesting] = useState(false);

  const isSlack = provider === "slack";
  const providerName = isSlack ? "Slack" : "Microsoft Teams";

  function handleConnect() {
    if (!webhookUrl.trim()) {
      toast.error("Enter a webhook URL");
      return;
    }
    setConnected(true);
    setChannelName(isSlack ? "#expense-notifications" : "Expense Alerts");
    toast.success(`Connected to ${providerName}`);
  }

  function toggleEvent(id: string) {
    setEnabledEvents((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  }

  async function handleTest() {
    setTesting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setTesting(false);
    toast.success(`Test notification sent to ${providerName}`);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-white ${isSlack ? "bg-purple-600" : "bg-blue-600"}`}
          >
            <MessageSquare className="h-4 w-4" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            {providerName} Configuration
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
        {/* Webhook URL */}
        <div>
          <label className="block text-sm font-medium text-foreground">
            {isSlack ? "Incoming Webhook URL" : "Incoming Webhook URL"}
          </label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isSlack
              ? "Create an incoming webhook in your Slack workspace settings"
              : "Create an incoming webhook connector in your Teams channel"}
          </p>
          <div className="mt-1.5 flex gap-2">
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder={
                isSlack
                  ? "https://hooks.slack.com/services/T.../B.../..."
                  : "https://outlook.office.com/webhook/..."
              }
              disabled={connected}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {!connected && (
              <button
                onClick={handleConnect}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Connect
              </button>
            )}
          </div>
        </div>

        {/* Channel display */}
        {connected && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 dark:bg-green-900/20">
            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
            <div className="flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                {channelName}
              </span>
            </div>
          </div>
        )}

        {/* Notification events */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Notification Events
          </label>
          <div className="mt-2 space-y-2">
            {NOTIFICATION_EVENTS.map((event) => (
              <label
                key={event.id}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-4 py-3 transition-colors hover:bg-accent"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {event.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.description}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={enabledEvents.includes(event.id)}
                  onChange={() => toggleEvent(event.id)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Adaptive card preview for Teams */}
        {!isSlack && connected && (
          <div>
            <p className="text-sm font-medium text-foreground">
              Adaptive Card Preview
            </p>
            <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white text-xs font-bold">
                  EF
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    ExpenseFlow Alert
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    New expense: Team Dinner - $45.00
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Category: Food & Dining
                  </p>
                  <div className="mt-2 flex gap-2">
                    <span className="rounded bg-blue-600 px-2 py-0.5 text-xs text-white">
                      View Details
                    </span>
                    <span className="rounded border border-blue-600 px-2 py-0.5 text-xs text-blue-600">
                      Dismiss
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test button */}
        {connected && (
          <div className="flex justify-end gap-2">
            <button
              onClick={handleTest}
              disabled={testing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {testing ? "Sending..." : "Send Test Notification"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
