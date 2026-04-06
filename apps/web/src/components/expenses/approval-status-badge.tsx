"use client";

import { useState } from "react";
import {
  Clock,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from "lucide-react";

type ApprovalStatus = "none" | "pending" | "approved" | "rejected";

interface ApprovalEvent {
  action: string;
  user: string;
  comment?: string;
  timestamp: string;
}

interface ApprovalStatusBadgeProps {
  status: ApprovalStatus;
  timeline?: ApprovalEvent[];
}

const STATUS_CONFIG: Record<
  ApprovalStatus,
  {
    label: string;
    bg: string;
    text: string;
    icon: typeof Clock;
  }
> = {
  none: {
    label: "No approval needed",
    bg: "bg-muted",
    text: "text-muted-foreground",
    icon: Check,
  },
  pending: {
    label: "Pending approval",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-400",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
    icon: Check,
  },
  rejected: {
    label: "Rejected",
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
    icon: X,
  },
};

export function ApprovalStatusBadge({
  status,
  timeline,
}: ApprovalStatusBadgeProps) {
  const [showTimeline, setShowTimeline] = useState(false);
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => timeline && setShowTimeline(!showTimeline)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bg} ${config.text} ${timeline ? "cursor-pointer" : "cursor-default"}`}
      >
        <Icon className="h-3 w-3" />
        {config.label}
        {timeline && timeline.length > 0 && (
          <>
            {showTimeline ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </>
        )}
      </button>

      {showTimeline && timeline && timeline.length > 0 && (
        <div className="absolute left-0 top-full z-10 mt-1 w-72 rounded-lg border border-border bg-card p-3 shadow-lg">
          <p className="mb-2 text-xs font-semibold text-foreground">
            Approval Timeline
          </p>
          <div className="space-y-3">
            {timeline.map((event, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                    {event.action === "Approved" ? (
                      <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                    ) : event.action === "Rejected" ? (
                      <X className="h-3 w-3 text-red-600 dark:text-red-400" />
                    ) : (
                      <Clock className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                  {idx < timeline.length - 1 && (
                    <div className="mt-1 h-full w-px bg-border" />
                  )}
                </div>
                <div className="min-w-0 flex-1 pb-2">
                  <p className="text-xs font-medium text-foreground">
                    {event.action}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.user} &middot;{" "}
                    {new Date(event.timestamp).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {event.comment && (
                    <div className="mt-1 flex items-start gap-1 rounded bg-muted/50 px-2 py-1">
                      <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        {event.comment}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
