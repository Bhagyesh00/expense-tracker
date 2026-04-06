"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/cn";
import { useContactsList, useCreateContact } from "@/hooks/use-contacts";
import { useUIStore } from "@/stores/ui-store";
import type { CreateRecurringPaymentInput, RecurringPayment } from "@/hooks/use-import";
import {
  X,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Plus,
  UserPlus,
  RefreshCw,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const recurringSchema = z.object({
  direction: z.enum(["give", "receive"]),
  contactId: z.string().min(1, "Contact is required"),
  amount: z
    .number({ required_error: "Amount is required", invalid_type_error: "Must be a number" })
    .positive("Must be greater than zero"),
  currency: z.string().min(3).max(3).default("INR"),
  description: z.string().min(1, "Description is required").max(255).trim(),
  interval: z.enum(["weekly", "bi-weekly", "monthly", "quarterly", "yearly"]),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional(),
  hasEndDate: z.boolean().default(false),
  auto_generate: z.boolean().default(false),
  auto_generate_days_before: z.number().int().min(0).max(30).default(3),
  notes: z.string().max(2000).optional(),
});

type RecurringFormValues = z.infer<typeof recurringSchema>;

const INTERVALS: { value: RecurringFormValues["interval"]; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RecurringPaymentFormProps {
  payment?: RecurringPayment | null;
  onSubmit: (data: CreateRecurringPaymentInput) => Promise<void>;
  onClose: () => void;
  isSubmitting?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecurringPaymentForm({
  payment,
  onSubmit,
  onClose,
  isSubmitting = false,
}: RecurringPaymentFormProps) {
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);
  const { data: contacts, isLoading: contactsLoading } = useContactsList();
  const { createContact } = useCreateContact();

  const [contactSearch, setContactSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [creatingContact, setCreatingContact] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RecurringFormValues>({
    defaultValues: {
      direction: payment?.direction ?? "give",
      contactId: payment?.contact_id ?? "",
      amount: payment?.amount ?? undefined,
      currency: payment?.currency ?? "INR",
      description: payment?.description ?? "",
      interval: payment?.interval ?? "monthly",
      start_date: payment?.start_date ?? new Date().toISOString().split("T")[0],
      end_date: payment?.end_date ?? "",
      hasEndDate: !!payment?.end_date,
      auto_generate: payment?.auto_generate ?? false,
      auto_generate_days_before: payment?.auto_generate_days_before ?? 3,
      notes: payment?.notes ?? "",
    },
  });

  const direction = watch("direction");
  const contactId = watch("contactId");
  const hasEndDate = watch("hasEndDate");
  const autoGenerate = watch("auto_generate");

  const selectedContact = useMemo(
    () => contacts?.find((c) => c.id === contactId),
    [contacts, contactId],
  );

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    if (!contactSearch) return contacts;
    const lower = contactSearch.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.phone?.includes(contactSearch),
    );
  }, [contacts, contactSearch]);

  const handleCreateContact = useCallback(async () => {
    if (!newContactName.trim() || !workspaceId) return;
    setCreatingContact(true);
    try {
      const contact = await createContact({
        workspace_id: workspaceId,
        name: newContactName.trim(),
        phone: newContactPhone || undefined,
      });
      setValue("contactId", contact.id);
      setShowNewContact(false);
      setShowDropdown(false);
      setNewContactName("");
      setNewContactPhone("");
    } catch {
      // Handled
    } finally {
      setCreatingContact(false);
    }
  }, [newContactName, newContactPhone, workspaceId, createContact, setValue]);

  const handleFormSubmit = useCallback(
    async (values: RecurringFormValues) => {
      await onSubmit({
        contact_id: values.contactId,
        direction: values.direction,
        amount: values.amount,
        currency: values.currency,
        description: values.description,
        interval: values.interval,
        start_date: values.start_date,
        end_date: values.hasEndDate ? values.end_date : undefined,
        auto_generate: values.auto_generate,
        auto_generate_days_before: values.auto_generate_days_before,
        notes: values.notes,
      });
    },
    [onSubmit],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">
              {payment ? "Edit Recurring Payment" : "Create Recurring Payment"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5 p-6">
          {/* Direction */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Direction</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setValue("direction", "give")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-semibold transition-all",
                  direction === "give"
                    ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                    : "border-border bg-card text-muted-foreground hover:border-red-300",
                )}
              >
                <ArrowUpRight className="h-4 w-4" />
                I Owe (Give)
              </button>
              <button
                type="button"
                onClick={() => setValue("direction", "receive")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-semibold transition-all",
                  direction === "receive"
                    ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    : "border-border bg-card text-muted-foreground hover:border-green-300",
                )}
              >
                <ArrowDownLeft className="h-4 w-4" />
                Owed to Me
              </button>
            </div>
          </div>

          {/* Contact */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Contact <span className="text-destructive">*</span>
            </label>
            {selectedContact ? (
              <div className="flex items-center justify-between rounded-lg border border-input bg-background p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {selectedContact.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-foreground">{selectedContact.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setValue("contactId", ""); setShowDropdown(true); }}
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={contactSearch}
                    onChange={(e) => { setContactSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search contacts..."
                    className={cn(
                      "h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring",
                      errors.contactId ? "border-destructive" : "border-input",
                    )}
                  />
                </div>
                {showDropdown && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowDropdown(false)} />
                    <div className="absolute z-40 mt-1 w-full max-h-52 overflow-auto rounded-lg border border-border bg-popover shadow-lg">
                      {contactsLoading ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <>
                          {filteredContacts.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => { setValue("contactId", c.id); setShowDropdown(false); setContactSearch(""); }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                            >
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium">{c.name}</span>
                            </button>
                          ))}
                          {filteredContacts.length === 0 && (
                            <p className="px-3 py-2 text-sm text-muted-foreground">No contacts</p>
                          )}
                          <hr className="border-border" />
                          <button
                            type="button"
                            onClick={() => { setShowNewContact(true); setShowDropdown(false); setNewContactName(contactSearch); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-accent"
                          >
                            <UserPlus className="h-4 w-4" />
                            Create new contact
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
            {errors.contactId && (
              <p className="mt-1 text-xs text-destructive">{errors.contactId.message}</p>
            )}
            {showNewContact && (
              <div className="mt-2 space-y-2 rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">New Contact</span>
                  <button type="button" onClick={() => setShowNewContact(false)}>
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <input
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Name"
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={handleCreateContact}
                  disabled={!newContactName.trim() || creatingContact}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {creatingContact ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Create Contact
                </button>
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Amount <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("amount", { valueAsNumber: true })}
                className={cn(
                  "h-10 w-full rounded-lg border bg-background pl-8 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring",
                  errors.amount ? "border-destructive" : "border-input",
                )}
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Description <span className="text-destructive">*</span>
            </label>
            <input
              {...register("description")}
              placeholder="What is this recurring payment for?"
              className={cn(
                "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring",
                errors.description ? "border-destructive" : "border-input",
              )}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Interval */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Recurrence Interval</label>
            <div className="flex flex-wrap gap-2">
              {INTERVALS.map(({ value, label }) => {
                const current = watch("interval");
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue("interval", value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      current === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start date */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Start Date <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              {...register("start_date")}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* End date */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setValue("hasEndDate", !hasEndDate)}
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                  hasEndDate ? "bg-primary" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-3 w-3 rounded-full bg-white shadow transition-transform",
                    hasEndDate ? "translate-x-5" : "translate-x-1",
                  )}
                />
              </button>
              <label className="text-sm font-medium text-foreground">Set end date</label>
            </div>
            {hasEndDate && (
              <input
                type="date"
                {...register("end_date")}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            )}
          </div>

          {/* Auto-generate */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Auto-generate</p>
                <p className="text-xs text-muted-foreground">
                  Automatically create a pending payment before the due date
                </p>
              </div>
              <button
                type="button"
                onClick={() => setValue("auto_generate", !autoGenerate)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  autoGenerate ? "bg-primary" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                    autoGenerate ? "translate-x-6" : "translate-x-1",
                  )}
                />
              </button>
            </div>
            {autoGenerate && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="30"
                  {...register("auto_generate_days_before", { valueAsNumber: true })}
                  className="h-9 w-16 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-sm text-muted-foreground">days before due date</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Notes</label>
            <textarea
              {...register("notes")}
              rows={2}
              placeholder="Additional notes..."
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50",
                direction === "give"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700",
              )}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {payment ? "Save Changes" : "Create Recurring"}
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
