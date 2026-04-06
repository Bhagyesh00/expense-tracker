import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import {
  Receipt,
  Clock,
  PiggyBank,
  Sparkles,
  Globe,
  WifiOff,
  ArrowRight,
  CheckCircle2,
  Github,
  Twitter,
  Zap,
} from "lucide-react";

export const metadata = {
  title: "ExpenseFlow – Track expenses. Manage payments. Grow savings.",
  description:
    "The open-source personal finance tracker with AI insights, multi-currency support, and seamless offline sync.",
};

export default async function RootPage() {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ───── Nav ───── */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <svg
                className="h-5 w-5 text-primary-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <span className="text-lg font-bold">
              Expense<span className="text-primary">Flow</span>
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              How it works
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              GitHub
            </a>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ───── Hero ───── */}
      <section className="relative overflow-hidden px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
        {/* Background gradient blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]" />
          <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-blue-500/5 blur-[80px]" />
        </div>

        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <Zap className="h-3.5 w-3.5" />
            100% Free &amp; Open Source
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Track expenses.{" "}
            <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              Manage payments.
            </span>
            <br />
            Grow savings.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            ExpenseFlow is the open-source personal finance tracker built for
            individuals and small teams — with AI-powered insights, multi-currency
            support, pending payment tracking, and full offline capability.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-base font-semibold text-foreground transition-colors hover:bg-accent"
            >
              View Features
            </a>
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            {[
              { label: "100% Free" },
              { label: "No credit card required" },
              { label: "Open source" },
            ].map(({ label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Hero screenshot / preview card */}
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/5 ring-1 ring-border/50">
            {/* Fake browser chrome */}
            <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400/70" />
                <div className="h-3 w-3 rounded-full bg-yellow-400/70" />
                <div className="h-3 w-3 rounded-full bg-green-400/70" />
              </div>
              <div className="mx-4 flex-1 rounded-md bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                expense-reducer.vercel.app/dashboard
              </div>
            </div>
            {/* Dashboard preview skeleton */}
            <div className="flex h-64 sm:h-80">
              {/* Sidebar */}
              <div className="hidden w-48 border-r border-border bg-card p-3 sm:block">
                <div className="mb-4 flex items-center gap-2 px-2">
                  <div className="h-6 w-6 rounded-md bg-primary/20" />
                  <div className="h-3 w-20 rounded bg-muted" />
                </div>
                {[70, 55, 65, 50, 60, 45].map((w, i) => (
                  <div
                    key={i}
                    className="mb-1 flex items-center gap-2 rounded-lg px-2 py-2"
                    style={{ opacity: i === 0 ? 1 : 0.5 }}
                  >
                    <div className={`h-4 w-4 rounded ${i === 0 ? "bg-primary/30" : "bg-muted"}`} />
                    <div className={`h-2.5 rounded bg-muted`} style={{ width: `${w}%` }} />
                  </div>
                ))}
              </div>
              {/* Main content */}
              <div className="flex-1 bg-background/50 p-4">
                <div className="mb-4 h-5 w-40 rounded bg-muted" />
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { color: "bg-primary/10", h: "bg-primary/30" },
                    { color: "bg-green-500/10", h: "bg-green-400/30" },
                    { color: "bg-blue-500/10", h: "bg-blue-400/30" },
                    { color: "bg-orange-500/10", h: "bg-orange-400/30" },
                  ].map(({ color, h }, i) => (
                    <div key={i} className={`rounded-xl border border-border ${color} p-3`}>
                      <div className={`mb-2 h-2 w-16 rounded ${h}`} />
                      <div className="h-5 w-12 rounded bg-muted" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 rounded-xl border border-border bg-card p-3">
                    <div className="mb-3 h-3 w-28 rounded bg-muted" />
                    {[85, 60, 75, 40].map((w, i) => (
                      <div key={i} className="mb-2 flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-muted/50" />
                        <div className="h-2 rounded bg-muted" style={{ width: `${w}%` }} />
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-primary/10 p-3">
                    <div className="mb-2 flex items-center gap-1.5">
                      <div className="h-3.5 w-3.5 rounded bg-primary/30" />
                      <div className="h-2 w-16 rounded bg-muted" />
                    </div>
                    <div className="space-y-1.5">
                      {[70, 55, 80].map((w, i) => (
                        <div key={i} className="h-2 rounded bg-muted/50" style={{ width: `${w}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Stats bar ───── */}
      <section className="border-y border-border bg-muted/20 py-10">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid grid-cols-1 gap-8 text-center sm:grid-cols-3">
            {[
              { stat: "100%", label: "Free forever" },
              { stat: "Open Source", label: "MIT licensed on GitHub" },
              { stat: "No credit card", label: "Required to get started" },
            ].map(({ stat, label }) => (
              <div key={stat}>
                <p className="text-3xl font-bold text-foreground">{stat}</p>
                <p className="mt-1 text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Features ───── */}
      <section id="features" className="px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything you need to master your finances
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Built with modern tools for a smooth, reliable experience — online
              and offline.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${f.iconBg}`}
                >
                  <f.Icon className={`h-6 w-6 ${f.iconColor}`} />
                </div>
                <h3 className="mb-2 text-base font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── How it works ───── */}
      <section
        id="how-it-works"
        className="bg-muted/20 px-4 py-24 sm:px-6"
      >
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Up and running in minutes
            </h2>
            <p className="mt-4 text-muted-foreground">
              No complex setup — just sign up and start tracking.
            </p>
          </div>

          <div className="relative grid gap-10 lg:grid-cols-3">
            {/* Connector line (desktop) */}
            <div
              aria-hidden
              className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block"
            />

            {STEPS.map((step, i) => (
              <div key={step.title} className="relative flex flex-col items-center text-center">
                <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/30 bg-card shadow-sm">
                  <span className="text-xl font-extrabold text-primary">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mb-2 text-base font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Tech stack ───── */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-8 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Built with
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {TECH_BADGES.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border bg-card px-5 py-2 text-sm font-medium text-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ───── CTA banner ───── */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-blue-500/5 p-10 text-center shadow-xl">
          <h2 className="text-3xl font-bold text-foreground">
            Start tracking for free today
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            No credit card, no subscription. Just sign up and take control of
            your finances.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-8 py-3 text-base font-semibold text-foreground transition-colors hover:bg-accent"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="border-t border-border bg-muted/20 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <svg
                    className="h-5 w-5 text-primary-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <span className="text-lg font-bold">
                  Expense<span className="text-primary">Flow</span>
                </span>
              </Link>
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                The open-source personal finance tracker with AI-powered
                insights and real-time sync.
              </p>
              <div className="mt-4 flex gap-3">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Github className="h-4 w-4" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Twitter className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Product links */}
            <div>
              <p className="mb-4 text-sm font-semibold text-foreground">Product</p>
              <ul className="space-y-2">
                {[
                  { label: "Features", href: "#features" },
                  { label: "How it works", href: "#how-it-works" },
                  { label: "Sign in", href: "/login" },
                  { label: "Register", href: "/register" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal links */}
            <div>
              <p className="mb-4 text-sm font-semibold text-foreground">Legal</p>
              <ul className="space-y-2">
                {["Privacy Policy", "Terms of Service", "License (MIT)"].map(
                  (label) => (
                    <li key={label}>
                      <span className="cursor-default text-sm text-muted-foreground/60">
                        {label}
                      </span>
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} ExpenseFlow. Open source under the
            MIT license.
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Static data ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    title: "Expense Tracking",
    description:
      "Log income and expenses with categories, tags, and receipts. Filter, search, and export with one click.",
    Icon: Receipt,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
  {
    title: "Pending Payments",
    description:
      "Track money you owe and are owed. Send reminders, record partial payments, and settle via UPI links.",
    Icon: Clock,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
  },
  {
    title: "Smart Budgets",
    description:
      "Create budgets per category with threshold alerts. Monitor progress with visual indicators and savings goals.",
    Icon: PiggyBank,
    iconBg: "bg-green-500/10",
    iconColor: "text-green-500",
  },
  {
    title: "AI Insights",
    description:
      "Ask natural-language questions about your spending. Get anomaly detection, forecasts, and personalized tips.",
    Icon: Sparkles,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
  },
  {
    title: "Multi-Currency",
    description:
      "Track expenses in any currency with live exchange rates. See totals converted to your preferred currency.",
    Icon: Globe,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    title: "Offline Sync",
    description:
      "Add expenses without an internet connection. Changes sync automatically when you come back online.",
    Icon: WifiOff,
    iconBg: "bg-gray-500/10",
    iconColor: "text-gray-500",
  },
];

const STEPS = [
  {
    title: "Create your free account",
    description:
      "Sign up with email, Google, or GitHub in under 30 seconds. No payment details needed.",
  },
  {
    title: "Add your expenses",
    description:
      "Manually log transactions, scan receipts with OCR, or let AI auto-categorize from your description.",
  },
  {
    title: "Get insights & grow",
    description:
      "View trends, set budgets, track pending payments, and receive AI-powered tips to improve your finances.",
  },
];

const TECH_BADGES = [
  "Next.js 15",
  "Supabase",
  "Expo / React Native",
  "TailwindCSS",
  "TanStack Query",
  "Gemini AI",
  "TypeScript",
  "Turborepo",
];
