"use client";

import { useState } from "react";
import {
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Key,
  AlertTriangle,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsed: string | null;
  expires: string;
  createdAt: string;
}

const SCOPES = [
  { id: "expenses:read", label: "Read Expenses" },
  { id: "expenses:write", label: "Write Expenses" },
  { id: "budgets:read", label: "Read Budgets" },
  { id: "budgets:write", label: "Write Budgets" },
  { id: "reports:read", label: "Read Reports" },
  { id: "contacts:read", label: "Read Contacts" },
  { id: "contacts:write", label: "Write Contacts" },
];

const EXPIRY_OPTIONS = [
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "180d", label: "180 days" },
  { value: "1y", label: "1 year" },
  { value: "never", label: "Never" },
];

const MOCK_KEYS: ApiKey[] = [
  {
    id: "key_1",
    name: "Production App",
    prefix: "ef_live_a1",
    scopes: ["expenses:read", "expenses:write", "reports:read"],
    lastUsed: "2026-03-30T08:00:00Z",
    expires: "2026-12-31T00:00:00Z",
    createdAt: "2026-01-15T00:00:00Z",
  },
  {
    id: "key_2",
    name: "CI/CD Pipeline",
    prefix: "ef_live_b2",
    scopes: ["expenses:read", "reports:read"],
    lastUsed: null,
    expires: "2026-06-30T00:00:00Z",
    createdAt: "2026-03-01T00:00:00Z",
  },
];

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>(MOCK_KEYS);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState<string | null>(
    null
  );
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newScopes, setNewScopes] = useState<string[]>([]);
  const [newExpiry, setNewExpiry] = useState("90d");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || newScopes.length === 0) {
      toast.error("Enter a name and select at least one scope");
      return;
    }
    const fullKey = `ef_live_${crypto.randomUUID().replace(/-/g, "")}`;
    const prefix = fullKey.substring(0, 10);
    const newApiKey: ApiKey = {
      id: `key_${Date.now()}`,
      name: newName,
      prefix,
      scopes: newScopes,
      lastUsed: null,
      expires:
        newExpiry === "never"
          ? "Never"
          : new Date(
              Date.now() +
                parseInt(newExpiry) *
                  (newExpiry.endsWith("y") ? 365 : 1) *
                  24 *
                  60 *
                  60 *
                  1000
            ).toISOString(),
      createdAt: new Date().toISOString(),
    };
    setKeys((prev) => [newApiKey, ...prev]);
    setNewKeyResult(fullKey);
    toast.success("API key generated");
  }

  function handleRevoke(id: string) {
    setKeys((prev) => prev.filter((k) => k.id !== id));
    setShowRevokeConfirm(null);
    toast.success("API key revoked");
  }

  function copyKey() {
    if (newKeyResult) {
      navigator.clipboard.writeText(newKeyResult);
      toast.success("API key copied to clipboard");
    }
  }

  function resetCreateForm() {
    setNewName("");
    setNewScopes([]);
    setNewExpiry("90d");
    setNewKeyResult(null);
    setShowKey(false);
    setShowCreateDialog(false);
  }

  function toggleScope(id: string) {
    setNewScopes((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Key list */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            Active API Keys
          </h3>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Generate Key
          </button>
        </div>
        {keys.length === 0 ? (
          <div className="p-8 text-center">
            <Key className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              No API keys yet
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center gap-4 px-4 py-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Key className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {key.name}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <code className="text-xs text-muted-foreground">
                      {key.prefix}...
                    </code>
                    <span className="text-xs text-muted-foreground">
                      {key.scopes.length} scope
                      {key.scopes.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {key.lastUsed
                        ? `Last used ${new Date(key.lastUsed).toLocaleDateString()}`
                        : "Never used"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Expires{" "}
                      {key.expires === "Never"
                        ? "never"
                        : new Date(key.expires).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {showRevokeConfirm === key.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-destructive">Revoke?</span>
                    <button
                      onClick={() => handleRevoke(key.id)}
                      className="rounded-md bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/90"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setShowRevokeConfirm(null)}
                      className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-accent"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowRevokeConfirm(key.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Revoke key"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">
                {newKeyResult ? "API Key Generated" : "Generate API Key"}
              </h3>
              <button
                onClick={resetCreateForm}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {newKeyResult ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-700 dark:bg-yellow-900/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                      Copy this key now. You will not be able to see it again.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground">
                    {showKey ? newKeyResult : newKeyResult.substring(0, 10) + "*".repeat(30)}
                  </code>
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="rounded-md p-2 text-muted-foreground hover:bg-accent"
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={copyKey}
                    className="rounded-md p-2 text-muted-foreground hover:bg-accent"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={resetCreateForm}
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Key Name
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Production Server"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Scopes
                  </label>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    {SCOPES.map((scope) => (
                      <label
                        key={scope.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-accent"
                      >
                        <input
                          type="checkbox"
                          checked={newScopes.includes(scope.id)}
                          onChange={() => toggleScope(scope.id)}
                          className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-xs text-foreground">
                          {scope.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Expiry
                  </label>
                  <select
                    value={newExpiry}
                    onChange={(e) => setNewExpiry(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {EXPIRY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetCreateForm}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Generate
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
