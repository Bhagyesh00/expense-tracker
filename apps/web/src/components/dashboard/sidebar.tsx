"use client";

import { useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "@/lib/constants";
import { useUIStore } from "@/stores/ui-store";
import { ChevronLeft, ChevronRight, X, Building2 } from "lucide-react";

interface SidebarProps {
  className?: string;
  /** Workspace name to show in collapsed footer area */
  workspaceName?: string;
}

export function Sidebar({ className, workspaceName = "My Workspace" }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();

  // ── Keyboard shortcut: press "[" to toggle sidebar ──────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore when typing in inputs / textareas
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.key === "[" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        toggleSidebar();
      }
    },
    [toggleSidebar]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // ── Split nav items into main and bottom sections ─────────────────────────
  const mainItems = NAV_ITEMS.filter((item) => item.section !== "bottom");
  const bottomItems = NAV_ITEMS.filter((item) => item.section === "bottom");

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out lg:relative lg:z-0",
          sidebarOpen
            ? "w-64 translate-x-0"
            : "-translate-x-full lg:w-16 lg:translate-x-0",
          className
        )}
        aria-label="Main navigation"
      >
        {/* ── Logo / header ─────────────────────────────────────────────── */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {sidebarOpen ? (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-2.5"
                onClick={() => {
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
                  <svg
                    className="h-5 w-5 text-primary-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-foreground">
                  Expense<span className="text-primary">Flow</span>
                </span>
              </Link>

              {/* Collapse button — desktop only */}
              <button
                onClick={toggleSidebar}
                className="hidden rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:block"
                aria-label="Collapse sidebar"
                title="Collapse sidebar (press [)"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Close button — mobile only */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            /* Collapsed — show only the expand button on desktop */
            <button
              onClick={toggleSidebar}
              className="mx-auto hidden rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:block"
              aria-label="Expand sidebar"
              title="Expand sidebar (press [)"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Main navigation ───────────────────────────────────────────── */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 scrollbar-thin" aria-label="Primary">
          {mainItems.map((item, index) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            // Show a group header when this item starts a new group
            const prevGroup = index > 0 ? mainItems[index - 1].group : undefined;
            const showGroupHeader =
              sidebarOpen && item.group && item.group !== prevGroup;

            return (
              <div key={item.href}>
                {showGroupHeader && (
                  <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {item.group}
                  </p>
                )}
                <Link
                  href={item.href}
                  onClick={() => {
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    !sidebarOpen && "lg:justify-center lg:px-2"
                  )}
                  title={!sidebarOpen ? item.label : undefined}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      isActive ? "text-primary" : "text-current"
                    )}
                  />
                  {sidebarOpen && (
                    <>
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {!sidebarOpen && item.badge && (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* ── Bottom section (Settings + workspace + hint) ──────────────── */}
        <div className="border-t border-border p-3">
          {/* Bottom nav items (Settings) */}
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  !sidebarOpen && "lg:justify-center lg:px-2"
                )}
                title={!sidebarOpen ? item.label : undefined}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                {sidebarOpen && (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            );
          })}

          {/* Workspace name */}
          {sidebarOpen && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-accent/40 px-3 py-2">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {workspaceName}
                </p>
                <p className="text-[10px] text-muted-foreground">Personal workspace</p>
              </div>
            </div>
          )}

          {/* Keyboard shortcut hint */}
          {sidebarOpen ? (
            <div className="mt-2 px-3 py-1.5">
              <p className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                Press
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[9px] font-mono font-medium text-muted-foreground">
                  [
                </kbd>
                to collapse
              </p>
            </div>
          ) : (
            <div className="mt-2 flex justify-center">
              <kbd
                className="rounded border border-border bg-muted px-1.5 py-0.5 text-[9px] font-mono font-medium text-muted-foreground/60"
                title="Press [ to expand sidebar"
              >
                [
              </kbd>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
