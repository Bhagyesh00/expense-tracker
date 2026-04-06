"use client";

import { useState, useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  X,
  Loader2,
  Building2,
  CreditCard,
  DollarSign,
  BarChart2,
  Landmark,
  Car,
  Bitcoin,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  useNetWorthAssets,
  useNetWorthLiabilities,
  useNetWorthTotal,
  useNetWorthHistory,
  useCreateAsset,
  useDeleteAsset,
  useCreateLiability,
  useDeleteLiability,
  type AssetType,
  type LiabilityType,
  type NetWorthAsset,
  type NetWorthLiability,
} from "@/hooks/use-net-worth";
import { useBlurAmount } from "@/hooks/use-privacy";


const assetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum([
    "cash",
    "bank",
    "investment",
    "property",
    "vehicle",
    "crypto",
    "other",
  ] as const),
  value: z.coerce.number().min(0, "Value must be positive"),
  currency: z.string().default("INR"),
  notes: z.string().optional(),
});

const liabilitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum([
    "loan",
    "credit_card",
    "mortgage",
    "other",
  ] as const),
  value: z.coerce.number().min(0, "Value must be positive"),
  currency: z.string().default("INR"),
  notes: z.string().optional(),
});

type AssetInput = z.infer<typeof assetSchema>;
type LiabilityInput = z.infer<typeof liabilitySchema>;

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  cash: "Cash",
  bank: "Bank Account",
  investment: "Investment",
  property: "Property",
  vehicle: "Vehicle",
  crypto: "Cryptocurrency",
  other: "Other",
};

const LIABILITY_TYPE_LABELS: Record<string, string> = {
  loan: "Loan",
  credit_card: "Credit Card",
  mortgage: "Mortgage",
  pending_payment: "Pending Payment",
  other: "Other",
};

function AssetIcon({ type }: { type: AssetType }) {
  const iconClass = "h-4 w-4";
  switch (type) {
    case "cash":
      return <DollarSign className={iconClass} />;
    case "bank":
      return <Landmark className={iconClass} />;
    case "investment":
      return <BarChart2 className={iconClass} />;
    case "property":
      return <Building2 className={iconClass} />;
    case "vehicle":
      return <Car className={iconClass} />;
    case "crypto":
      return <Bitcoin className={iconClass} />;
    default:
      return <HelpCircle className={iconClass} />;
  }
}

function LiabilityIcon({ type }: { type: LiabilityType | string }) {
  const iconClass = "h-4 w-4";
  switch (type) {
    case "loan":
    case "mortgage":
      return <Landmark className={iconClass} />;
    case "credit_card":
      return <CreditCard className={iconClass} />;
    default:
      return <HelpCircle className={iconClass} />;
  }
}

