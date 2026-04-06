"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  Plus,
  ArrowRight,
  Receipt,
  PiggyBank,
  Sparkles,
  CreditCard,
  BarChart3,
  Bell,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

interface DashboardHomeProps {
  userName: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Sub-components ─────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down";
  icon: React.ReactNode;
  iconBg: string;
}

function StatCard({ title, value, change, trend, icon, iconBg }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", iconBg)}>
          {icon}
        </div>
      </div>
      {change && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          {trend === "up" ? (
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
          )}
          <span
            className={cn(
              "font-medium",
              trend === "up" ? "text-green-500" : "text-destructive"
            )}
          >
            {change}
          </span>
          <span className="text-muted-foreground">vs last month</span>
        </div>
      )}
    </div>
  );
}

// ─── Budget alert item ───────────────────────────────────────────────────────

interface BudgetAlertItemProps {
  name: string;
  spent: number;
  limit: number;
  currency?: string;
}

function BudgetAlertItem({ name, spent, limit, currency = "USD" }: BudgetAlertItemProps) {
  const percent = Math.min(Math.round((spent / limit) * 100), 100);
  const isOver = percent >= 100;
  const isWarning = percent >= 80 && !isOver;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground truncate pr-2">{name}</span>
        <span
          className={cn(
            "shrink-0 font-semibold",
            isOver ? "text-destructive" : isWarning ? "text-warning" : "text-muted-foreground"
          )}
        >
          {percent}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isOver ? "bg-destructive" : isWarning ? "bg-warning" : "bg-primary"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        {currency} {spent.toFixed(0)} / {limit.toFixed(0)}
      </p>
    </div>
  );
}

// ─── Pending payment item ────────────────────────────────────────────────────

interface PendingItemProps {
  id: string;
  description: string;
  person: string;
  amount: number;
  currency: string;
  dueDate: string;
  direction: "owe" | "owed";
}

function PendingItem({ id, description, person, amount, currency, dueDate, direction }: PendingItemProps) {
  const isOverdue = new Date(dueDate) < new Date();

  return (
    <Link
      href={`/dashboard/pending/${id}`}
      className="flex items-center gap-3 rounded-lg p-2 -mx-2 transition-colors hover:bg-accent/50 group"
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          direction === "owe" ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-500"
        )}
      >
        {person.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{description}</p>
        <p className="text-xs text-muted-foreground">
          {direction === "owe" ? "You owe" : "Owes you"} · {person}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p
          className={cn(
            "text-sm font-semibold",
            direction === "owe" ? "text-destructive" : "text-green-500"
          )}
        >
          {direction === "owe" ? "-" : "+"}
          {currency} {amount.toFixed(2)}
        </p>
        {isOverdue && (
          <p className="flex items-center justify-end gap-0.5 text-[10px] text-destructive">
            <AlertTriangle className="h-2.5 w-2.5" />
            Overdue
          </p>
        )}
        {!isOverdue && (
          <p className="text-[10px] text-muted-foreground">Due {dueDate}</p>
        )}
      </div>
    </Link>
  );
}

// ─── AI Insight item ─────────────────────────────────────────────────────────

interface InsightItemProps {
  icon: React.ReactNode;
  text: string;
  type: "tip" | "alert" | "positive";
}

function InsightItem({ icon, text, type }: InsightItemProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg p-3 text-xs",
        type === "alert"
          ? "bg-destructive/5 text-destructive"
          : type === "positive"
          ? "bg-green-500/5 text-green-700 dark:text-green-400"
          : "bg-primary/5 text-primary"
      )}
    >
      <div className="mt-0.5 shrink-0">{icon}</div>
      <p className="leading-relaxed">{text}</p>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

const DISMISSED_KEY = "expenseflow:onboarding-dismissed";

