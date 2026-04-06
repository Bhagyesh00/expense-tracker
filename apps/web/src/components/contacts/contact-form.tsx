"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactInput } from "@expenseflow/utils";
import { cn } from "@/lib/cn";
import { X, Loader2, User } from "lucide-react";

interface ContactFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ContactInput) => Promise<void>;
  defaultValues?: Partial<ContactInput>;
  mode?: "create" | "edit";
}

export function ContactForm({
  open,
  onClose,
  onSubmit,
  defaultValues,
  mode = "create",
}: ContactFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      upiId: "",
      ...defaultValues,
    },
  });

  const onFormSubmit = useCallback(
    async (data: ContactInput) => {
      setIsSubmitting(true);
      try {
        await onSubmit(data);
        reset();
        onClose();
      } catch {
        // Error handled by parent
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSubmit, onClose, reset],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {mode === "create" ? "Add Contact" : "Edit Contact"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              {...register("name")}
              placeholder="Contact name"
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

          {/* Phone */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Phone
            </label>
            <input
              type="tel"
              {...register("phone")}
              placeholder="+91 98765 43210"
              className={cn(
                "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
                errors.phone ? "border-destructive" : "border-input",
              )}
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-destructive">
                {errors.phone.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              type="email"
              {...register("email")}
              placeholder="contact@example.com"
              className={cn(
                "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
                errors.email ? "border-destructive" : "border-input",
              )}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* UPI ID */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              UPI ID
            </label>
            <input
              type="text"
              {...register("upiId")}
              placeholder="user@upi"
              className={cn(
                "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
                errors.upiId ? "border-destructive" : "border-input",
              )}
            />
            {errors.upiId && (
              <p className="mt-1 text-xs text-destructive">
                {errors.upiId.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "create" ? "Add Contact" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
