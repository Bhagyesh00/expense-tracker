"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/cn";
import {
  categorySchema,
  type CategoryInput,
} from "@expenseflow/utils";
import { getCategoryIcon } from "@/components/expenses/category-selector";
import {
  X,
  Loader2,
  Utensils,
  Car,
  ShoppingBag,
  Receipt,
  Film,
  HeartPulse,
  GraduationCap,
  ShoppingCart,
  Home,
  Plane,
  Sparkles,
  Gift,
  TrendingUp,
  Banknote,
  Laptop,
  BarChart2,
  PlusCircle,
  MoreHorizontal,
  Briefcase,
  Coffee,
  Dumbbell,
  Music,
  Gamepad2,
  Shirt,
  Baby,
  Dog,
  Fuel,
  Wifi,
  Phone,
  Book,
  Palette,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const ICON_OPTIONS: { name: string; icon: LucideIcon }[] = [
  { name: "utensils", icon: Utensils },
  { name: "car", icon: Car },
  { name: "shopping-bag", icon: ShoppingBag },
  { name: "receipt", icon: Receipt },
  { name: "film", icon: Film },
  { name: "heart-pulse", icon: HeartPulse },
  { name: "graduation-cap", icon: GraduationCap },
  { name: "shopping-cart", icon: ShoppingCart },
  { name: "home", icon: Home },
  { name: "plane", icon: Plane },
  { name: "sparkles", icon: Sparkles },
  { name: "gift", icon: Gift },
  { name: "trending-up", icon: TrendingUp },
  { name: "banknote", icon: Banknote },
  { name: "laptop", icon: Laptop },
  { name: "bar-chart-2", icon: BarChart2 },
  { name: "plus-circle", icon: PlusCircle },
  { name: "briefcase", icon: Briefcase },
  { name: "coffee", icon: Coffee },
  { name: "dumbbell", icon: Dumbbell },
  { name: "music", icon: Music },
  { name: "gamepad-2", icon: Gamepad2 },
  { name: "shirt", icon: Shirt },
  { name: "baby", icon: Baby },
  { name: "dog", icon: Dog },
  { name: "fuel", icon: Fuel },
  { name: "wifi", icon: Wifi },
  { name: "phone", icon: Phone },
  { name: "book", icon: Book },
  { name: "palette", icon: Palette },
  { name: "wrench", icon: Wrench },
  { name: "ellipsis", icon: MoreHorizontal },
];

const COLOR_OPTIONS = [
  "#FF6B6B", "#4ECDC4", "#FF9F43", "#54A0FF", "#A55EEA",
  "#EE5A6F", "#1DD1A1", "#10AC84", "#5F6C7B", "#0ABDE3",
  "#F368E0", "#FF6348", "#2E86DE", "#27AE60", "#2ECC71",
  "#3498DB", "#E74C3C", "#95A5A6", "#8B5CF6", "#EC4899",
];

interface CategoryFormProps {
  initialData?: Partial<CategoryInput> & { id?: string };
  onSubmit: (data: CategoryInput) => Promise<void>;
  onClose: () => void;
  isSubmitting?: boolean;
}

export function CategoryForm({
  initialData,
  onSubmit,
  onClose,
  isSubmitting = false,
}: CategoryFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name ?? "",
      icon: initialData?.icon ?? "ellipsis",
      color: initialData?.color ?? "#6366f1",
      type: initialData?.type ?? "expense",
    },
  });

  const watchIcon = watch("icon");
  const watchColor = watch("color");
  const watchName = watch("name");
  const watchType = watch("type");

  const SelectedIcon = getCategoryIcon(watchIcon);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">
            {initialData?.id ? "Edit Category" : "New Category"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="p-5 space-y-5"
        >
          {/* Preview */}
          <div className="flex items-center justify-center py-4">
            <div className="flex flex-col items-center gap-2">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${watchColor}20` }}
              >
                <SelectedIcon className="h-7 w-7" style={{ color: watchColor }} />
              </div>
              <span
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: `${watchColor}20`,
                  color: watchColor,
                }}
              >
                {watchName || "Category"}
              </span>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Name
            </label>
            <input
              type="text"
              placeholder="Category name"
              {...register("name")}
              className={cn(
                "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
                errors.name ? "border-destructive" : "border-input",
              )}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Type
            </label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => field.onChange("expense")}
                    className={cn(
                      "flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                      field.value === "expense"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange("income")}
                    className={cn(
                      "flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                      field.value === "income"
                        ? "border-success bg-success/10 text-success"
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    Income
                  </button>
                </div>
              )}
            />
          </div>

          {/* Icon */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Icon
            </label>
            <Controller
              name="icon"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-8 gap-1.5">
                  {ICON_OPTIONS.map(({ name, icon: Ic }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => field.onChange(name)}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                        field.value === name
                          ? "bg-primary/10 ring-2 ring-primary"
                          : "hover:bg-accent",
                      )}
                    >
                      <Ic
                        className="h-4 w-4"
                        style={{
                          color: field.value === name ? watchColor : undefined,
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            />
            {errors.icon && (
              <p className="mt-1 text-xs text-destructive">
                {errors.icon.message}
              </p>
            )}
          </div>

          {/* Color */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Color
            </label>
            <Controller
              name="color"
              control={control}
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => field.onChange(color)}
                      className={cn(
                        "h-8 w-8 rounded-full transition-transform",
                        field.value === color &&
                          "ring-2 ring-offset-2 ring-offset-background scale-110",
                      )}
                      style={{
                        backgroundColor: color,
                        "--tw-ring-color": color,
                      } as React.CSSProperties}
                    />
                  ))}
                </div>
              )}
            />
            {errors.color && (
              <p className="mt-1 text-xs text-destructive">
                {errors.color.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {initialData?.id ? "Save Changes" : "Create Category"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
