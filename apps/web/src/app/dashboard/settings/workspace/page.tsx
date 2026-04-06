"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/cn";
import { toast } from "sonner";
import Link from "next/link";
import {
  Loader2,
  ArrowLeft,
  Mail,
  UserPlus,
  Trash2,
  Clock,
  Shield,
} from "lucide-react";

const inviteSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  role: z.enum(["admin", "editor", "viewer"]),
});

type InviteInput = z.infer<typeof inviteSchema>;

interface Member {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "editor" | "viewer";
  avatarUrl?: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  sentAt: string;
}

export default function WorkspaceSettingsPage() {
  const [isSending, setIsSending] = useState(false);

  // Placeholder data -- in production this comes from the API
  const [members] = useState<Member[]>([]);
  const [invitations] = useState<Invitation[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "viewer" },
  });

  const onInvite = async (data: InviteInput) => {
    setIsSending(true);
    try {
      // TODO: call API to send invitation
      toast.success(`Invitation sent to ${data.email}`);
      reset();
    } catch {
      toast.error("Failed to send invitation");
    } finally {
      setIsSending(false);
    }
  };

  const roleColors: Record<string, string> = {
    owner: "bg-primary/10 text-primary",
    admin: "bg-warning/10 text-warning",
    editor: "bg-success/10 text-success",
    viewer: "bg-muted text-muted-foreground",
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
          <h1 className="text-2xl font-bold text-foreground">Workspace Settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage your workspace and team members
          </p>
        </div>
      </div>

      {/* Workspace name */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Workspace Name</h2>
        <p className="text-sm text-muted-foreground">Personal Workspace</p>
      </div>

      {/* Invite members */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Invite Members</h2>
        <form onSubmit={handleSubmit(onInvite)} className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 space-y-1">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                placeholder="colleague@example.com"
                {...register("email")}
                className={cn(
                  "h-10 w-full rounded-lg border bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors",
                  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                  errors.email ? "border-destructive" : "border-input"
                )}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <select
            {...register("role")}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground appearance-none focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={isSending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Invite
          </button>
        </form>
      </div>

      {/* Members list */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-6 py-4">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Members</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </span>
        </div>
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-muted-foreground">No team members yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Invite your first team member above
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 px-6 py-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {member.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.email}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                    roleColors[member.role] || roleColors.viewer
                  )}
                >
                  {member.role}
                </span>
                {member.role !== "owner" && (
                  <button
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    onClick={() => toast.info("Remove member feature coming soon")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending invitations */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-6 py-4">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Pending Invitations</h2>
        </div>
        {invitations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-muted-foreground">No pending invitations</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between px-6 py-3"
              >
                <div>
                  <p className="text-sm text-foreground">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Sent {inv.sentAt} &middot; {inv.role}
                  </p>
                </div>
                <button
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  onClick={() => toast.info("Cancel invitation feature coming soon")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
