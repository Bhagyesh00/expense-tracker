"use client";

import { useState } from "react";
import {
  Plug,
  Check,
  X,
  Copy,
  Plus,
  Key,
  Webhook,
  FileSpreadsheet,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { WebhookForm } from "@/components/integrations/webhook-form";
import { WebhookDeliveries } from "@/components/integrations/webhook-deliveries";
import { ApiKeyManager } from "@/components/integrations/api-key-manager";
import { GoogleSheetsConfig } from "@/components/integrations/google-sheets-config";
import { AccountingExport } from "@/components/integrations/accounting-export";
import { SlackConfig } from "@/components/integrations/slack-config";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  connected: boolean;
  color: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: "google-sheets",
    name: "Google Sheets",
    description: "Auto-sync expenses to a Google Spreadsheet",
    icon: "sheets",
    connected: false,
    color: "bg-green-500",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Get expense notifications in your Slack channels",
    icon: "slack",
    connected: true,
    color: "bg-purple-600",
  },
  {
    id: "ms-teams",
    name: "Microsoft Teams",
    description: "Receive alerts and summaries in Teams channels",
    icon: "teams",
    connected: false,
    color: "bg-blue-600",
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    description: "Export expenses directly to QuickBooks Online",
    icon: "quickbooks",
    connected: false,
    color: "bg-green-600",
  },
  {
    id: "xero",
    name: "Xero",
    description: "Sync expenses and invoices with Xero",
    icon: "xero",
    connected: false,
    color: "bg-sky-500",
  },
  {
    id: "zoho-books",
    name: "Zoho Books",
    description: "Push expense data to Zoho Books for accounting",
    icon: "zoho",
    connected: false,
    color: "bg-red-500",
  },
];

type ActivePanel =
  | null
  | "google-sheets"
  | "slack"
  | "ms-teams"
  | "accounting"
  | "webhooks"
  | "api-keys";

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState(INTEGRATIONS);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [showWebhookForm, setShowWebhookForm] = useState(false);

  function toggleConnection(id: string) {
    setIntegrations((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          const next = { ...i, connected: !i.connected };
          if (next.connected) {
            toast.success(`Connected to ${i.name}`);
            if (["google-sheets", "slack", "ms-teams"].includes(id)) {
              setActivePanel(id as ActivePanel);
            }
          } else {
            toast.info(`Disconnected from ${i.name}`);
            if (activePanel === id) setActivePanel(null);
          }
          return next;
        }
        return i;
      })
    );
  }

  function getIconElement(icon: string, color: string) {
    const base = `flex h-10 w-10 items-center justify-center rounded-lg text-white ${color}`;
    switch (icon) {
      case "sheets":
        return (
          <div className={base}>
            <FileSpreadsheet className="h-5 w-5" />
          </div>
        );
      case "slack":
        return (
          <div className={base}>
            <MessageSquare className="h-5 w-5" />
          </div>
        );
      case "teams":
        return (
          <div className={base}>
            <MessageSquare className="h-5 w-5" />
          </div>
        );
      default:
        return (
          <div className={base}>
            <Plug className="h-5 w-5" />
          </div>
        );
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Integrations
        </h1>
        <p className="mt-1 text-muted-foreground">
          Connect ExpenseFlow with the tools you already use
        </p>
      </div>

      {/* Integration Cards Grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Available Integrations
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                {getIconElement(integration.icon, integration.color)}
                {integration.connected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <Check className="h-3 w-3" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Disconnected
                  </span>
                )}
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                {integration.name}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {integration.description}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => toggleConnection(integration.id)}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    integration.connected
                      ? "border border-border bg-background text-foreground hover:bg-destructive/10 hover:text-destructive"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {integration.connected ? "Disconnect" : "Connect"}
                </button>
                {integration.connected && (
                  <button
                    onClick={() =>
                      setActivePanel(integration.id as ActivePanel)
                    }
                    className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    Configure
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration Panels */}
      {activePanel === "google-sheets" && (
        <GoogleSheetsConfig onClose={() => setActivePanel(null)} />
      )}
      {(activePanel === "slack" || activePanel === "ms-teams") && (
        <SlackConfig
          provider={activePanel === "slack" ? "slack" : "teams"}
          onClose={() => setActivePanel(null)}
        />
      )}
      {activePanel === "accounting" && (
        <AccountingExport onClose={() => setActivePanel(null)} />
      )}

      {/* API Keys Section */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">API Keys</h2>
          </div>
          <button
            onClick={() =>
              setActivePanel(activePanel === "api-keys" ? null : "api-keys")
            }
            className="text-sm font-medium text-primary hover:underline"
          >
            {activePanel === "api-keys" ? "Collapse" : "Manage"}
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate API keys for programmatic access to your ExpenseFlow data
        </p>
        {activePanel === "api-keys" && <ApiKeyManager />}
      </div>

      {/* Webhooks Section */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Webhooks</h2>
          </div>
          <button
            onClick={() => setShowWebhookForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Webhook
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Receive real-time HTTP callbacks when events occur in your account
        </p>
        {showWebhookForm && (
          <div className="mt-4">
            <WebhookForm onClose={() => setShowWebhookForm(false)} />
          </div>
        )}
        <div className="mt-4">
          <WebhookDeliveries />
        </div>
      </div>

      {/* Accounting Export */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">
              Accounting Export
            </h2>
          </div>
          <button
            onClick={() =>
              setActivePanel(
                activePanel === "accounting" ? null : "accounting"
              )
            }
            className="text-sm font-medium text-primary hover:underline"
          >
            {activePanel === "accounting" ? "Collapse" : "Open"}
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Export expenses in formats compatible with accounting software
        </p>
      </div>
    </div>
  );
}
