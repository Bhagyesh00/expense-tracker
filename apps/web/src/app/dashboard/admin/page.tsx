"use client";

import Link from "next/link";
import {
  ShieldCheck,
  Users,
  FileCheck,
  ScrollText,
  KeyRound,
  ArrowRight,
  TrendingUp,
  Clock,
} from "lucide-react";

const STATS = [
  {
    label: "Workspace Members",
    value: "24",
    change: "+3 this month",
    icon: Users,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    label: "Active Policies",
    value: "8",
    change: "2 updated recently",
    icon: FileCheck,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
  {
    label: "Pending Approvals",
    value: "5",
    change: "3 urgent",
    icon: Clock,
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  {
    label: "Audit Events (30d)",
    value: "1,247",
    change: "+12% vs last month",
    icon: ScrollText,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  },
];

const QUICK_LINKS = [
  {
    title: "SSO Configuration",
    description: "Set up SAML, Okta, or Azure AD single sign-on",
    href: "/dashboard/admin/sso",
    icon: KeyRound,
  },
  {
    title: "Approval Policies",
    description: "Manage expense approval workflows and rules",
    href: "/dashboard/admin/approvals",
    icon: FileCheck,
  },
  {
    title: "Team Policies",
    description: "Set spending limits, receipt requirements, and category rules",
    href: "/dashboard/admin/approvals#policies",
    icon: ShieldCheck,
  },
  {
    title: "Audit Log",
    description: "View detailed log of all workspace actions and changes",
    href: "/dashboard/admin/approvals#audit",
    icon: ScrollText,
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage workspace settings, policies, and security
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                {stat.change}
              </p>
            </div>
          );
        })}
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    {link.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {link.description}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Recent Activity
        </h2>
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="divide-y divide-border">
            {[
              {
                action: "Approval policy updated",
                user: "Priya Sharma",
                time: "2 hours ago",
                detail: "Changed threshold from $500 to $1000",
              },
              {
                action: "New member added",
                user: "Admin",
                time: "5 hours ago",
                detail: "Rajesh Kumar joined as Member",
              },
              {
                action: "Expense rejected",
                user: "Amit Patel",
                time: "Yesterday",
                detail: "Rejected expense #EXP-1234 - Missing receipt",
              },
              {
                action: "SSO configuration updated",
                user: "Admin",
                time: "2 days ago",
                detail: "Enabled Okta SSO for workspace",
              },
              {
                action: "Team policy created",
                user: "Priya Sharma",
                time: "3 days ago",
                detail: "Receipt required for expenses above $50",
              },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <ScrollText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {item.action}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-foreground">
                    {item.user}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
