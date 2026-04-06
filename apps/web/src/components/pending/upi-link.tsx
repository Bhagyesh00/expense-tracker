"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/cn";
import { useFormatCurrency } from "@/hooks/use-currency";
import {
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface UPILinkProps {
  upiId?: string | null;
  name: string;
  amount: number;
  currency: string;
  description?: string | null;
  onAddUPI?: () => void;
  className?: string;
}

function generateUPIUri(params: {
  upiId: string;
  name: string;
  amount: number;
  description?: string;
}): string {
  const uri = new URL("upi://pay");
  uri.searchParams.set("pa", params.upiId);
  uri.searchParams.set("pn", params.name);
  uri.searchParams.set("am", params.amount.toFixed(2));
  uri.searchParams.set("cu", "INR");
  if (params.description) {
    uri.searchParams.set("tn", params.description);
  }
  return uri.toString();
}

function QRCodeSVG({ data, size = 160 }: { data: string; size?: number }) {
  // Simple QR code placeholder using SVG pattern
  // In production, use a QR library like 'qrcode' or 'qrcode.react'
  const cellSize = size / 25;
  const cells: { x: number; y: number }[] = [];

  // Generate a deterministic pattern from the data string
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
  }

  // Finder patterns (top-left, top-right, bottom-left)
  const finderPositions = [
    { ox: 0, oy: 0 },
    { ox: 18, oy: 0 },
    { ox: 0, oy: 18 },
  ];

  for (const { ox, oy } of finderPositions) {
    for (let x = 0; x < 7; x++) {
      for (let y = 0; y < 7; y++) {
        if (
          x === 0 || x === 6 || y === 0 || y === 6 ||
          (x >= 2 && x <= 4 && y >= 2 && y <= 4)
        ) {
          cells.push({ x: ox + x, y: oy + y });
        }
      }
    }
  }

  // Data area - pseudo-random pattern based on URI hash
  for (let x = 0; x < 25; x++) {
    for (let y = 0; y < 25; y++) {
      // Skip finder pattern areas
      if (
        (x < 8 && y < 8) ||
        (x > 16 && y < 8) ||
        (x < 8 && y > 16)
      ) {
        continue;
      }
      const seed = (hash + x * 37 + y * 73 + data.charCodeAt(x % data.length)) >>> 0;
      if (seed % 3 === 0) {
        cells.push({ x, y });
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="rounded-lg"
    >
      <rect width={size} height={size} fill="white" rx={4} />
      {cells.map((cell, i) => (
        <rect
          key={i}
          x={cell.x * cellSize}
          y={cell.y * cellSize}
          width={cellSize}
          height={cellSize}
          fill="#000"
        />
      ))}
    </svg>
  );
}

export function UPILink({
  upiId,
  name,
  amount,
  currency,
  description,
  onAddUPI,
  className,
}: UPILinkProps) {
  const { formatCurrency } = useFormatCurrency();
  const [copied, setCopied] = useState(false);

  const upiUri = upiId
    ? generateUPIUri({
        upiId,
        name,
        amount,
        description: description ?? undefined,
      })
    : null;

  const handleCopy = useCallback(async () => {
    if (!upiUri) return;
    try {
      await navigator.clipboard.writeText(upiUri);
      setCopied(true);
      toast.success("UPI link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  }, [upiUri]);

  const handleOpenUPI = useCallback(() => {
    if (!upiUri) return;
    window.open(upiUri, "_blank");
  }, [upiUri]);

  if (!upiId) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-border p-6 text-center",
          className,
        )}
      >
        <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">
          No UPI ID Available
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Add a UPI ID for {name} to enable UPI payments.
        </p>
        {onAddUPI && (
          <button
            type="button"
            onClick={onAddUPI}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Add UPI ID
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-6",
        className,
      )}
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Pay via UPI
      </h3>

      {/* QR Code */}
      <div className="flex justify-center mb-4">
        <div className="rounded-xl border border-border bg-white p-3">
          <QRCodeSVG data={upiUri!} size={160} />
        </div>
      </div>

      {/* Payment details */}
      <div className="space-y-2 mb-4 text-center">
        <p className="text-xs text-muted-foreground">Pay to</p>
        <p className="text-sm font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">{upiId}</p>
        <p className="text-lg font-bold text-foreground">
          {formatCurrency(amount, currency)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleOpenUPI}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Smartphone className="h-4 w-4" />
          Open in UPI App
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
