"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Plus,
  Edit3,
  Trash2,
  X,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";

interface TeamPolicy {
  id: string;
  name: string;
  maxAmount: number | null;
  allowedCategories: string[];
  receiptRequiredAbove: number | null;
  autoFlagRules: string[];
  appliesTo: string[];
  enabled: boolean;
}

interface PolicyViolation {
  id: string;
  policyName: string;
  expenseId: string;
  user: string;
  violation: string;
  timestamp: string;
}

const ALL_CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Travel",
  "Entertainment",
  "Shopping",
  "Utilities",
  "Healthcare",
  "Education",
  "Office Supplies",
  "Software",
];

const MOCK_POLICIES: TeamPolicy[] = [
  {
    id: "tp_1",
    name: "General Spending Policy",
    maxAmount: 50000,
    allowedCategories: ALL_CATEGORIES,
    receiptRequiredAbove: 500,
    autoFlagRules: ["Amount above 25,000", "Duplicate within 24h"],
    appliesTo: ["member", "viewer"],
    enabled: true,
  },
  {
    id: "tp_2",
    name: "Entertainment Policy",
    maxAmount: 10000,
    allowedCategories: ["Entertainment", "Food & Dining"],
    receiptRequiredAbove: 1000,
    autoFlagRules: ["Weekend expense"],
    appliesTo: ["member"],
    enabled: true,
  },
];

const MOCK_VIOLATIONS: PolicyViolation[] = [
  {
    id: "v_1",
    policyName: "General Spending Policy",
    expenseId: "EXP-1230",
    user: "Vikram Singh",
    violation: "Expense of 30,000 INR exceeds auto-flag threshold of 25,000",
    timestamp: "2026-03-30T07:00:00Z",
  },
  {
    id: "v_2",
    policyName: "General Spending Policy",
    expenseId: "EXP-1228",
    user: "Rajesh Kumar",
    violation: "Missing receipt for expense of 1,200 INR (required above 500)",
    timestamp: "2026-03-29T15:30:00Z",
  },
  {
    id: "v_3",
    policyName: "Entertainment Policy",
    expenseId: "EXP-1225",
    user: "Sneha Reddy",
    violation: "Entertainment expense on weekend flagged for review",
    timestamp: "2026-03-28T20:00:00Z",
  },
];

export function TeamPolicies() {
  const [policies, setPolicies] = useState<TeamPolicy[]>(MOCK_POLICIES);
  const [violations] = useState<PolicyViolation[]>(MOCK_VIOLATIONS);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formMaxAmount, setFormMaxAmount] = useState("");
  const [formCategories, setFormCategories] = useState<string[]>(ALL_CATEGORIES);
  const [formReceiptAbove, setFormReceiptAbove] = useState("");
  const [formAppliesTo, setFormAppliesTo] = useState<string[]>(["member", "viewer"]);

  function openForm(policy?: TeamPolicy) {
    if (policy) {
      setEditingId(policy.id);
      setFormName(policy.name);
      setFormMaxAmount(policy.maxAmount?.toString() ?? "");
      setFormCategories(policy.allowedCategories);
      setFormReceiptAbove(policy.receiptRequiredAbove?.toString() ?? "");
      setFormAppliesTo(policy.appliesTo);
    } else {
      setEditingId(null);
      setFormName("");
      setFormMaxAmount("");
      setFormCategories(ALL_CATEGORIES);
      setFormReceiptAbove("");
      setFormAppliesTo(["member", "viewer"]);
    }
    setShowForm(true);
  }

  function handleSavePolicy(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Enter a policy name");
      return;
    }

    const policy: TeamPolicy = {
      id: editingId ?? `tp_${Date.now()}`,
      name: formName,
      maxAmount: formMaxAmount ? parseInt(formMaxAmount) : null,
      allowedCategories: formCategories,
      receiptRequiredAbove: formReceiptAbove
        ? parseInt(formReceiptAbove)
        : null,
      autoFlagRules: [],
      appliesTo: formAppliesTo,
      enabled: true,
    };

    if (editingId) {
      setPolicies((prev) =>
        prev.map((p) => (p.id === editingId ? policy : p))
      );
      toast.success("Policy updated");
    } else {
      setPolicies((prev) => [...prev, policy]);
      toast.success("Policy created");
    }
    setShowForm(false);
  }

  function togglePolicy(id: string) {
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  }

  function deletePolicy(id: string) {
    setPolicies((prev) => prev.filter((p) => p.id !== id));
    toast.success("Policy deleted");
  }

  return (
    <div className="space-y-6">
      {/* Policy form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">
              {editingId ? "Edit Team Policy" : "Create Team Policy"}
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSavePolicy} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Policy Name
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., General Spending Policy"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Max Amount per Expense (INR)
              </label>
              <input
                type="number"
                value={formMaxAmount}
                onChange={(e) => setFormMaxAmount(e.target.value)}
                placeholder="Leave empty for no limit"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Allowed Categories
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {ALL_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() =>
                      setFormCategories((prev) =>
                        prev.includes(cat)
                          ? prev.filter((c) => c !== cat)
                          : [...prev, cat]
                      )
                    }
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      formCategories.includes(cat)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Receipt Required Above (INR)
              </label>
              <input
                type="number"
                value={formReceiptAbove}
                onChange={(e) => setFormReceiptAbove(e.target.value)}
                placeholder="Leave empty to not require receipts"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Applies To
              </label>
              <div className="mt-1.5 flex gap-2">
                {["member", "viewer"].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() =>
                      setFormAppliesTo((prev) =>
                        prev.includes(role)
                          ? prev.filter((r) => r !== role)
                          : [...prev, role]
                      )
                    }
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      formAppliesTo.includes(role)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground hover:bg-accent"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {editingId ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Policy list */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            Team Policies ({policies.length})
          </h3>
          <button
            onClick={() => openForm()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            New Policy
          </button>
        </div>
        <div className="divide-y divide-border">
          {policies.map((policy) => (
            <div key={policy.id} className="flex items-center gap-4 px-4 py-3">
              <button
                onClick={() => togglePolicy(policy.id)}
                title={policy.enabled ? "Disable" : "Enable"}
              >
                {policy.enabled ? (
                  <ToggleRight className="h-5 w-5 text-primary" />
                ) : (
                  <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {policy.name}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {policy.maxAmount && (
                    <span>Max: {policy.maxAmount.toLocaleString()} INR</span>
                  )}
                  {policy.receiptRequiredAbove && (
                    <span>
                      Receipt above: {policy.receiptRequiredAbove.toLocaleString()} INR
                    </span>
                  )}
                  <span>
                    Applies to: {policy.appliesTo.join(", ")}
                  </span>
                </div>
              </div>
              <button
                onClick={() => openForm(policy)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => deletePolicy(policy.id)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Violations log */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            Policy Violations
          </h3>
        </div>
        <div className="divide-y divide-border">
          {violations.map((v) => (
            <div key={v.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">{v.violation}</p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{v.user}</span>
                  <span>{v.expenseId}</span>
                  <span>{v.policyName}</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(v.timestamp).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
