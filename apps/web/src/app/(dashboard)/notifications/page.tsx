"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { createBrowserClient } from "@/lib/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bell,
  CheckCheck,
  Filter,
  PiggyBank,
  Clock,
  Sparkles,
  AlertTriangle,
  Info,
  CreditCard,
  Inbox,
  Loader2,
  RefreshCw,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

type FilterType =
  | "all"
  | "unread"
  | "budget"
  | "payment"
  | "ai"
  | "system";

const FILTERS: { label: string; value: FilterType; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: "All", value: "all", icon: Bell },
  { label: "Unread", value: "unread", icon: Bell },
  { label: "Budget Alerts", value: "budget", icon: PiggyBank },
  { label: "Payment Reminders", value: "payment", icon: Clock },
  { label: "AI Insights", value: "ai", icon: Sparkles },
  { label: "System", value: "system", icon: Info },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getNotificationIcon(type: string) {
  if (type.includes("budget")) return { icon: PiggyBank, bg: "bg-warning/10", color: "text-warning" };
  if (type.includes("payment") || type.includes("pending") || type.includes("reminder"))
    return { icon: Clock, bg: "bg-blue-500/10", color: "text-blue-500" };
  if (type.includes("ai") || type.includes("insight"))
    return { icon: Sparkles, bg: "bg-primary/10", color: "text-primary" };
  if (type.includes("anomaly") || type.includes("alert"))
    return { icon: AlertTriangle, bg: "bg-destructive/10", color: "text-destructive" };
  if (type.includes("transaction") || type.includes("expense"))
    return { icon: CreditCard, bg: "bg-success/10", color: "text-success" };
  return { icon: Info, bg: "bg-muted", color: "text-muted-foreground" };
}

function getNotificationLink(notification: Notification): string {
  const { type, data } = notification;
  if (type.includes("budget") && data?.budgetId)
    return `/dashboard/budgets/${data.budgetId}`;
  if ((type.includes("pending") || type.includes("payment")) && data?.paymentId)
    return `/dashboard/pending/${data.paymentId}`;
  if (type.includes("expense") && data?.expenseId)
    return `/dashboard/expenses/${data.expenseId}`;
  if (type.includes("ai") || type.includes("insight"))
    return "/dashboard/insights";
  return "#";
}

function matchesFilter(notification: Notification, filter: FilterType): boolean {
  if (filter === "all") return true;
  if (filter === "unread") return !notification.read_at;
  if (filter === "budget") return notification.type.includes("budget");
  if (filter === "payment")
    return (
      notification.type.includes("payment") ||
      notification.type.includes("pending") ||
      notification.type.includes("reminder")
    );
  if (filter === "ai")
    return notification.type.includes("ai") || notification.type.includes("insight");
  if (filter === "system")
    return !["budget", "payment", "pending", "reminder", "ai", "insight", "expense"].some((k) =>
      notification.type.includes(k)
    );
  return true;
}

// ---------------------------------------------------------------------------
// NotificationRow
// ---------------------------------------------------------------------------

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const isUnread = !notification.read_at;
  const { icon: Icon, bg, color } = getNotificationIcon(notification.type);
  const link = getNotificationLink(notification);
  const router = useRouter();

  const handleClick = useCallback(() => {
    if (isUnread) onMarkRead(notification.id);
    if (link !== "#") router.push(link);
  }, [isUnread, notification.id, onMarkRead, link, router]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className={cn(
        "flex cursor-pointer items-start gap-4 rounded-xl border px-4 py-4 transition-all duration-200",
        "hover:shadow-sm hover:border-border/80",
        isUnread
          ? "border-primary/10 bg-primary/[0.02]"
          : "border-border bg-card"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          bg
        )}
      >
        <Icon className={cn("h-5 w-5", color)} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm leading-snug",
                isUnread
                  ? "font-semibold text-foreground"
                  : "font-medium text-muted-foreground"
              )}
            >
              {notification.title}
            </p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              {notification.body}
            </p>
          </div>
          {isUnread && (
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground/60">
          {timeAgo(notification.created_at)}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [page, setPage] = useState(1);
  const loaderRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const client = createBrowserClient();

  // Get user
  const { data: userData } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await client.auth.getUser();
      return data.user;
    },
    staleTime: 5 * 60 * 1000,
  });

  const userId = userData?.id;

  // Fetch all notifications (we'll paginate client-side for simplicity)
  const {
    data: notifications = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["notifications", userId, "all"],
    queryFn: async () => {
      const { data, error } = await client
        .from("notifications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as Notification[];
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  // Mark read
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client
        .from("notifications")
        .update({ is_read: true } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      queryClient.setQueryData<Notification[]>(
        ["notifications", userId, "all"],
        (old) =>
          old?.map((n) =>
            n.id === id ? { ...n, read_at: new Date().toISOString() } : n
          ) ?? []
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mark all read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await client
        .from("notifications")
        .update({ is_read: true } as any)
        .eq("user_id", userId)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All notifications marked as read");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast.error("Failed to mark notifications as read");
    },
  });

  // Apply filter + paginate
  const filtered = notifications.filter((n) => matchesFilter(n, activeFilter));
  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore) {
          setPage((p) => p + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [activeFilter]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "You're all caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            Refresh
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {FILTERS.map((filter) => {
          const Icon = filter.icon;
          const count =
            filter.value === "unread"
              ? unreadCount
              : filter.value === "all"
              ? notifications.length
              : notifications.filter((n) => matchesFilter(n, filter.value)).length;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                activeFilter === filter.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{filter.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                    activeFilter === filter.value
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-xl border border-border bg-card px-4 py-4"
            >
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                <div className="h-3.5 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/4 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Inbox className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold text-foreground">
            {activeFilter === "unread"
              ? "No unread notifications"
              : "No notifications yet"}
          </p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            {activeFilter === "unread"
              ? "You're all caught up! Check back later."
              : "Notifications about budgets, payments, and AI insights will appear here."}
          </p>
          {activeFilter !== "all" && (
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className="mt-4 text-sm font-medium text-primary hover:underline"
            >
              View all notifications
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onMarkRead={(id) => markReadMutation.mutate(id)}
            />
          ))}

          {/* Infinite scroll loader */}
          <div ref={loaderRef} className="py-2 text-center">
            {hasMore && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading more...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
