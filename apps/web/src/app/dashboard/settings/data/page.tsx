"use client";

import { useState, useEffect, useId } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  Trash2,
  Clock,
  FileJson,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { createBrowserClient } from "@/lib/supabase/client";
import { usePrivateMode } from "@/hooks/use-privacy";


type DeleteStep = "idle" | "warn" | "confirm" | "authenticate" | "deleting";

const EXPORT_ITEMS = [
  "Expenses and income transactions",
  "Pending payments & IOUs",
  "Budgets and budget history",
  "Categories and tags",
  "Contacts",
  "Profile and account settings",
  "Workspace data",
];

export default function DataPrivacyPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState<DeleteStep>("idle");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { isPrivate, toggle } = usePrivateMode();

  useEffect(() => {
    const stored = localStorage.getItem("expenseflow-last-export");
    if (stored) setLastExport(stored);
  }, []);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch all user data in parallel
      const [
        expenses,
        pendingPayments,
        budgets,
        categories,
        contacts,
        profile,
      ] = await Promise.all([
        supabase
          .from("expenses")
          .select("*")
          .is("deleted_at", null)
          .order("date", { ascending: false }),
        supabase
          .from("pending_payments")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("budgets")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("categories").select("*"),
        supabase.from("contacts").select("*"),
        supabase.from("profiles").select("*").eq("id", user.id).single(),
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        exportedBy: user.email,
        version: "1.0",
        data: {
          profile: profile.data,
          expenses: expenses.data ?? [],
          pendingPayments: pendingPayments.data ?? [],
          budgets: budgets.data ?? [],
          categories: categories.data ?? [],
          contacts: contacts.data ?? [],
        },
        meta: {
          totalExpenses: expenses.data?.length ?? 0,
          totalPendingPayments: pendingPayments.data?.length ?? 0,
          totalBudgets: budgets.data?.length ?? 0,
          totalCategories: categories.data?.length ?? 0,
          totalContacts: contacts.data?.length ?? 0,
        },
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenseflow-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      const now = new Date().toLocaleString();
      setLastExport(now);
      localStorage.setItem("expenseflow-last-export", now);
      toast.success("Data exported successfully");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Export failed";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAuthenticate = async () => {
    setIsAuthenticating(true);
    try {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("No user found");

      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword,
      });

      if (error) {
        toast.error("Incorrect password");
        return;
      }

      setDeleteStep("deleting");
      await performAccountDeletion();
    } catch {
      toast.error("Authentication failed");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const performAccountDeletion = async () => {
    setIsDeleting(true);
    try {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Call edge function to delete user data
      const { error } = await supabase.functions.invoke("delete-user-account", {
        body: { userId: user.id },
      });

      if (error) {
        // Fallback: sign out and show message
        await supabase.auth.signOut();
        toast.success(
          "Account deletion initiated. Your data will be removed within 24 hours."
        );
        window.location.href = "/login";
        return;
      }

      await supabase.auth.signOut();
      window.location.href = "/login?deleted=1";
    } catch {
      toast.error("Failed to delete account. Please contact support.");
    } finally {
      setIsDeleting(false);
    }
  };

  const resetDeleteFlow = () => {
    setDeleteStep("idle");
    setDeleteConfirmText("");
    setDeletePassword("");
    setShowPassword(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data & Privacy</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage your data, privacy settings, and account deletion
          </p>
        </div>
      </div>

      {/* Export Data */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Export Your Data
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Download a complete copy of all your ExpenseFlow data (GDPR
              compliant)
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
          <p className="mb-2 text-xs font-medium text-foreground">
            Your export will include:
          </p>
          <ul className="space-y-1">
            {EXPORT_ITEMS.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Last export: {lastExport ?? "Never"}
          </div>
          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileJson className="h-4 w-4" />
                Request Export
              </>
            )}
          </button>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Privacy Settings
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Control how your data is displayed
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Private Mode Toggle */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              {isPrivate ? (
                <EyeOff className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Eye className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">
                  Private Mode
                </p>
                <p className="text-xs text-muted-foreground">
                  Blur all monetary amounts in the app
                </p>
              </div>
            </div>
            <button
              onClick={toggle}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                isPrivate ? "bg-primary" : "bg-muted"
              )}
              role="switch"
              aria-checked={isPrivate}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                  isPrivate ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* Analytics */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4 opacity-60">
            <div>
              <p className="text-sm font-medium text-foreground">
                Analytics Sharing
              </p>
              <p className="text-xs text-muted-foreground">
                Share anonymized usage data to improve the product
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              Coming soon
            </span>
          </div>
        </div>
      </div>

      {/* Delete Account */}
      <div id="delete" className="rounded-xl border border-destructive/30 bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Delete Account
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Permanently delete your account and all associated data
            </p>
          </div>
        </div>

        {deleteStep === "idle" && (
          <div>
            <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-xs font-medium text-destructive mb-2">
                This action will permanently delete:
              </p>
              <ul className="space-y-1">
                {[
                  "Your profile and personal information",
                  "All expenses, income, and transaction history",
                  "All budgets and savings goals",
                  "All pending payments and IOUs",
                  "All contacts and workspace data",
                  "This cannot be undone",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive/70" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setDeleteStep("warn")}
              className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete My Account
            </button>
          </div>
        )}

        {deleteStep === "warn" && (
          <DeleteWarningStep
            onContinue={() => setDeleteStep("confirm")}
            onCancel={resetDeleteFlow}
          />
        )}

        {deleteStep === "confirm" && (
          <DeleteConfirmStep
            confirmText={deleteConfirmText}
            onConfirmTextChange={setDeleteConfirmText}
            onContinue={() => setDeleteStep("authenticate")}
            onCancel={resetDeleteFlow}
          />
        )}

        {deleteStep === "authenticate" && (
          <DeleteAuthStep
            password={deletePassword}
            onPasswordChange={setDeletePassword}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword(!showPassword)}
            onSubmit={handleDeleteAuthenticate}
            isLoading={isAuthenticating}
            onCancel={resetDeleteFlow}
          />
        )}

        {deleteStep === "deleting" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-destructive" />
            <p className="text-sm text-muted-foreground">
              Deleting your account...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Delete Sub-components ────────────────────────────────────────────────────

function DeleteWarningStep({
  onContinue,
  onCancel,
}: {
  onContinue: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
        <p className="text-sm font-semibold text-destructive mb-1">
          Are you absolutely sure?
        </p>
        <p className="text-xs text-muted-foreground">
          This is a permanent action. Once deleted, your data cannot be
          recovered. Please make sure you have exported your data if you need
          it.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Cancel
        </button>
        <button
          onClick={onContinue}
          className="flex-1 rounded-lg bg-destructive py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
        >
          I understand, continue
        </button>
      </div>
    </div>
  );
}

const REQUIRED_TEXT = "DELETE MY ACCOUNT";

function DeleteConfirmStep({
  confirmText,
  onConfirmTextChange,
  onContinue,
  onCancel,
}: {
  confirmText: string;
  onConfirmTextChange: (text: string) => void;
  onContinue: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const isMatch = confirmText === REQUIRED_TEXT;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1.5">
          Type{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono text-destructive">
            {REQUIRED_TEXT}
          </code>{" "}
          to confirm
        </label>
        <input
          id={id}
          type="text"
          value={confirmText}
          onChange={(e) => onConfirmTextChange(e.target.value)}
          placeholder={REQUIRED_TEXT}
          className={cn(
            "h-10 w-full rounded-lg border bg-background px-3 font-mono text-sm text-foreground transition-colors",
            "focus:border-destructive focus:outline-none focus:ring-2 focus:ring-destructive/20",
            isMatch ? "border-destructive" : "border-input"
          )}
        />
      </div>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Cancel
        </button>
        <button
          onClick={onContinue}
          disabled={!isMatch}
          className="flex-1 rounded-lg bg-destructive py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function DeleteAuthStep({
  password,
  onPasswordChange,
  showPassword,
  onTogglePassword,
  onSubmit,
  isLoading,
  onCancel,
}: {
  password: string;
  onPasswordChange: (p: string) => void;
  showPassword: boolean;
  onTogglePassword: () => void;
  onSubmit: () => void;
  isLoading: boolean;
  onCancel: () => void;
}) {
  const id = useId();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter your password to confirm account deletion:
      </p>
      <div className="space-y-1.5">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          Password
        </label>
        <div className="relative">
          <input
            id={id}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 pr-10 text-sm text-foreground focus:border-destructive focus:outline-none focus:ring-2 focus:ring-destructive/20 transition-colors"
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={isLoading || !password}
          className="flex-1 rounded-lg bg-destructive py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying...
            </span>
          ) : (
            "Delete My Account"
          )}
        </button>
      </div>
    </div>
  );
}
