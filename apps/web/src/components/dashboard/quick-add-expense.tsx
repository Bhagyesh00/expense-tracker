"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { useUIStore } from "@/stores/ui-store";
import { useCreateExpense } from "@/hooks/use-expenses";
import { useCategoriesList } from "@/hooks/use-categories";
import { getCategoryIcon } from "@/components/expenses/category-selector";
import {
  quickAddExpenseSchema,
  type QuickAddExpenseInput,
} from "@expenseflow/utils";
import { SUPPORTED_CURRENCIES } from "@expenseflow/utils";
import {
  Plus,
  X,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export function QuickAddExpense() {
  const router = useRouter();
  const { quickAddOpen, setQuickAddOpen } = useUIStore();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);
  const { createExpense, isPending } = useCreateExpense();
  const { data: categories } = useCategoriesList();
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<QuickAddExpenseInput>({
    resolver: zodResolver(quickAddExpenseSchema),
    defaultValues: {
      amount: undefined,
      description: "",
      categoryId: "",
    },
  });

  const amountField = register("amount", { valueAsNumber: true });

  // Keyboard shortcut: Ctrl+N
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setQuickAddOpen(true);
      }
      if (e.key === "Escape" && quickAddOpen) {
        setQuickAddOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [quickAddOpen, setQuickAddOpen]);

  // Focus input when opening
  useEffect(() => {
    if (quickAddOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [quickAddOpen]);

  const onSubmit = useCallback(
    async (data: QuickAddExpenseInput) => {
      if (!workspaceId) return;
      try {
        await createExpense({
          workspace_id: workspaceId,
          user_id: "",
          category_id: data.categoryId,
          type: "expense",
          amount: data.amount,
          currency: "INR",
          description: data.description,
          date: new Date().toISOString().split("T")[0],
        });
        setShowSuccess(true);
        reset();
        setTimeout(() => {
          setShowSuccess(false);
          setQuickAddOpen(false);
        }, 1500);
      } catch {
        // Toast handled
      }
    },
    [workspaceId, createExpense, reset, setQuickAddOpen],
  );

  const scrollCategories = useCallback((direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -200 : 200,
        behavior: "smooth",
      });
    }
  }, []);

  const watchCategoryId = watch("categoryId");

  return (
    <>
      {/* FAB */}
      <button
        type="button"
        onClick={() => setQuickAddOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:scale-105 active:scale-95",
          quickAddOpen && "hidden",
        )}
        aria-label="Quick add expense"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Modal */}
      {quickAddOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {showSuccess ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2 className="h-7 w-7 text-success" />
                </div>
                <p className="text-base font-semibold text-foreground">
                  Expense added!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)}>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <h2 className="text-sm font-semibold text-foreground">
                    Quick Add
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setQuickAddOpen(false);
                        router.push("/dashboard/expenses/new");
                      }}
                      className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      Full form
                      <ArrowRight className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickAddOpen(false)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  {/* Amount */}
                  <div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">
                        {"\u20B9"}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...amountField}
                        ref={(e) => {
                          amountField.ref(e);
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (inputRef as any).current = e;
                        }}
                        className={cn(
                          "h-14 w-full rounded-xl border bg-background pl-12 pr-4 text-2xl font-bold text-foreground outline-none focus:ring-2 focus:ring-ring",
                          errors.amount ? "border-destructive" : "border-input",
                        )}
                      />
                    </div>
                    {errors.amount && (
                      <p className="mt-1 text-xs text-destructive">
                        {errors.amount.message}
                      </p>
                    )}
                  </div>

                  {/* Category horizontal scroll */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Category
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => scrollCategories("left")}
                        className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/90 p-1 shadow-sm border border-border text-muted-foreground hover:text-foreground"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <Controller
                        name="categoryId"
                        control={control}
                        render={({ field }) => (
                          <div
                            ref={scrollRef}
                            className="flex gap-2 overflow-x-auto scrollbar-none px-6 py-1"
                          >
                            {(categories ?? []).map((cat) => {
                              const Icon = getCategoryIcon(cat.icon);
                              const isSelected = field.value === cat.id;
                              return (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => field.onChange(cat.id)}
                                  className={cn(
                                    "flex shrink-0 flex-col items-center gap-1 rounded-lg border p-2 transition-all min-w-[60px]",
                                    isSelected
                                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                                      : "border-border hover:border-primary/30",
                                  )}
                                >
                                  <Icon
                                    className="h-4 w-4"
                                    style={{
                                      color: cat.color || "#6366f1",
                                    }}
                                  />
                                  <span className="text-[10px] font-medium text-foreground line-clamp-1 leading-tight">
                                    {cat.name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => scrollCategories("right")}
                        className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/90 p-1 shadow-sm border border-border text-muted-foreground hover:text-foreground"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {errors.categoryId && (
                      <p className="mt-1 text-xs text-destructive">
                        {errors.categoryId.message}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <input
                      type="text"
                      placeholder="What was this for?"
                      {...register("description")}
                      className={cn(
                        "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
                        errors.description
                          ? "border-destructive"
                          : "border-input",
                      )}
                    />
                    {errors.description && (
                      <p className="mt-1 text-xs text-destructive">
                        {errors.description.message}
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Add Expense
                  </button>
                </div>

                {/* Footer hint */}
                <div className="border-t border-border px-5 py-2">
                  <p className="text-center text-[10px] text-muted-foreground">
                    Press <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Ctrl+N</kbd> to quick add
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
