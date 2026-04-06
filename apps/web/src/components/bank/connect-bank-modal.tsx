"use client";

import { useState } from "react";
import {
  X,
  Upload,
  Globe,
  Smartphone,
  Search,
  ChevronRight,
  Check,
  Landmark,
} from "lucide-react";

interface ConnectBankModalProps {
  onClose: () => void;
  onConnected: (account: {
    id: string;
    name: string;
    institution: string;
    accountNumber: string;
    type: "savings" | "current" | "credit";
    balance: number;
    currency: string;
    lastSynced: string | null;
    status: "connected" | "error" | "syncing";
  }) => void;
}

type Step = "provider" | "institution" | "account" | "confirm";

const PROVIDERS = [
  {
    id: "manual",
    name: "Manual Upload",
    description: "Upload CSV/OFX bank statements",
    icon: Upload,
  },
  {
    id: "plaid",
    name: "Plaid",
    description: "International banks (US, UK, EU, Canada)",
    icon: Globe,
  },
  {
    id: "saltedge",
    name: "Salt Edge",
    description: "Indian banks (HDFC, SBI, ICICI, etc.)",
    icon: Smartphone,
  },
];

const INSTITUTIONS = [
  { id: "hdfc", name: "HDFC Bank", country: "India" },
  { id: "sbi", name: "State Bank of India", country: "India" },
  { id: "icici", name: "ICICI Bank", country: "India" },
  { id: "axis", name: "Axis Bank", country: "India" },
  { id: "kotak", name: "Kotak Mahindra Bank", country: "India" },
  { id: "chase", name: "Chase", country: "USA" },
  { id: "bofa", name: "Bank of America", country: "USA" },
  { id: "hsbc", name: "HSBC", country: "UK" },
  { id: "barclays", name: "Barclays", country: "UK" },
];

const ACCOUNT_TYPES = [
  { id: "savings", name: "Savings Account" },
  { id: "current", name: "Current Account" },
  { id: "credit", name: "Credit Card" },
];

export function ConnectBankModal({ onClose, onConnected }: ConnectBankModalProps) {
  const [step, setStep] = useState<Step>("provider");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState("");
  const [selectedAccountType, setSelectedAccountType] = useState("savings");
  const [accountName, setAccountName] = useState("");
  const [connecting, setConnecting] = useState(false);

  const filteredInstitutions = INSTITUTIONS.filter((i) =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function handleProviderSelect(id: string) {
    setSelectedProvider(id);
    if (id === "manual") {
      onClose();
      return;
    }
    setStep("institution");
  }

  function handleInstitutionSelect(id: string) {
    setSelectedInstitution(id);
    const inst = INSTITUTIONS.find((i) => i.id === id);
    setAccountName(inst ? `${inst.name} Account` : "");
    setStep("account");
  }

  async function handleConfirm() {
    setConnecting(true);
    await new Promise((r) => setTimeout(r, 2000));
    const inst = INSTITUTIONS.find((i) => i.id === selectedInstitution);
    onConnected({
      id: `ba_${Date.now()}`,
      name: accountName || `${inst?.name} ${selectedAccountType}`,
      institution: inst?.name ?? "Unknown",
      accountNumber: `****${Math.floor(1000 + Math.random() * 9000)}`,
      type: selectedAccountType as "savings" | "current" | "credit",
      balance: Math.floor(Math.random() * 500000),
      currency: inst?.country === "India" ? "INR" : "USD",
      lastSynced: new Date().toISOString(),
      status: "connected",
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Connect Bank Account
            </h3>
            <p className="text-xs text-muted-foreground">
              {step === "provider" && "Choose a connection method"}
              {step === "institution" && "Search for your bank"}
              {step === "account" && "Select account type"}
              {step === "confirm" && "Confirm connection"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          {/* Step 1: Provider */}
          {step === "provider" && (
            <div className="space-y-3">
              {PROVIDERS.map((provider) => {
                const Icon = provider.icon;
                return (
                  <button
                    key={provider.id}
                    onClick={() => handleProviderSelect(provider.id)}
                    className="flex w-full items-center gap-4 rounded-lg border border-border p-4 text-left transition-colors hover:bg-accent"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {provider.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {provider.description}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 2: Institution */}
          {step === "institution" && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search banks..."
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {filteredInstitutions.map((inst) => (
                  <button
                    key={inst.id}
                    onClick={() => handleInstitutionSelect(inst.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
                  >
                    <Landmark className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {inst.name}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {inst.country}
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep("provider")}
                className="text-sm font-medium text-primary hover:underline"
              >
                Back
              </button>
            </div>
          )}

          {/* Step 3: Account selection */}
          {step === "account" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Account Name
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Account Type
                </label>
                <div className="mt-2 space-y-2">
                  {ACCOUNT_TYPES.map((type) => (
                    <label
                      key={type.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        selectedAccountType === type.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      <input
                        type="radio"
                        name="accountType"
                        value={type.id}
                        checked={selectedAccountType === type.id}
                        onChange={() => setSelectedAccountType(type.id)}
                        className="h-4 w-4 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-foreground">
                        {type.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep("institution")}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("confirm")}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === "confirm" && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Institution</dt>
                    <dd className="font-medium text-foreground">
                      {INSTITUTIONS.find((i) => i.id === selectedInstitution)
                        ?.name}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Account Name</dt>
                    <dd className="font-medium text-foreground">
                      {accountName}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Account Type</dt>
                    <dd className="font-medium capitalize text-foreground">
                      {selectedAccountType}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Provider</dt>
                    <dd className="font-medium text-foreground">
                      {PROVIDERS.find((p) => p.id === selectedProvider)?.name}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="flex justify-between">
                <button
                  onClick={() => setStep("account")}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={connecting}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {connecting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Connect Account
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
