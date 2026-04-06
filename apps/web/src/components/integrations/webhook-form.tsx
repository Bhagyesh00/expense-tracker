"use client";

import { useState } from "react";
import { X, Copy, Send, Eye, EyeOff, Shield } from "lucide-react";
import { toast } from "sonner";

const WEBHOOK_EVENTS = [
  { id: "expense.created", label: "Expense Created", group: "Expenses" },
  { id: "expense.updated", label: "Expense Updated", group: "Expenses" },
  { id: "expense.deleted", label: "Expense Deleted", group: "Expenses" },
  { id: "payment.created", label: "Payment Created", group: "Payments" },
  { id: "payment.settled", label: "Payment Settled", group: "Payments" },
  { id: "budget.exceeded", label: "Budget Exceeded", group: "Budgets" },
];

interface WebhookFormProps {
  onClose: () => void;
  initialData?: {
    name: string;
    url: string;
    events: string[];
  };
}

export function WebhookForm({ onClose, initialData }: WebhookFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [url, setUrl] = useState(initialData?.url ?? "");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(
    initialData?.events ?? []
  );
  const [secret, setSecret] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [testing, setTesting] = useState(false);

  const isEditing = !!initialData;
  const grouped = WEBHOOK_EVENTS.reduce(
    (acc, e) => {
      if (!acc[e.group]) acc[e.group] = [];
      acc[e.group].push(e);
      return acc;
    },
    {} as Record<string, typeof WEBHOOK_EVENTS>
  );

  function toggleEvent(id: string) {
    setSelectedEvents((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim() || selectedEvents.length === 0) {
      toast.error("Please fill in all fields and select at least one event");
      return;
    }
    // Generate a secret on creation
    const generatedSecret = `whsec_${crypto.randomUUID().replace(/-/g, "")}`;
    setSecret(generatedSecret);
    toast.success(
      isEditing ? "Webhook updated" : "Webhook created successfully"
    );
  }

  async function handleTest() {
    if (!url.trim()) {
      toast.error("Enter a URL first");
      return;
    }
    setTesting(true);
    // Simulate test delivery
    await new Promise((r) => setTimeout(r, 1500));
    setTesting(false);
    toast.success("Test payload sent successfully");
  }

  function copySecret() {
    if (secret) {
      navigator.clipboard.writeText(secret);
      toast.success("Secret copied to clipboard");
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          {isEditing ? "Edit Webhook" : "Create Webhook"}
        </h3>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {secret ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Save your webhook secret now. It will not be shown again.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 rounded-md bg-white px-3 py-2 font-mono text-sm text-foreground dark:bg-black/30">
                {showSecret ? secret : "whsec_" + "*".repeat(32)}
              </code>
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="rounded-md p-2 text-muted-foreground hover:bg-accent"
              >
                {showSecret ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={copySecret}
                className="rounded-md p-2 text-muted-foreground hover:bg-accent"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production webhook"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Endpoint URL
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/webhooks"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {testing ? "Sending..." : "Test"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Events
            </label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Select events that will trigger this webhook
            </p>
            <div className="mt-2 space-y-3">
              {Object.entries(grouped).map(([group, events]) => (
                <div key={group}>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {group}
                  </p>
                  <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {events.map((event) => (
                      <label
                        key={event.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-accent"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(event.id)}
                          onChange={() => toggleEvent(event.id)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-xs text-foreground">
                          {event.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {isEditing ? "Update Webhook" : "Create Webhook"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