// ── Net Worth History Mini Chart ──────────────────────────────────────────────
function NetWorthTrendChart() {
  const { data: history = [] } = useNetWorthHistory();

  if (history.length < 2) return null;

  const maxVal = Math.max(...history.map((h) => Math.max(h.assets, h.liabilities)));
  const minVal = Math.min(...history.map((h) => Math.min(h.netWorth, 0)));
  const range = maxVal - minVal || 1;
  const width = 300;
  const height = 80;
  const padding = 10;

  const toX = (i: number) =>
    padding + (i / (history.length - 1)) * (width - padding * 2);
  const toY = (val: number) =>
    height - padding - ((val - minVal) / range) * (height - padding * 2);

  const netWorthPath = history
    .map((h, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(h.netWorth)}`)
    .join(" ");

  const lastChange =
    history.length >= 2
      ? history[history.length - 1].netWorth -
        history[history.length - 2].netWorth
      : 0;
  const isPositive = lastChange >= 0;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">
          6-Month Trend
        </p>
        <span
          className={cn(
            "flex items-center gap-1 text-xs font-medium",
            isPositive ? "text-emerald-600" : "text-red-500"
          )}
        >
          {isPositive ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : (
            <ArrowDownRight className="h-3 w-3" />
          )}
          ₹{Math.abs(lastChange).toLocaleString("en-IN")} vs last month
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-20 overflow-visible"
      >
        <defs>
          <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={isPositive ? "#10b981" : "#ef4444"}
              stopOpacity="0.3"
            />
            <stop
              offset="100%"
              stopColor={isPositive ? "#10b981" : "#ef4444"}
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        <path
          d={`${netWorthPath} L${toX(history.length - 1)},${height - padding} L${toX(0)},${height - padding} Z`}
          fill="url(#netWorthGradient)"
        />
        <path
          d={netWorthPath}
          fill="none"
          stroke={isPositive ? "#10b981" : "#ef4444"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {history.map((h, i) => (
          <circle
            key={h.month}
            cx={toX(i)}
            cy={toY(h.netWorth)}
            r="3"
            fill={isPositive ? "#10b981" : "#ef4444"}
          />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        {history.map((h) => (
          <span key={h.month}>
            {new Date(h.month + "-01").toLocaleDateString("en-IN", {
              month: "short",
            })}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function NetWorthPage() {
  const { data: assets = [], isLoading: assetsLoading } = useNetWorthAssets();
  const { data: liabilities = [], isLoading: liabilitiesLoading } =
    useNetWorthLiabilities();
  const { totalAssets, totalLiabilities, netWorth } = useNetWorthTotal();
  const deleteAsset = useDeleteAsset();
  const deleteLiability = useDeleteLiability();

  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAddLiability, setShowAddLiability] = useState(false);

  const isPositive = netWorth >= 0;
  const blurredNetWorth = useBlurAmount(Math.abs(netWorth));
  const blurredAssets = useBlurAmount(totalAssets);
  const blurredLiabilities = useBlurAmount(totalLiabilities);

  const isLoading = assetsLoading || liabilitiesLoading;

  const handleDeleteAsset = async (id: string) => {
    try {
      await deleteAsset.mutateAsync(id);
      toast.success("Asset removed");
    } catch {
      toast.error("Failed to remove asset");
    }
  };

  const handleDeleteLiability = async (id: string) => {
    try {
      await deleteLiability.mutateAsync(id);
      toast.success("Liability removed");
    } catch {
      toast.error("Failed to remove liability");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Net Worth
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your assets, liabilities, and overall financial health
        </p>
      </div>

      {/* Net Worth Summary Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Total Net Worth
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={cn(
                  "text-4xl font-bold",
                  isPositive ? "text-emerald-600" : "text-red-500"
                )}
              >
                {isPositive ? "" : "-"}
                {blurredNetWorth}
              </span>
              {isPositive ? (
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
            </div>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Total Assets</p>
              <p className="text-xl font-semibold text-emerald-600">
                {blurredAssets}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Liabilities</p>
              <p className="text-xl font-semibold text-red-500">
                {blurredLiabilities}
              </p>
            </div>
          </div>
        </div>
        <NetWorthTrendChart />
      </div>

      {/* Assets Section */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Assets</h2>
            <p className="text-xs text-muted-foreground">
              {assets.length} items · Total: {blurredAssets}
            </p>
          </div>
          <button
            onClick={() => setShowAddAsset(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Asset
          </button>
        </div>

        <div className="divide-y divide-border">
          {assets.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No assets added yet. Add your first asset to start tracking your
                net worth.
              </p>
            </div>
          ) : (
            assets.map((asset) => (
              <AssetRow
                key={asset.id}
                asset={asset}
                onDelete={() => handleDeleteAsset(asset.id)}
                isDeleting={
                  deleteAsset.isPending && deleteAsset.variables === asset.id
                }
              />
            ))
          )}
        </div>
      </div>

      {/* Liabilities Section */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Liabilities
            </h2>
            <p className="text-xs text-muted-foreground">
              {liabilities.length} items · Total: {blurredLiabilities}
            </p>
          </div>
          <button
            onClick={() => setShowAddLiability(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Liability
          </button>
        </div>

        <div className="divide-y divide-border">
          {liabilities.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No liabilities added. Pending payments you owe are automatically
                imported.
              </p>
            </div>
          ) : (
            liabilities.map((liability) => (
              <LiabilityRow
                key={liability.id}
                liability={liability}
                onDelete={
                  liability.isAutoImported
                    ? undefined
                    : () => handleDeleteLiability(liability.id)
                }
                isDeleting={
                  deleteLiability.isPending &&
                  deleteLiability.variables === liability.id
                }
              />
            ))
          )}
        </div>
      </div>

      {/* Net Worth Formula */}
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex items-center justify-center gap-4 flex-wrap text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Assets</span>
            <span className="font-semibold text-emerald-600">
              {blurredAssets}
            </span>
          </div>
          <span className="text-muted-foreground font-bold">−</span>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Liabilities</span>
            <span className="font-semibold text-red-500">
              {blurredLiabilities}
            </span>
          </div>
          <span className="text-muted-foreground font-bold">=</span>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Net Worth</span>
            <span
              className={cn(
                "text-lg font-bold",
                isPositive ? "text-emerald-600" : "text-red-500"
              )}
            >
              {isPositive ? "" : "-"}
              {blurredNetWorth}
            </span>
          </div>
        </div>
      </div>

      {/* Add Asset Modal */}
      {showAddAsset && (
        <AddAssetModal onClose={() => setShowAddAsset(false)} />
      )}

      {/* Add Liability Modal */}
      {showAddLiability && (
        <AddLiabilityModal onClose={() => setShowAddLiability(false)} />
      )}
    </div>
  );
}

// ── Row components ────────────────────────────────────────────────────────────

function AssetRow({
  asset,
  onDelete,
  isDeleting,
}: {
  asset: NetWorthAsset;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const displayValue = useBlurAmount(asset.value);

  return (
    <div className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <AssetIcon type={asset.type} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {asset.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {ASSET_TYPE_LABELS[asset.type]}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-emerald-600">
          {displayValue}
        </span>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function LiabilityRow({
  liability,
  onDelete,
  isDeleting,
}: {
  liability: NetWorthLiability;
  onDelete?: () => void;
  isDeleting: boolean;
}) {
  const displayValue = useBlurAmount(liability.value);

  return (
    <div className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <LiabilityIcon type={liability.type} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {liability.name}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {LIABILITY_TYPE_LABELS[liability.type] ?? liability.type}
            </p>
            {liability.isAutoImported && (
              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                Auto-imported
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-red-500">
          {displayValue}
        </span>
        {onDelete && (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Add Asset Modal ───────────────────────────────────────────────────────────
function AddAssetModal({ onClose }: { onClose: () => void }) {
  const createAsset = useCreateAsset();
  const id = useId();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AssetInput>({
    resolver: zodResolver(assetSchema),
    defaultValues: { type: "bank", currency: "INR" },
  });

  const onSubmit = async (data: AssetInput) => {
    try {
      await createAsset.mutateAsync(data);
      toast.success("Asset added");
      onClose();
    } catch {
      toast.error("Failed to add asset");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-foreground">Add Asset</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor={`${id}-name`} className="text-sm font-medium text-foreground">
              Asset Name
            </label>
            <input
              id={`${id}-name`}
              {...register("name")}
              placeholder="e.g. HDFC Savings Account"
              className={cn(
                "h-10 w-full rounded-lg border bg-background px-3 text-sm transition-colors",
                "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                errors.name ? "border-destructive" : "border-input"
              )}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${id}-type`} className="text-sm font-medium text-foreground">
              Type
            </label>
            <select
              id={`${id}-type`}
              {...register("type")}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm appearance-none focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${id}-value`} className="text-sm font-medium text-foreground">
              Current Value (₹)
            </label>
            <input
              id={`${id}-value`}
              type="number"
              {...register("value")}
              placeholder="0"
              min="0"
              step="0.01"
              className={cn(
                "h-10 w-full rounded-lg border bg-background px-3 text-sm transition-colors",
                "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                errors.value ? "border-destructive" : "border-input"
              )}
            />
            {errors.value && (
              <p className="text-xs text-destructive">{errors.value.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${id}-notes`} className="text-sm font-medium text-foreground">
              Notes (optional)
            </label>
            <input
              id={`${id}-notes`}
              {...register("notes")}
              placeholder="Additional details"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createAsset.isPending}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {createAsset.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </span>
              ) : (
                "Add Asset"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Liability Modal ───────────────────────────────────────────────────────
function AddLiabilityModal({ onClose }: { onClose: () => void }) {
  const createLiability = useCreateLiability();
  const id = useId();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LiabilityInput>({
    resolver: zodResolver(liabilitySchema),
    defaultValues: { type: "loan", currency: "INR" },
  });

  const onSubmit = async (data: LiabilityInput) => {
    try {
      await createLiability.mutateAsync(data);
      toast.success("Liability added");
      onClose();
    } catch {
      toast.error("Failed to add liability");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-foreground">
            Add Liability
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor={`${id}-name`} className="text-sm font-medium text-foreground">
              Liability Name
            </label>
            <input
              id={`${id}-name`}
              {...register("name")}
              placeholder="e.g. Home Loan - SBI"
              className={cn(
                "h-10 w-full rounded-lg border bg-background px-3 text-sm transition-colors",
                "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                errors.name ? "border-destructive" : "border-input"
              )}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${id}-type`} className="text-sm font-medium text-foreground">
              Type
            </label>
            <select
              id={`${id}-type`}
              {...register("type")}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm appearance-none focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {[
                { value: "loan", label: "Loan" },
                { value: "credit_card", label: "Credit Card" },
                { value: "mortgage", label: "Mortgage" },
                { value: "other", label: "Other" },
              ].map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${id}-value`} className="text-sm font-medium text-foreground">
              Outstanding Amount (₹)
            </label>
            <input
              id={`${id}-value`}
              type="number"
              {...register("value")}
              placeholder="0"
              min="0"
              step="0.01"
              className={cn(
                "h-10 w-full rounded-lg border bg-background px-3 text-sm transition-colors",
                "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                errors.value ? "border-destructive" : "border-input"
              )}
            />
            {errors.value && (
              <p className="text-xs text-destructive">{errors.value.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLiability.isPending}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {createLiability.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </span>
              ) : (
                "Add Liability"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