export function DashboardHome({ userName }: DashboardHomeProps) {
  const greeting = useMemo(() => getGreeting(), []);

  // Onboarding checklist dismiss state (persisted to localStorage)
  const [checklistDismissed, setChecklistDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DISMISSED_KEY) === "true";
  });

  const handleDismissChecklist = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setChecklistDismissed(true);
  }, []);

  // In a real app these would come from API hooks — using static zeros for
  // the initial state so the component is ready to receive live data.
  const hasExpenses = false;
  const hasBudgets = false;
  const hasContacts = false;
  const hasPendingPayments = false;

  const isNewUser = !hasExpenses && !hasBudgets && !hasContacts && !hasPendingPayments;
  const showChecklist = isNewUser && !checklistDismissed;

  // Sample "coming soon" data arrays kept empty — the component renders empty
  // states gracefully until real hooks are wired up.
  const samplePendingItems: PendingItemProps[] = [];
  const sampleBudgetAlerts: BudgetAlertItemProps[] = [];

  return (
    <div className="space-y-6">
      {/* ── Welcome header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            {greeting},{" "}
            <span className="text-primary">{userName}</span>
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here&apos;s an overview of your finances
          </p>
        </div>
        {/* Notification hint — wired in header component; shown here as shortcut */}
        <Link
          href="/dashboard/settings/notifications"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card shadow-sm transition-colors hover:bg-accent"
          title="Notification settings"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>

      {/* ── Onboarding checklist (new users) ── */}
      {showChecklist && (
        <OnboardingChecklist
          hasExpenses={hasExpenses}
          hasBudgets={hasBudgets}
          hasContacts={hasContacts}
          hasPendingPayments={hasPendingPayments}
          onDismiss={handleDismissChecklist}
        />
      )}

      {/* ── Quick actions ── */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/expenses/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </Link>
        <Link
          href="/dashboard/pending/new"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
        >
          <CreditCard className="h-4 w-4" />
          Record Payment
        </Link>
        <Link
          href="/dashboard/budgets/new"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
        >
          <PiggyBank className="h-4 w-4" />
          Set Budget
        </Link>
      </div>

      {/* ── Stats row ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Spent"
          value="$0.00"
          change="+0%"
          trend="up"
          icon={<Wallet className="h-5 w-5 text-primary" />}
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Total Income"
          value="$0.00"
          change="+0%"
          trend="up"
          icon={<TrendingUp className="h-5 w-5 text-green-500" />}
          iconBg="bg-green-500/10"
        />
        <StatCard
          title="Net Balance"
          value="$0.00"
          icon={<BarChart3 className="h-5 w-5 text-blue-500" />}
          iconBg="bg-blue-500/10"
        />
        <StatCard
          title="Pending Payments"
          value="$0.00"
          icon={<Clock className="h-5 w-5 text-orange-500" />}
          iconBg="bg-orange-500/10"
        />
      </div>

      {/* ── Content grid ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left: Recent expenses (2/3 width) ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Expenses */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">
                  Recent Expenses
                </h2>
              </div>
              <Link
                href="/dashboard/expenses"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="p-5">
              {/* Empty state */}
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Receipt className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  No expenses yet
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Start tracking by adding your first expense
                </p>
                <Link
                  href="/dashboard/expenses/new"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  Add Expense
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Pending Payments */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">
                  Pending Payments
                </h2>
              </div>
              <Link
                href="/dashboard/pending"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="p-5">
              {samplePendingItems.length > 0 ? (
                <div className="space-y-1">
                  {samplePendingItems.map((item) => (
                    <PendingItem key={item.id} {...item} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No pending payments
                  </p>
                  <Link
                    href="/dashboard/pending/new"
                    className="mt-2 text-xs font-medium text-primary hover:underline"
                  >
                    Record a payment
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-6">
          {/* Budget Alerts */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">
                  Budget Alerts
                </h2>
              </div>
              <Link
                href="/dashboard/budgets"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="p-5">
              {sampleBudgetAlerts.length > 0 ? (
                <div className="space-y-4">
                  {sampleBudgetAlerts.map((b) => (
                    <BudgetAlertItem key={b.name} {...b} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <PiggyBank className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No budgets set</p>
                  <Link
                    href="/dashboard/budgets/new"
                    className="mt-2 text-xs font-medium text-primary hover:underline"
                  >
                    Create a budget
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* AI Insights widget */}
          <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 shadow-sm">
            <div className="flex items-center gap-2 border-b border-primary/15 px-5 py-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                AI Insights
              </h2>
              <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                Beta
              </span>
            </div>
            <div className="space-y-2 p-4">
              <InsightItem
                type="tip"
                icon={<Sparkles className="h-3.5 w-3.5" />}
                text="Add a few expenses and AI will surface spending patterns and personalized tips here."
              />
              <InsightItem
                type="positive"
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                text="Your account is set up and ready to track. Start by logging today's first transaction."
              />
            </div>
            <div className="border-t border-primary/15 px-5 py-3">
              <Link
                href="/dashboard/insights"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Open AI assistant
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Reports quick link */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-base font-semibold text-foreground">Reports</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              View charts, category breakdowns, and monthly summaries.
            </p>
            <Link
              href="/dashboard/reports"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              View reports
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
