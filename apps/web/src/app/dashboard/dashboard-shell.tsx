"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { QuickAddExpense } from "@/components/dashboard/quick-add-expense";

interface DashboardShellProps {
  user: {
    email?: string;
    fullName?: string;
    avatarUrl?: string;
  };
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
          <div className="mx-auto max-w-7xl page-transition">
            {children}
          </div>
        </main>
      </div>
      <QuickAddExpense />
    </div>
  );
}
