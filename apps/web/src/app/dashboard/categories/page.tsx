"use client";

import { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/cn";
import {
  useCategoriesList,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/hooks/use-categories";
import { CategoryForm } from "@/components/categories/category-form";
import { getCategoryIcon } from "@/components/expenses/category-selector";
import type { CategoryInput } from "@expenseflow/utils";
import type { Category } from "@expenseflow/types";
import {
  Plus,
  Edit,
  Trash2,
  Lock,
  Tags,
  Loader2,
} from "lucide-react";

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategoriesList();
  const { createCategory, isPending: isCreating } = useCreateCategory();
  const { updateCategory, isPending: isUpdating } = useUpdateCategory();
  const { deleteCategory } = useDeleteCategory();

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const expenseCategories = useMemo(
    () => categories?.filter((c) => !c.name.match(/salary|freelance|investment return|gift received|other income/i)) ?? [],
    [categories],
  );

  const incomeCategories = useMemo(
    () => categories?.filter((c) => c.name.match(/salary|freelance|investment return|gift received|other income/i)) ?? [],
    [categories],
  );

  const handleCreate = useCallback(
    async (data: CategoryInput) => {
      await createCategory({
        name: data.name,
        icon: data.icon,
        color: data.color,
      });
      setShowForm(false);
    },
    [createCategory],
  );

  const handleUpdate = useCallback(
    async (data: CategoryInput) => {
      if (!editingCategory) return;
      await updateCategory(editingCategory.id, {
        name: data.name,
        icon: data.icon,
        color: data.color,
      });
      setEditingCategory(null);
    },
    [editingCategory, updateCategory],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this category? Expenses using it will be uncategorized.")) return;
      setDeletingId(id);
      try {
        await deleteCategory(id);
      } finally {
        setDeletingId(null);
      }
    },
    [deleteCategory],
  );

  function CategoryCard({ category }: { category: Category }) {
    const Icon = getCategoryIcon(category.icon);
    const isSystem = category.is_default;

    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/30">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${category.color || "#6366f1"}20` }}
        >
          <Icon
            className="h-5 w-5"
            style={{ color: category.color || "#6366f1" }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-foreground truncate">
              {category.name}
            </span>
            {isSystem && (
              <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
            )}
          </div>
        </div>
        {!isSystem && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditingCategory(category)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Edit"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(category.id)}
              disabled={deletingId === category.id}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
              aria-label="Delete"
            >
              {deletingId === category.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 rounded bg-muted animate-pulse" />
          <div className="h-9 w-32 rounded-lg bg-muted animate-pulse" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-muted animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Categories</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Organize your expenses with custom categories
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {/* Expense categories */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Tags className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Expense Categories
          </h2>
          <span className="text-xs text-muted-foreground">
            ({expenseCategories.length})
          </span>
        </div>
        {expenseCategories.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {expenseCategories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No expense categories yet
            </p>
          </div>
        )}
      </div>

      {/* Income categories */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Tags className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Income Categories
          </h2>
          <span className="text-xs text-muted-foreground">
            ({incomeCategories.length})
          </span>
        </div>
        {incomeCategories.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {incomeCategories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No income categories yet
            </p>
          </div>
        )}
      </div>

      {/* Create form modal */}
      {showForm && (
        <CategoryForm
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
          isSubmitting={isCreating}
        />
      )}

      {/* Edit form modal */}
      {editingCategory && (
        <CategoryForm
          initialData={{
            id: editingCategory.id,
            name: editingCategory.name,
            icon: editingCategory.icon ?? "ellipsis",
            color: editingCategory.color ?? "#6366f1",
            type: "expense",
          }}
          onSubmit={handleUpdate}
          onClose={() => setEditingCategory(null)}
          isSubmitting={isUpdating}
        />
      )}
    </div>
  );
}
