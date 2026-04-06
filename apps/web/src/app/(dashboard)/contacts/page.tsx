"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { useContactsList, useCreateContact } from "@/hooks/use-contacts";
import { usePendingList } from "@/hooks/use-pending-payments";
import { useFormatCurrency } from "@/hooks/use-currency";
import { useUIStore } from "@/stores/ui-store";
import { ContactForm } from "@/components/contacts/contact-form";
import { ContactLedger } from "@/components/contacts/contact-ledger";
import type { ContactInput } from "@expenseflow/utils";
import {
  Plus,
  Search,
  Users,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";

type SortField = "name" | "balance" | "activity";
type SortDir = "asc" | "desc";

interface ContactWithBalance {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  netBalance: number; // positive = they owe you
  lastActivity: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

const AVATAR_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#3b82f6",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
];

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

export default function ContactsPage() {
  const { formatCurrency } = useFormatCurrency();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);
  const { data: contacts, isLoading: contactsLoading } = useContactsList();
  const { data: payments } = usePendingList();
  const { createContact } = useCreateContact();

  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  // Calculate net balance per contact
  const contactsWithBalance: ContactWithBalance[] = useMemo(() => {
    if (!contacts) return [];

    return contacts.map((contact) => {
      const contactPayments = (payments ?? []).filter(
        (p) => p.contact_id === contact.id && p.status !== "cancelled",
      );

      let netBalance = 0;
      let lastActivity = contact.created_at;

      for (const p of contactPayments) {
        const remaining = p.amount - p.paid_amount;
        if (p.status === "settled") continue;
        if (p.direction === "receive") {
          netBalance += remaining;
        } else {
          netBalance -= remaining;
        }
        if (p.updated_at > lastActivity) {
          lastActivity = p.updated_at;
        }
      }

      return {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        notes: contact.notes,
        netBalance,
        lastActivity,
      };
    });
  }, [contacts, payments]);

  // Filter and sort
  const filteredContacts = useMemo(() => {
    let filtered = contactsWithBalance;

    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          c.email?.toLowerCase().includes(lower) ||
          c.phone?.includes(search),
      );
    }

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "balance":
          cmp = a.netBalance - b.netBalance;
          break;
        case "activity":
          cmp =
            new Date(a.lastActivity).getTime() -
            new Date(b.lastActivity).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return filtered;
  }, [contactsWithBalance, search, sortField, sortDir]);

  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir(field === "name" ? "asc" : "desc");
      }
    },
    [sortField],
  );

  const handleCreateContact = useCallback(
    async (data: ContactInput) => {
      if (!workspaceId) return;
      await createContact({
        workspace_id: workspaceId,
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        notes: undefined,
      });
    },
    [workspaceId, createContact],
  );

  // If a contact is selected, show ledger
  if (selectedContactId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setSelectedContactId(null)}
            className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <h1 className="text-2xl font-bold text-foreground">
            Contact Ledger
          </h1>
        </div>
        <ContactLedger contactId={selectedContactId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage contacts and view payment balances
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </button>
      </div>

      {/* Search and sort */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sort options */}
        <div className="flex rounded-lg border border-input">
          {(
            [
              { field: "name" as SortField, label: "Name" },
              { field: "balance" as SortField, label: "Balance" },
              { field: "activity" as SortField, label: "Activity" },
            ] as const
          ).map(({ field, label }) => (
            <button
              key={field}
              type="button"
              onClick={() => toggleSort(field)}
              className={cn(
                "inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg",
                sortField === field
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              {label}
              {sortField === field &&
                (sortDir === "asc" ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                ))}
            </button>
          ))}
        </div>
      </div>

      {/* Contact list */}
      {contactsLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
            >
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-5 w-20 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            {search ? "No contacts found" : "No contacts yet"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {search
              ? "Try adjusting your search."
              : "Add your first contact to start tracking payments."}
          </p>
          {!search && (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Contact
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredContacts.map((contact) => {
            const isPositive = contact.netBalance >= 0;
            const hasBalance = Math.abs(contact.netBalance) > 0.01;

            return (
              <button
                key={contact.id}
                type="button"
                onClick={() => setSelectedContactId(contact.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent/50 active:bg-accent"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold"
                  style={{ backgroundColor: getColorForName(contact.name) }}
                >
                  {getInitials(contact.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {contact.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {contact.email || contact.phone || "No contact info"}
                  </p>
                </div>
                {hasBalance ? (
                  <div className="text-right shrink-0">
                    <span
                      className={cn(
                        "text-sm font-bold",
                        isPositive ? "text-green-600" : "text-red-600",
                      )}
                    >
                      {isPositive ? "+" : ""}
                      {formatCurrency(Math.abs(contact.netBalance), "INR")}
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      {isPositive ? "owes you" : "you owe"}
                    </p>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Settled
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Add Contact Form */}
      <ContactForm
        open={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSubmit={handleCreateContact}
        mode="create"
      />
    </div>
  );
}
