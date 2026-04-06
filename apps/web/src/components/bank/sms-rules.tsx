"use client";

import { useState } from "react";
import {
  MessageSquareText,
  Plus,
  Check,
  X,
  Play,
  ToggleLeft,
  ToggleRight,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

interface SmsRule {
  id: string;
  name: string;
  bank: string;
  pattern: string;
  amountGroup: string;
  descriptionGroup: string;
  enabled: boolean;
  isCustom: boolean;
}

const PRECONFIGURED_RULES: SmsRule[] = [
  {
    id: "rule_hdfc",
    name: "HDFC Bank Debit",
    bank: "HDFC",
    pattern:
      "Rs\\.?(\\d+[\\.\\d]*) debited from a/c \\**(\\d{4}).* at (.+?)\\.",
    amountGroup: "$1",
    descriptionGroup: "$3",
    enabled: true,
    isCustom: false,
  },
  {
    id: "rule_sbi",
    name: "SBI Debit",
    bank: "SBI",
    pattern:
      "Rs\\.?(\\d+[\\.\\d]*) debited from your a/c (\\w+).* Ref (.+)",
    amountGroup: "$1",
    descriptionGroup: "$3",
    enabled: true,
    isCustom: false,
  },
  {
    id: "rule_icici",
    name: "ICICI Bank Debit",
    bank: "ICICI",
    pattern:
      "Acct (\\w+) debited with INR (\\d+[\\.\\d]*) .* Info: (.+?)\\.",
    amountGroup: "$2",
    descriptionGroup: "$3",
    enabled: false,
    isCustom: false,
  },
  {
    id: "rule_axis",
    name: "Axis Bank Debit",
    bank: "Axis",
    pattern:
      "INR (\\d+[\\.\\d]*) debited from A/c no.\\s*XX(\\d{4}).* at (.+)",
    amountGroup: "$1",
    descriptionGroup: "$3",
    enabled: false,
    isCustom: false,
  },
  {
    id: "rule_kotak",
    name: "Kotak Mahindra Debit",
    bank: "Kotak",
    pattern:
      "Rs\\.(\\d+[\\.\\d]*) spent on Kotak Bank Card.* at (.+?)\\. Avl",
    amountGroup: "$1",
    descriptionGroup: "$2",
    enabled: false,
    isCustom: false,
  },
];

export function SmsRules() {
  const [rules, setRules] = useState<SmsRule[]>(PRECONFIGURED_RULES);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [testSms, setTestSms] = useState("");
  const [testResult, setTestResult] = useState<{
    matched: boolean;
    rule?: string;
    amount?: string;
    description?: string;
  } | null>(null);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  // Custom rule form
  const [customName, setCustomName] = useState("");
  const [customPattern, setCustomPattern] = useState("");
  const [customAmountGroup, setCustomAmountGroup] = useState("$1");
  const [customDescGroup, setCustomDescGroup] = useState("$2");

  function toggleRule(id: string) {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  }

  function deleteRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
    toast.success("Rule deleted");
  }

  function handleTestSms() {
    if (!testSms.trim()) {
      toast.error("Enter a sample SMS message");
      return;
    }

    for (const rule of rules.filter((r) => r.enabled)) {
      try {
        const regex = new RegExp(rule.pattern, "i");
        const match = testSms.match(regex);
        if (match) {
          setTestResult({
            matched: true,
            rule: rule.name,
            amount: match[1] || "N/A",
            description: match[3] || match[2] || "N/A",
          });
          return;
        }
      } catch {
        // Invalid regex, skip
      }
    }
    setTestResult({ matched: false });
  }

  function handleAddCustomRule(e: React.FormEvent) {
    e.preventDefault();
    if (!customName.trim() || !customPattern.trim()) {
      toast.error("Enter a name and regex pattern");
      return;
    }
    try {
      new RegExp(customPattern);
    } catch {
      toast.error("Invalid regex pattern");
      return;
    }
    const newRule: SmsRule = {
      id: `rule_custom_${Date.now()}`,
      name: customName,
      bank: "Custom",
      pattern: customPattern,
      amountGroup: customAmountGroup,
      descriptionGroup: customDescGroup,
      enabled: true,
      isCustom: true,
    };
    setRules((prev) => [...prev, newRule]);
    setCustomName("");
    setCustomPattern("");
    setShowCustomForm(false);
    toast.success("Custom rule added");
  }

  return (
    <div className="space-y-4">
      {/* Rules list */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              SMS Parsing Rules
            </h3>
            <p className="text-xs text-muted-foreground">
              Auto-create expenses from bank SMS messages
            </p>
          </div>
          <button
            onClick={() => setShowCustomForm(!showCustomForm)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Custom Rule
          </button>
        </div>

        <div className="divide-y divide-border">
          {rules.map((rule) => (
            <div key={rule.id}>
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => toggleRule(rule.id)}
                  className="text-muted-foreground"
                  title={rule.enabled ? "Disable rule" : "Enable rule"}
                >
                  {rule.enabled ? (
                    <ToggleRight className="h-5 w-5 text-primary" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                </button>
                <div
                  className="min-w-0 flex-1 cursor-pointer"
                  onClick={() =>
                    setExpandedRule(
                      expandedRule === rule.id ? null : rule.id
                    )
                  }
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {rule.name}
                    </p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {rule.bank}
                    </span>
                    {rule.isCustom && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        Custom
                      </span>
                    )}
                  </div>
                </div>
                {rule.isCustom && (
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() =>
                    setExpandedRule(
                      expandedRule === rule.id ? null : rule.id
                    )
                  }
                  className="text-muted-foreground"
                >
                  {expandedRule === rule.id ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
              {expandedRule === rule.id && (
                <div className="border-t border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Regex Pattern:
                  </p>
                  <code className="mt-1 block rounded-md bg-background px-3 py-2 font-mono text-xs text-foreground">
                    {rule.pattern}
                  </code>
                  <div className="mt-2 flex gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Amount group: {rule.amountGroup}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Description group: {rule.descriptionGroup}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Custom rule form */}
      {showCustomForm && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-foreground">
            Add Custom Rule
          </h4>
          <form onSubmit={handleAddCustomRule} className="mt-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-foreground">
                Rule Name
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., PhonePe Debit"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground">
                Regex Pattern
              </label>
              <input
                type="text"
                value={customPattern}
                onChange={(e) => setCustomPattern(e.target.value)}
                placeholder="Rs\.?(\d+[\.\d]*) .* at (.+)"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground">
                  Amount Group
                </label>
                <input
                  type="text"
                  value={customAmountGroup}
                  onChange={(e) => setCustomAmountGroup(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground">
                  Description Group
                </label>
                <input
                  type="text"
                  value={customDescGroup}
                  onChange={(e) => setCustomDescGroup(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCustomForm(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Add Rule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Test SMS */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h4 className="text-sm font-semibold text-foreground">
          Test SMS Parsing
        </h4>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Paste a bank SMS to test parsing rules
        </p>
        <div className="mt-3 flex gap-2">
          <textarea
            value={testSms}
            onChange={(e) => setTestSms(e.target.value)}
            placeholder="e.g., Rs.456.00 debited from a/c **4521 on 29-03-26 at SWIGGY. Avl Bal: Rs.1,24,974"
            rows={2}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleTestSms}
            className="self-end rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Play className="h-4 w-4" />
          </button>
        </div>

        {testResult && (
          <div
            className={`mt-3 rounded-lg p-3 ${
              testResult.matched
                ? "bg-green-50 dark:bg-green-900/20"
                : "bg-red-50 dark:bg-red-900/20"
            }`}
          >
            {testResult.matched ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Matched: {testResult.rule}
                  </span>
                </div>
                <p className="text-xs text-green-700 dark:text-green-400">
                  Amount: {testResult.amount} | Description:{" "}
                  {testResult.description}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-700 dark:text-red-400">
                  No matching rule found
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
