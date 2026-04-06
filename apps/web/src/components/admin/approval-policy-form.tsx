"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ApprovalPolicyFormProps {
  onClose: () => void;
  onSave: (policy: {
    name: string;
    conditions: string;
    approvers: string[];
    requireAll: boolean;
    autoApproveBelow: number | null;
  }) => void;
  initialData?: {
    name: string;
    conditions: string;
    approvers: string[];
    requireAll: boolean;
    autoApproveBelow: number | null;
  } | null;
}

const CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Travel",
  "Entertainment",
  "Shopping",
  "Utilities",
  "Healthcare",
  "Education",
  "Other",
];

const WORKSPACE_MEMBERS = [
  "Priya Sharma",
  "Amit Patel",
  "Rajesh Kumar",
  "Sneha Reddy",
  "Vikram Singh",
  "Anita Desai",
];

type ConditionType = "amount" | "category" | "user";

export function ApprovalPolicyForm({
  onClose,
  onSave,
  initialData,
}: ApprovalPolicyFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [conditionType, setConditionType] = useState<ConditionType>("amount");
  const [amountThreshold, setAmountThreshold] = useState("10000");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [approvers, setApprovers] = useState<string[]>(
    initialData?.approvers ?? []
  );
  const [requireAll, setRequireAll] = useState(initialData?.requireAll ?? false);
  const [autoApproveEnabled, setAutoApproveEnabled] = useState(
    initialData?.autoApproveBelow != null
  );
  const [autoApproveAmount, setAutoApproveAmount] = useState(
    initialData?.autoApproveBelow?.toString() ?? "5000"
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Enter a policy name");
      return;
    }
    if (approvers.length === 0) {
      toast.error("Select at least one approver");
      return;
    }

    let conditions = "";
    if (conditionType === "amount") {
      conditions = `Amount above ${parseInt(amountThreshold).toLocaleString()} INR`;
    } else if (conditionType === "category") {
      conditions = `Category: ${selectedCategories.join(", ")}`;
    } else {
      conditions = `Users: ${selectedUsers.join(", ")}`;
    }

    onSave({
      name,
      conditions,
      approvers,
      requireAll,
      autoApproveBelow: autoApproveEnabled
        ? parseInt(autoApproveAmount)
        : null,
    });
    toast.success(initialData ? "Policy updated" : "Policy created");
  }

  function toggleApprover(member: string) {
    setApprovers((prev) =>
      prev.includes(member)
        ? prev.filter((a) => a !== member)
        : [...prev, member]
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          {initialData ? "Edit Approval Policy" : "Create Approval Policy"}
        </h3>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Policy name */}
        <div>
          <label className="block text-sm font-medium text-foreground">
            Policy Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., High-value Expense Approval"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Conditions */}
        <div>
          <label className="block text-sm font-medium text-foreground">
            Condition
          </label>
          <div className="mt-2 flex gap-2">
            {(["amount", "category", "user"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setConditionType(type)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  conditionType === type
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground hover:bg-accent"
                }`}
              >
                {type === "amount"
                  ? "Amount above"
                  : type === "category"
                    ? "Specific categories"
                    : "Specific users"}
              </button>
            ))}
          </div>

          {conditionType === "amount" && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Amount above
                </span>
                <input
                  type="number"
                  value={amountThreshold}
                  onChange={(e) => setAmountThreshold(e.target.value)}
                  className="w-32 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-sm text-muted-foreground">INR</span>
              </div>
            </div>
          )}

          {conditionType === "category" && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() =>
                    setSelectedCategories((prev) =>
                      prev.includes(cat)
                        ? prev.filter((c) => c !== cat)
                        : [...prev, cat]
                    )
                  }
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    selectedCategories.includes(cat)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {conditionType === "user" && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {WORKSPACE_MEMBERS.map((member) => (
                <button
                  key={member}
                  type="button"
                  onClick={() =>
                    setSelectedUsers((prev) =>
                      prev.includes(member)
                        ? prev.filter((u) => u !== member)
                        : [...prev, member]
                    )
                  }
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    selectedUsers.includes(member)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {member}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Approvers */}
        <div>
          <label className="block text-sm font-medium text-foreground">
            Approvers
          </label>
          <div className="mt-2 space-y-1.5">
            {WORKSPACE_MEMBERS.map((member) => (
              <label
                key={member}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={approvers.includes(member)}
                  onChange={() => toggleApprover(member)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">{member}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Approval mode */}
        <div>
          <label className="block text-sm font-medium text-foreground">
            Approval Mode
          </label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setRequireAll(false)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                !requireAll
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-foreground hover:bg-accent"
              }`}
            >
              Any one approver
            </button>
            <button
              type="button"
              onClick={() => setRequireAll(true)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                requireAll
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-foreground hover:bg-accent"
              }`}
            >
              All approvers required
            </button>
          </div>
        </div>

        {/* Auto-approve */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoApproveEnabled}
              onChange={(e) => setAutoApproveEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium text-foreground">
              Auto-approve below threshold
            </span>
          </label>
          {autoApproveEnabled && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Auto-approve below
              </span>
              <input
                type="number"
                value={autoApproveAmount}
                onChange={(e) => setAutoApproveAmount(e.target.value)}
                className="w-32 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground">INR</span>
            </div>
          )}
        </div>

        {/* Submit */}
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
            {initialData ? "Update Policy" : "Create Policy"}
          </button>
        </div>
      </form>
    </div>
  );
}
