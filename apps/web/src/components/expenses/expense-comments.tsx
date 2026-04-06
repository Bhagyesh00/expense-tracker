"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/cn";
import { createBrowserClient } from "@/lib/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, Edit, Trash2, Loader2, X, Check } from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Comment {
  id: string;
  expense_id: string;
  user_id: string;
  text: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name?: string;
    avatar_url?: string;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getInitials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// @mention highlighting
function renderTextWithMentions(text: string) {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="font-medium text-primary">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

function Avatar({ name, src }: { name?: string; src?: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? "User"}
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
      {getInitials(name)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comment item
// ---------------------------------------------------------------------------

function CommentItem({
  comment,
  currentUserId,
  onEdit,
  onDelete,
}: {
  comment: Comment;
  currentUserId: string;
  onEdit: (id: string, newText: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [isSaving, setIsSaving] = useState(false);
  const isOwn = comment.user_id === currentUserId;

  const handleSave = async () => {
    if (!editText.trim()) return;
    setIsSaving(true);
    await onEdit(comment.id, editText.trim());
    setEditing(false);
    setIsSaving(false);
  };

  return (
    <div className="flex gap-3">
      <Avatar
        name={comment.profiles?.full_name}
        src={comment.profiles?.avatar_url}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">
            {comment.profiles?.full_name ?? "User"}
          </span>
          <span className="text-xs text-muted-foreground">
            {getRelativeTime(comment.created_at)}
          </span>
          {comment.updated_at !== comment.created_at && (
            <span className="text-xs text-muted-foreground italic">(edited)</span>
          )}
        </div>

        {editing ? (
          <div className="mt-1.5 space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={2}
              autoFocus
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !editText.trim()}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Save
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setEditText(comment.text); }}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent"
              >
                <X className="h-3 w-3" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 text-sm text-foreground leading-relaxed">
            {renderTextWithMentions(comment.text)}
          </p>
        )}
      </div>

      {/* Actions (own comments only) */}
      {isOwn && !editing && (
        <div className="flex shrink-0 items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Edit comment"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(comment.id)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Delete comment"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ExpenseCommentsProps {
  expenseId: string;
  className?: string;
}

export function ExpenseComments({ expenseId, className }: ExpenseCommentsProps) {
  const client = createBrowserClient();
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState("");
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    client.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, [client]);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["expense_comments", expenseId],
    queryFn: async (): Promise<Comment[]> => {
      const { data, error } = await client
        .from("expense_comments")
        .select("*, profiles(full_name, avatar_url)")
        .eq("expense_id", expenseId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Comment[];
    },
    enabled: !!expenseId,
  });

  const addComment = useCallback(async () => {
    if (!commentText.trim() || !currentUserId) return;
    setIsSubmitting(true);
    try {
      const { error } = await client.from("expense_comments").insert({
        expense_id: expenseId,
        user_id: currentUserId,
        text: commentText.trim(),
      } as any);
      if (error) throw error;
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["expense_comments", expenseId] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  }, [client, expenseId, currentUserId, commentText, queryClient]);

  const editComment = useCallback(
    async (id: string, newText: string) => {
      const { error } = await client
        .from("expense_comments")
        .update({ text: newText } as any)
        .eq("id", id);
      if (error) { toast.error(error.message); return; }
      queryClient.invalidateQueries({ queryKey: ["expense_comments", expenseId] });
    },
    [client, expenseId, queryClient],
  );

  const deleteComment = useCallback(
    async (id: string) => {
      if (!confirm("Delete this comment?")) return;
      const { error } = await client.from("expense_comments").delete().eq("id", id);
      if (error) { toast.error(error.message); return; }
      queryClient.invalidateQueries({ queryKey: ["expense_comments", expenseId] });
      toast.success("Comment deleted");
    },
    [client, expenseId, queryClient],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        addComment();
      }
    },
    [addComment],
  );

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      {/* Header */}
      <div className="mb-5 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">
          Comments
          {comments.length > 0 && (
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
              {comments.length}
            </span>
          )}
        </h3>
      </div>

      {/* Comment list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                <div className="h-4 w-48 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No comments yet. Be the first to add one.
        </p>
      ) : (
        <div className="space-y-5">
          {comments.map((comment) => (
            <div key={comment.id} className="group">
              <CommentItem
                comment={comment}
                currentUserId={currentUserId}
                onEdit={editComment}
                onDelete={deleteComment}
              />
            </div>
          ))}
        </div>
      )}

      {/* Add comment */}
      <div className="mt-5 border-t border-border pt-5">
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {currentUserId ? "U" : "?"}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="Add a comment… Use @name to mention someone. Cmd+Enter to submit."
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {commentText.length > 0 && `${commentText.length} chars`}
              </span>
              <button
                type="button"
                onClick={addComment}
                disabled={!commentText.trim() || isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
