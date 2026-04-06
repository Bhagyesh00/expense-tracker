import Link from "next/link";
import { User, Building2, Bell, Shield, Database, Globe, Accessibility } from "lucide-react";

export const metadata = {
  title: "Settings",
};

const SETTINGS_SECTIONS = [
  {
    title: "Profile",
    description: "Manage your personal information, avatar, and preferences",
    href: "/settings/profile",
    icon: User,
  },
  {
    title: "Workspace",
    description: "Manage workspace settings, members, and invitations",
    href: "/settings/workspace",
    icon: Building2,
  },
  {
    title: "Notifications",
    description: "Configure push, email notifications, and alert preferences",
    href: "/settings/notifications",
    icon: Bell,
  },
  {
    title: "Security",
    description: "Password, two-factor authentication, and sessions",
    href: "/settings/security",
    icon: Shield,
  },
  {
    title: "Data & Privacy",
    description: "Export your data, manage connected accounts, and privacy settings",
    href: "/settings/data",
    icon: Database,
  },
  {
    title: "Language & Region",
    description: "Set your preferred language, date format, and number format",
    href: "/settings/language",
    icon: Globe,
  },
  {
    title: "Accessibility",
    description: "High contrast, reduced motion, font size, and screen reader settings",
    href: "/settings/accessibility",
    icon: Accessibility,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SETTINGS_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {section.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
