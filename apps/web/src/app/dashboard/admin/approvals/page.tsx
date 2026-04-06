"use client";

import { useState } from "react";
import {
  FileCheck,
  Plus,
  ShieldCheck,
  ScrollText,
} from "lucide-react";
import { ApprovalPolicyForm } from "@/components/admin/approval-policy-form";
import { ApprovalQueue } from "@/components/admin/approval-queue";
import { TeamPolicies } from "@/components/admin/team-policies";
import { AuditLog } from "@/components/admin/audit-log";

type ActiveTab = "policies" | "queue" | "team" | "audit";

interface ApprovalPolicy {
  id: string;
  name: string;
  conditions: string;
  approvers: string[];
  requireAll: boolean;
  autoApproveBelow: number | null;
  createdAt: string;
}

const MOCK_POLICIES: ApprovalPolicy[] = [
  {
    id: "pol_1",
    name: "High-value Expense Approval",
    conditions: "Amount above 10,000 INR",
    approvers: ["Priya Sharma", "Amit Patel"],
    requireAll: false,
    autoApproveBelow: 5000,
    createdAt: "2026-02-15",
  },
  {
    id: "pol_2",
    name: "Travel Expense Review",
    conditions: "Category: Travel, Transportation",
    approvers: ["Priya Sharma"],
    requireAll: true,
    autoApproveBelow: null,
    createdAt: "2026-01-20",
  },
];

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("queue");
  const [policies, setPolicies] = useState(MOCK_POLICIES);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<ApprovalPolicy | null>(
    null
  );

  const tabs = [
    { id: "queue" as const, label: "Pending Approvals", icon: FileCheck, badge: "5" },
    { id: "policies" as const, label: "Approval Policies", icon: FileCheck },
    { id: "team" as const, label: "Team Policies", icon: ShieldCheck },
    { id: "audit" as const, label: "Audit Log", icon: ScrollText },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Approvals & Policies
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage approval workflows, team policies, and audit trail
          </p>
        </div>
        {(activeTab === "policies" || activeTab === "team") && (
          <button
            onClick={() => setShowPolicyForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            {activeTab === "policies" ? "New Approval Policy" : "New Team Policy"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.badge && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs ${
                    activeTab === tab.id
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "queue" && <ApprovalQueue />}

      {activeTab === "policies" && (
        <div className="space-y-4">
          {showPolicyForm && (
            <ApprovalPolicyForm
              onClose={() => {
                setShowPolicyForm(false);
                setEditingPolicy(null);
              }}
              onSave={(policy) => {
                if (editingPolicy) {
                  setPolicies((prev) =>
                    prev.map((p) => (p.id === editingPolicy.id ? { ...p, ...policy } : p))
                  );
                } else {
                  setPolicies((prev) => [
                    { ...policy, id: `pol_${Date.now()}`, createdAt: new Date().toISOString() } as ApprovalPolicy,
                    ...prev,
                  ]);
                }
                setShowPolicyForm(false);
                setEditingPolicy(null);
              }}
              initialData={editingPolicy}
            />
          )}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">
                Approval Policies ({policies.length})
              </h3>
            </div>
            <div className="divide-y divide-border">
              {policies.map((policy) => (
                <div key={policy.id} className="flex items-center gap-4 px-4 py-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <FileCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {policy.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {policy.conditions}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        Approvers: {policy.approvers.join(", ")}
                      </span>
                      <span>
                        {policy.requireAll ? "All required" : "Any one"}
                      </span>
                      {policy.autoApproveBelow && (
                        <span>Auto-approve below {policy.autoApproveBelow.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingPolicy(policy);
                      setShowPolicyForm(true);
                    }}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "team" && <TeamPolicies />}
      {activeTab === "audit" && <AuditLog />}
    </div>
  );
}
