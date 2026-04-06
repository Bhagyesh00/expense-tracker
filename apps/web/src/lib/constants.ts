import {
  LayoutDashboard,
  Receipt,
  Clock,
  PiggyBank,
  BarChart3,
  Tags,
  Users,
  Settings,
  Sparkles,
  Plug,
  Landmark,
  ShieldCheck,
  Languages,
  Accessibility,
  CheckSquare,
  KeyRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: string;
  /** When true the item appears visually separated at the bottom of the nav */
  section?: "bottom";
  /** Group label for visual section headers in the sidebar */
  group?: string;
}

export const NAV_ITEMS: NavItem[] = [
  // ── Core ─────────────────────────────────────────────────────────────────
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    label: "Expenses",
    icon: Receipt,
    href: "/dashboard/expenses",
  },
  {
    label: "Pending Payments",
    icon: Clock,
    href: "/dashboard/pending",
  },
  {
    label: "Budgets & Goals",
    icon: PiggyBank,
    href: "/dashboard/budgets",
  },
  {
    label: "Reports",
    icon: BarChart3,
    href: "/dashboard/reports",
  },
  {
    label: "AI Insights",
    icon: Sparkles,
    href: "/dashboard/insights",
    badge: "AI",
  },
  {
    label: "Categories",
    icon: Tags,
    href: "/dashboard/categories",
  },
  {
    label: "Contacts",
    icon: Users,
    href: "/dashboard/contacts",
  },

  // ── Integrations ─────────────────────────────────────────────────────────
  {
    label: "Integrations",
    icon: Plug,
    href: "/dashboard/integrations",
    group: "Integrations",
  },
  {
    label: "Bank Sync",
    icon: Landmark,
    href: "/dashboard/bank-sync",
    group: "Integrations",
  },

  // ── Admin ────────────────────────────────────────────────────────────────
  {
    label: "Admin Dashboard",
    icon: ShieldCheck,
    href: "/dashboard/admin",
    group: "Admin",
  },
  {
    label: "Approvals",
    icon: CheckSquare,
    href: "/dashboard/admin/approvals",
    group: "Admin",
  },
  {
    label: "SSO Config",
    icon: KeyRound,
    href: "/dashboard/admin/sso",
    group: "Admin",
  },

  // ── Settings (bottom section) ────────────────────────────────────────────
  {
    label: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
    section: "bottom",
  },
  {
    label: "Language",
    icon: Languages,
    href: "/dashboard/settings/language",
    section: "bottom",
  },
  {
    label: "Accessibility",
    icon: Accessibility,
    href: "/dashboard/settings/accessibility",
    section: "bottom",
  },
];

/** Page size used for paginated list queries */
export const PAGE_SIZE = 20;

/** Default currency shown before the user sets a preference */
export const DEFAULT_CURRENCY = "INR";

/** Supported currencies for the currency selector */
export const SUPPORTED_CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
] as const;

export type SupportedCurrencyCode =
  (typeof SUPPORTED_CURRENCIES)[number]["code"];

/** Maximum file size for receipt uploads (5 MB) */
export const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024;

/** Accepted MIME types for receipt uploads */
export const RECEIPT_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;
