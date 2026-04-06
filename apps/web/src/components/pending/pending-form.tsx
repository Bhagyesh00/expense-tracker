"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/cn";
import { useContactsList, useCreateContact } from "@/hooks/use-contacts";
import { useUIStore } from "@/stores/ui-store";
import { DatePicker } from "@/components/shared/date-picker";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Plus,
  X,
  Loader2,
  UserPlus,
} from "lucide-react";

const pendingFormSchema = z.object({
  direction: z.enum(["give", "receive"]),
  contactId: z.string().min(1, "Contact is required"),
  amount: z
    .number({ required_error: "Amount is required", invalid_type_error: "Must be a number" })
    .positive("Amount must be greater than zero"),
  currency: z.string().min(3).max(3).default("INR"),
  description: z.string().min(1, "Description is required").max(255).trim(),
  dueDate: z.date().optional().nullable(),
  notes: z.string().max(2000).optional(),
});

type PendingFormValues = z.infer<typeof pendingFormSchema>;

interface PendingFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<PendingFormValues>;
  onSubmit: (data: PendingFormValues) => Promise<void>;
  isSubmitting?: boolean;
  className?: string;
}

export function PendingForm({
  mode,
  defaultValues,
  onSubmit,
  isSubmitting = false,
  className,
}: PendingFormProps) {
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);
  const { data: contacts, isLoading: contactsLoading } = useContactsList();
  const { createContact } = useCreateContact();

  const [contactSearch, setContactSearch] = useState("");
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [creatingContact, setCreatingContact] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PendingFormValues>({
    resolver: zodResolver(pendingFormSchema),
    defaultValues: {
      direction: "give",
      contactId: "",
      amount: undefined,
      currency: "INR",
      description: "",
      dueDate: null,
      notes: "",
      ...defaultValues,
    },
  });

  const direction = watch("direction");
  const contactId = watch("contactId");

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
        c.email?.toLowerCase().includes(lower) ||
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
      setShowContactDropdown(false);
      setNewContactName("");
      setNewContactPhone("");
    } catch {
      // Error handled by hook
    } finally {
      setCreatingContact(false);
    }
  }, [newContactName, newContactPhone, workspaceId, createContact, setValue]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn("space-y-6", className)}
    >
      {/* Direction Toggle */}
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Payment Direction
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setValue("direction", "give")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border-2 p-4 text-sm font-semibold transition-all",
              direction === "give"
                ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:border-red-600"
                : "border-border bg-card text-muted-foreground hover:border-red-300 hover:bg-red-50/50 dark:hover:bg-red-900/10",
            )}
          >
            <ArrowUpRight className="h-5 w-5" />
            I Owe (Give)
          </button>
          <button
            type="button"
            onClick={() => setValue("direction", "receive")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border-2 p-4 text-sm font-semibold transition-all",
              direction === "receive"
                ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 dark:border-green-600"
                : "border-border bg-card text-muted-foreground hover:border-green-300 hover:bg-green-50/50 dark:hover:bg-green-900/10",
            )}
          >
            <ArrowDownLeft className="h-5 w-5" />
            Owed to Me (Receive)
          </button>
        </div>
      </div>

      {/* Contact Selector */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Contact
        </label>
        {selectedContact ? (
          <div className="flex items-center justify-between rounded-lg border border-input bg-background p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {selectedContact.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {selectedContact.name}
                </p>
                {selectedContact.phone && (
                  <p className="text-xs text-muted-foreground">
                    {selectedContact.phone}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setValue("contactId", "");
                setShowContactDropdown(true);
              }}
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
                onChange={(e) => {
                  setContactSearch(e.target.value);
                  setShowContactDropdown(true);
                }}
                onFocus={() => setShowContactDropdown(true)}
                placeholder="Search contacts..."
                className={cn(
                  "h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
                  errors.contactId ? "border-destructive" : "border-input",
                )}
              />
            </div>

            {showContactDropdown && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowContactDropdown(false)}
                />
                <div className="absolute z-40 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-border bg-popover shadow-lg">
                  {contactsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      {filteredContacts.map((contact) => (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => {
                            setValue("contactId", contact.id);
                            setShowContactDropdown(false);
                            setContactSearch("");
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {contact.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{contact.name}</p>
                            {contact.phone && (
                              <p className="text-xs text-muted-foreground truncate">
                                {contact.phone}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                      {filteredContacts.length === 0 && (
                        <p className="px-3 py-2 text-sm text-muted-foreground">
                          No contacts found
                        </p>
                      )}
                      <hr className="border-border" />
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewContact(true);
                          setShowContactDropdown(false);
                          setNewContactName(contactSearch);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-primary hover:bg-accent transition-colors"
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
          <p className="mt-1 text-xs text-destructive">
            {errors.contactId.message}
          </p>
        )}

        {/* Inline new contact form */}
        {showNewContact && (
          <div className="mt-2 rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                New Contact
              </span>
              <button
                type="button"
                onClick={() => setShowNewContact(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              type="text"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              placeholder="Name"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
            <input
              type="text"
              value={newContactPhone}
              onChange={(e) => setNewContactPhone(e.target.value)}
              placeholder="Phone (optional)"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={handleCreateContact}
              disabled={!newContactName.trim() || creatingContact}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {creatingContact ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Create Contact
            </button>
          </div>
        )}
      </div>

      {/* Amount */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Amount
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
            INR
          </span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            {...register("amount", { valueAsNumber: true })}
            placeholder="0.00"
            className={cn(
              "h-10 w-full rounded-lg border bg-background pl-12 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
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

      {/* Description */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Description
        </label>
        <input
          type="text"
          {...register("description")}
          placeholder="What is this payment for?"
          className={cn(
            "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
            errors.description ? "border-destructive" : "border-input",
          )}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Due Date */}
      <div>
        <Controller
          control={control}
          name="dueDate"
          render={({ field }) => (
            <DatePicker
              label="Due Date (optional)"
              value={field.value ?? null}
              onChange={field.onChange}
              placeholder="Select due date"
              error={errors.dueDate?.message}
            />
          )}
        />
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Notes (optional)
        </label>
        <textarea
          {...register("notes")}
          rows={3}
          placeholder="Additional notes..."
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          "w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50",
          direction === "give"
            ? "bg-red-600 hover:bg-red-700"
            : "bg-green-600 hover:bg-green-700",
        )}
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === "create" ? "Create Pending Payment" : "Update Payment"}
      </button>
    </form>
  );
}
