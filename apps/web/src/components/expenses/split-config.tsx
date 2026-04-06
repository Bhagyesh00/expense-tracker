"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/cn";
import { Users, Plus, X, AlertCircle } from "lucide-react";

type SplitMethod = "equal" | "percentage" | "exact";

interface Participant {
  id: string;
  name: string;
  amount: number;
  percentage: number;
}

interface SplitConfigProps {
  isSplit: boolean;
  onIsSplitChange: (value: boolean) => void;
  splitMethod: SplitMethod;
  onSplitMethodChange: (method: SplitMethod) => void;
  participants: Participant[];
  onParticipantsChange: (participants: Participant[]) => void;
  totalAmount: number;
  currency: string;
  className?: string;
}

export function SplitConfig({
  isSplit,
  onIsSplitChange,
  splitMethod,
  onSplitMethodChange,
  participants,
  onParticipantsChange,
  totalAmount,
  currency,
  className,
}: SplitConfigProps) {
  const [newName, setNewName] = useState("");

  const addParticipant = useCallback(() => {
    const name = newName.trim();
    if (!name) return;

    const newParticipant: Participant = {
      id: `p-${Date.now()}`,
      name,
      amount: 0,
      percentage: 0,
    };

    const updated = [...participants, newParticipant];
    recalculate(updated, splitMethod, totalAmount);
    onParticipantsChange(updated);
    setNewName("");
  }, [newName, participants, onParticipantsChange, splitMethod, totalAmount]);

  const removeParticipant = useCallback(
    (id: string) => {
      const updated = participants.filter((p) => p.id !== id);
      recalculate(updated, splitMethod, totalAmount);
      onParticipantsChange(updated);
    },
    [participants, onParticipantsChange, splitMethod, totalAmount],
  );

  const recalculate = (
    parts: Participant[],
    method: SplitMethod,
    total: number,
  ) => {
    if (parts.length === 0) return;
    if (method === "equal") {
      const perPerson = total / parts.length;
      const pct = 100 / parts.length;
      parts.forEach((p) => {
        p.amount = Math.round(perPerson * 100) / 100;
        p.percentage = Math.round(pct * 100) / 100;
      });
    }
  };

  const handleMethodChange = useCallback(
    (method: SplitMethod) => {
      onSplitMethodChange(method);
      const updated = [...participants];
      recalculate(updated, method, totalAmount);
      onParticipantsChange(updated);
    },
    [participants, onParticipantsChange, onSplitMethodChange, totalAmount],
  );

  const updateParticipantValue = useCallback(
    (id: string, field: "amount" | "percentage", val: number) => {
      const updated = participants.map((p) => {
        if (p.id !== id) return p;
        if (field === "amount") {
          return {
            ...p,
            amount: val,
            percentage: totalAmount > 0 ? (val / totalAmount) * 100 : 0,
          };
        }
        return {
          ...p,
          percentage: val,
          amount: (val / 100) * totalAmount,
        };
      });
      onParticipantsChange(updated);
    },
    [participants, onParticipantsChange, totalAmount],
  );

  const splitTotal = participants.reduce((sum, p) => sum + p.amount, 0);
  const isValid =
    participants.length === 0 ||
    Math.abs(splitTotal - totalAmount) < 0.01;

  const currencySymbol =
    currency === "INR"
      ? "\u20B9"
      : currency === "USD"
        ? "$"
        : currency === "EUR"
          ? "\u20AC"
          : currency;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Split this expense
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isSplit}
          onClick={() => onIsSplitChange(!isSplit)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
            isSplit ? "bg-primary" : "bg-input",
          )}
        >
          <span
            className={cn(
              "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg transition-transform",
              isSplit ? "translate-x-5" : "translate-x-0",
            )}
          />
        </button>
      </div>

      {isSplit && (
        <div className="space-y-4 rounded-lg border border-border bg-accent/30 p-4">
          {/* Split method */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Split method
            </label>
            <div className="flex gap-2">
              {(["equal", "percentage", "exact"] as SplitMethod[]).map(
                (method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => handleMethodChange(method)}
                    className={cn(
                      "rounded-lg border px-4 py-2 text-xs font-medium capitalize transition-colors",
                      splitMethod === method
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground hover:bg-accent",
                    )}
                  >
                    {method}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Add participant */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addParticipant();
                }
              }}
              placeholder="Enter name..."
              className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={addParticipant}
              disabled={!newName.trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>

          {/* Participants list */}
          {participants.length > 0 && (
            <div className="space-y-2">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {p.name[0]?.toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm font-medium text-foreground truncate">
                    {p.name}
                  </span>

                  {splitMethod === "equal" ? (
                    <span className="text-sm font-semibold text-foreground">
                      {currencySymbol}
                      {p.amount.toFixed(2)}
                    </span>
                  ) : splitMethod === "percentage" ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={p.percentage || ""}
                        onChange={(e) =>
                          updateParticipantValue(
                            p.id,
                            "percentage",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="h-7 w-16 rounded border border-input bg-background px-2 text-right text-xs outline-none focus:ring-1 focus:ring-ring"
                        min={0}
                        max={100}
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        {currencySymbol}
                      </span>
                      <input
                        type="number"
                        value={p.amount || ""}
                        onChange={(e) =>
                          updateParticipantValue(
                            p.id,
                            "amount",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="h-7 w-20 rounded border border-input bg-background px-2 text-right text-xs outline-none focus:ring-1 focus:ring-ring"
                        min={0}
                        step={0.01}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => removeParticipant(p.id)}
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${p.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {participants.length > 0 && (
            <div
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-2 text-xs",
                isValid
                  ? "bg-primary/5 text-primary"
                  : "bg-destructive/5 text-destructive",
              )}
            >
              <div className="flex items-center gap-1.5">
                {!isValid && <AlertCircle className="h-3.5 w-3.5" />}
                <span>
                  {participants.length} people
                  {splitMethod === "equal" &&
                    `, ${currencySymbol}${(totalAmount / participants.length).toFixed(2)} each`}
                </span>
              </div>
              {!isValid && (
                <span className="font-medium">
                  Difference: {currencySymbol}
                  {Math.abs(splitTotal - totalAmount).toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
