"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Bell, Mail, BarChart3, Clock, AlertTriangle } from "lucide-react";

interface ToggleProps {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function Toggle({ enabled, onToggle, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        enabled ? "bg-primary" : "bg-input"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
          enabled ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

export default function NotificationSettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    pushEnabled: true,
    emailEnabled: true,
    weeklySummary: false,
    reminderDays: "3",
    budgetThreshold: "80",
  });

  const updateSetting = (key: keyof typeof settings, value: boolean | string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: save to API
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success("Notification preferences saved");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notification Settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Choose how and when you receive notifications
          </p>
        </div>
      </div>

      {/* Notification channels */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold text-foreground">Notification Channels</h2>
        </div>
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Push notifications</p>
                <p className="text-xs text-muted-foreground">
                  Receive instant push notifications on your device
                </p>
              </div>
            </div>
            <Toggle
              enabled={settings.pushEnabled}
              onToggle={() => updateSetting("pushEnabled", !settings.pushEnabled)}
            />
          </div>

          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <Mail className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Email notifications</p>
                <p className="text-xs text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
            </div>
            <Toggle
              enabled={settings.emailEnabled}
              onToggle={() => updateSetting("emailEnabled", !settings.emailEnabled)}
            />
          </div>

          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
                <BarChart3 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Weekly summary</p>
                <p className="text-xs text-muted-foreground">
                  Receive a weekly spending summary every Monday
                </p>
              </div>
            </div>
            <Toggle
              enabled={settings.weeklySummary}
              onToggle={() => updateSetting("weeklySummary", !settings.weeklySummary)}
            />
          </div>
        </div>
      </div>

      {/* Reminder settings */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold text-foreground">Reminders & Alerts</h2>
        </div>
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Payment reminder</p>
                <p className="text-xs text-muted-foreground">
                  Days before due date to send reminder
                </p>
              </div>
            </div>
            <select
              value={settings.reminderDays}
              onChange={(e) => updateSetting("reminderDays", e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground appearance-none focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="1">1 day</option>
              <option value="2">2 days</option>
              <option value="3">3 days</option>
              <option value="5">5 days</option>
              <option value="7">7 days</option>
            </select>
          </div>

          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Budget alert threshold</p>
                <p className="text-xs text-muted-foreground">
                  Alert when budget usage exceeds this percentage
                </p>
              </div>
            </div>
            <select
              value={settings.budgetThreshold}
              onChange={(e) => updateSetting("budgetThreshold", e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground appearance-none focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="50">50%</option>
              <option value="60">60%</option>
              <option value="70">70%</option>
              <option value="80">80%</option>
              <option value="90">90%</option>
              <option value="100">100%</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save preferences"
          )}
        </button>
      </div>
    </div>
  );
}
