"use client";

import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/cn";

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

interface Requirement {
  label: string;
  test: (pw: string) => boolean;
}

const REQUIREMENTS: Requirement[] = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { label: "One number", test: (pw) => /[0-9]/.test(pw) },
  { label: "One special character", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

type Strength = "weak" | "fair" | "good" | "strong";

const STRENGTH_CONFIG: Record<Strength, { label: string; color: string; barColor: string }> = {
  weak: { label: "Weak", color: "text-destructive", barColor: "bg-destructive" },
  fair: { label: "Fair", color: "text-warning", barColor: "bg-warning" },
  good: { label: "Good", color: "text-yellow-500", barColor: "bg-yellow-500" },
  strong: { label: "Strong", color: "text-success", barColor: "bg-success" },
};

function getStrength(password: string): { strength: Strength; score: number } {
  if (!password) return { strength: "weak", score: 0 };
  const score = REQUIREMENTS.filter((req) => req.test(password)).length;
  if (score <= 1) return { strength: "weak", score };
  if (score <= 2) return { strength: "fair", score };
  if (score <= 3) return { strength: "good", score };
  return { strength: "strong", score };
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const { strength, score } = useMemo(() => getStrength(password), [password]);
  const config = STRENGTH_CONFIG[strength];
  const percent = (score / REQUIREMENTS.length) * 100;

  if (!password) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Password strength</span>
          <span className={cn("text-xs font-medium", config.color)}>{config.label}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all duration-500", config.barColor)}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <ul className="space-y-1">
        {REQUIREMENTS.map((req) => {
          const met = req.test(password);
          return (
            <li
              key={req.label}
              className={cn(
                "flex items-center gap-2 text-xs transition-colors",
                met ? "text-success" : "text-muted-foreground"
              )}
            >
              {met ? (
                <Check className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <X className="h-3.5 w-3.5 shrink-0" />
              )}
              {req.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
