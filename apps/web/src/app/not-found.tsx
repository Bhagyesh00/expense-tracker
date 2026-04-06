"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ArrowLeft, Search, LayoutDashboard } from "lucide-react";

const SUGGESTIONS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Expenses", href: "/dashboard/expenses" },
  { label: "Pending Payments", href: "/dashboard/pending" },
  { label: "Budgets", href: "/dashboard/budgets" },
  { label: "Reports", href: "/dashboard/reports" },
  { label: "Settings", href: "/dashboard/settings" },
];

export default function NotFound() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? SUGGESTIONS.filter((s) =>
        s.label.toLowerCase().includes(query.toLowerCase())
      )
    : SUGGESTIONS;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const match = SUGGESTIONS.find((s) =>
      s.label.toLowerCase().includes(query.toLowerCase())
    );
    if (match) {
      router.push(match.href);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        {/* Illustration */}
        <div className="relative mx-auto mb-8 flex h-40 w-40 items-center justify-center">
          {/* Decorative rings */}
          <div className="absolute inset-0 animate-ping rounded-full border border-primary/10" />
          <div className="absolute inset-4 rounded-full border border-primary/15" />
          <div className="absolute inset-8 rounded-full border border-primary/20 bg-primary/5" />
          {/* 404 text */}
          <span className="relative text-5xl font-extrabold tracking-tight text-primary">
            404
          </span>
        </div>

        {/* Copy */}
        <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
        <p className="mt-2 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {/* Search */}
        <form onSubmit={handleSearch} className="mt-8">
          <label
            htmlFor="not-found-search"
            className="mb-2 block text-left text-sm font-medium text-foreground"
          >
            Search for a page
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="not-found-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Budgets, Reports…"
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </form>

        {/* Suggestions */}
        {filtered.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            {filtered.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="flex items-center gap-3 border-b border-border/50 px-4 py-2.5 text-sm text-muted-foreground transition-colors last:border-b-0 hover:bg-accent hover:text-foreground"
              >
                <LayoutDashboard className="h-4 w-4 shrink-0 text-primary/60" />
                {s.label}
              </Link>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
