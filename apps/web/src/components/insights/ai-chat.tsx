"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/cn";
import {
  Send,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  highlights?: string[];
  suggestions?: string[];
  sources?: string;
  timestamp: Date;
}

interface AiChatProps {
  onQuery: (question: string) => Promise<{
    text: string;
    highlights?: string[];
    suggestions?: string[];
    sources?: string;
  }>;
  initialSuggestions?: string[];
  className?: string;
  placeholder?: string;
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="h-4 w-4 text-primary" />
      </div>
      <div className="ml-2 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-primary/60 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function MessageBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  if (message.role === "user") {
    return (
      <div className="flex justify-end px-4 py-2">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  // Format assistant message: bold **text**, bullet points
  const formatText = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      // Bullet point
      if (line.trim().startsWith("- ") || line.trim().startsWith("• ")) {
        return (
          <li key={i} className="ml-4 list-disc text-foreground">
            {line.replace(/^[\-•]\s/, "")}
          </li>
        );
      }
      // Bold
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className={cn("text-foreground", i > 0 && "mt-1")}>
          {parts.map((part, j) =>
            j % 2 === 1 ? (
              <strong key={j} className="font-semibold text-primary">
                {part}
              </strong>
            ) : (
              <span key={j}>{part}</span>
            )
          )}
        </p>
      );
    });
  };

  return (
    <div className="px-4 py-2">
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 space-y-3">
          {/* Main text */}
          <div className="rounded-2xl rounded-tl-sm border border-border bg-card p-4 shadow-sm">
            <div className="space-y-1 text-sm">{formatText(message.content)}</div>

            {/* Highlights */}
            {message.highlights && message.highlights.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.highlights.map((h, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                  >
                    {h}
                  </span>
                ))}
              </div>
            )}

            {/* Sources */}
            {message.sources && (
              <p className="mt-3 text-xs text-muted-foreground border-t border-border/50 pt-2">
                {message.sources}
              </p>
            )}

            {/* Actions */}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {message.timestamp.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-success" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Follow-up suggestions */}
          {message.suggestions && message.suggestions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground pl-1">
                Follow-up questions:
              </p>
              <div className="flex flex-col gap-1">
                {message.suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-accent hover:border-primary/30"
                    onClick={() => {
                      // Emit suggestion click via a custom event so the parent can handle it
                      const event = new CustomEvent("ai-suggestion-click", {
                        detail: { query: s },
                        bubbles: true,
                      });
                      document.dispatchEvent(event);
                    }}
                  >
                    <ChevronRight className="h-3 w-3 text-primary shrink-0" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AiChat
// ---------------------------------------------------------------------------

export function AiChat({
  onQuery,
  initialSuggestions = [
    "What did I spend most on this month?",
    "Show me my food expenses trend",
    "Which day do I spend the most?",
    "Am I on track with my budget?",
  ],
  className,
  placeholder = "Ask anything about your spending...",
  compact = false,
}: AiChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Listen for suggestion clicks from message bubbles
  useEffect(() => {
    const handler = (e: Event) => {
      const query = (e as CustomEvent<{ query: string }>).detail.query;
      setInput(query);
      inputRef.current?.focus();
    };
    document.addEventListener("ai-suggestion-click", handler);
    return () => document.removeEventListener("ai-suggestion-click", handler);
  }, []);

  const handleSubmit = useCallback(
    async (question: string) => {
      if (!question.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: question.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      try {
        const result = await onQuery(question.trim());

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.text,
          highlights: result.highlights,
          suggestions: result.suggestions,
          sources: result.sources,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err: unknown) {
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "I couldn't process your question right now. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        toast.error("Failed to get AI response");
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, onQuery]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(input);
      }
    },
    [input, handleSubmit]
  );

  const handleReset = useCallback(() => {
    setMessages([]);
    setInput("");
  }, []);

  const isEmpty = messages.length === 0;

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden",
        compact ? "max-h-[400px]" : "min-h-[400px]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">
            AI Assistant
          </span>
        </div>
        {!isEmpty && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Ask me about your finances
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              I can analyze your spending, find trends, and answer questions
            </p>
            {!compact && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {initialSuggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSubmit(s)}
                    className="rounded-full border border-border bg-accent/50 px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="py-2">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={isLoading}
            className={cn(
              "flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "max-h-32 overflow-y-auto scrollbar-thin"
            )}
            style={{ height: "auto" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
            }}
          />
          <button
            type="button"
            onClick={() => handleSubmit(input)}
            disabled={!input.trim() || isLoading}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all",
              input.trim() && !isLoading
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          Press Enter to send &middot; Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
