"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { useTemplates, type ExpenseTemplate, type CreateTemplateInput } from "@/hooks/use-import";
import { useFormatCurrency } from "@/hooks/use-currency";
import { TemplateForm } from "@/components/expenses/template-form";
import { getCategoryIcon } from "@/components/expenses/category-selector";
import {
  ArrowLeft,
  Plus,
  Zap,
  RefreshCw,
  LayoutGrid,
  Edit,
  Trash2,
  MoreHorizontal,
  FileBox,
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Template card
// ---------------------------------------------------------------------------

function TemplateCard({
  template,
  onUse,
  onEdit,
  onDelete,
}: {
  template: ExpenseTemplate;
  onUse: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { formatCurrency } = useFormatCurrency();
  const [menuOpen, setMenuOpen] = useState(false);
  const isExpense = template.type === "expense";

  return (
    <div className="group relative flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      {/* Type badge */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
            isExpense
              ? "bg-destructive/10 text-destructive"
              : "bg-success/10 text-success",
          )}
        >
          {isExpense ? (
            <ArrowDownCircle className="h-3 w-3" />
          ) : (
            <ArrowUpCircle className="h-3 w-3" />
          )}
          {isExpense ? "Expense" : "Income"}
        </span>

        {/* Actions menu */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-50 mt-1 w-36 rounded-lg border border-border bg-popover py-1 shadow-lg">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onEdit(); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </button>
                <hr className="my-1 border-border" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete(); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Template info */}
      <div className="flex-1 space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{template.name}</h3>
        {template.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
        )}
      </div>

      {/* Amount */}
      <div className="text-lg font-bold text-foreground">
        {template.variable_amount ? (
          <span className="text-sm font-medium text-muted-foreground italic">Variable amount</span>
        ) : template.amount != null ? (
          formatCurrency(template.amount, template.currency)
        ) : (
          <span className="text-sm font-medium text-muted-foreground italic">No amount set</span>
        )}
      </div>

      {/* Tags */}
      {template.tags && template.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Use count + button */}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">
          Used {template.use_count} time{template.use_count !== 1 ? "s" : ""}
        </span>
        <button
          type="button"
          onClick={onUse}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Zap className="h-3.5 w-3.5" />
          Use Template
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TemplatesPage() {
  const router = useRouter();
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate, isCreating, isUpdating, incrementUse } = useTemplates();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ExpenseTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<"frequent" | "all">("all");

  const handleCreate = useCallback(
    async (data: CreateTemplateInput) => {
      await createTemplate(data);
      setShowForm(false);
    },
    [createTemplate],
  );

  const handleEdit = useCallback(
    async (data: CreateTemplateInput) => {
      if (!editingTemplate) return;
      await updateTemplate({ id: editingTemplate.id, input: data });
      setEditingTemplate(null);
    },
    [editingTemplate, updateTemplate],
  );

  const handleUse = useCallback(
    async (template: ExpenseTemplate) => {
      await incrementUse(template.id);
      const params = new URLSearchParams();
      if (template.description) params.set("description", template.description);
      if (template.amount && !template.variable_amount) params.set("amount", template.amount.toString());
      if (template.category_id) params.set("categoryId", template.category_id);
      params.set("type", template.type);
      params.set("currency", template.currency);
      if (template.notes) params.set("notes", template.notes);
      router.push(`/dashboard/expenses/new?${params.toString()}`);
    },
    [router, incrementUse],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this template?")) return;
      await deleteTemplate(id);
    },
    [deleteTemplate],
  );

  const displayedTemplates =
    activeTab === "frequent"
      ? [...templates].sort((a, b) => b.use_count - a.use_count).slice(0, 6)
      : templates;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/expenses"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Back to expenses"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Expense Templates</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Save common expenses for quick entry
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Template
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-input bg-muted/30 p-1 w-fit">
        {(
          [
            { value: "all" as const, label: "All", icon: LayoutGrid },
            { value: "frequent" as const, label: "Most Used", icon: Zap },
          ] as const
        ).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              activeTab === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileBox className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No templates yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Save common expenses as templates for quick entry. Great for recurring bills, lunch, or petrol.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create your first template
          </button>
        </div>
      )}

      {/* Template grid */}
      {!isLoading && displayedTemplates.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayedTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onUse={() => handleUse(template)}
              onEdit={() => setEditingTemplate(template)}
              onDelete={() => handleDelete(template.id)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <TemplateForm
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
          isSubmitting={isCreating}
        />
      )}

      {/* Edit modal */}
      {editingTemplate && (
        <TemplateForm
          template={editingTemplate}
          onSubmit={handleEdit}
          onClose={() => setEditingTemplate(null)}
          isSubmitting={isUpdating}
        />
      )}
    </div>
  );
}
