/**
 * ExpenseFlow — Bank SMS Parser Edge Function (Phase 12)
 *
 * Parses Indian bank SMS notifications to extract transaction data.
 * - Applies custom sms_rules patterns first
 * - Falls back to built-in patterns for major Indian banks
 * - Supports HDFC, SBI, ICICI, Axis, Kotak, PNB
 * - Auto-creates expense if confidence is high
 *
 * POST body: { workspace_id, sms_text, sender?: string }
 */

import { createServiceClient, createUserClient, getUserId } from "../_shared/supabase.ts";
import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedTransaction {
  amount: number;
  merchant: string;
  type: "debit" | "credit";
  bank: string;
  account_mask?: string;
  reference?: string;
  balance?: number;
  confidence: number;
}

interface SmsRule {
  id: string;
  bank_name: string;
  pattern: string;
  amount_group: number;
  merchant_group: number;
  is_active: boolean;
}

// ---------------------------------------------------------------------------
// Built-in bank SMS patterns for major Indian banks
// ---------------------------------------------------------------------------

interface BankPattern {
  bank: string;
  senderPatterns: RegExp[];
  patterns: {
    regex: RegExp;
    type: "debit" | "credit";
    amountGroup: number;
    merchantGroup: number;
    accountGroup?: number;
    balanceGroup?: number;
  }[];
}

const BANK_PATTERNS: BankPattern[] = [
  {
    bank: "HDFC",
    senderPatterns: [/HDFC/i, /HDFCBK/i],
    patterns: [
      {
        regex: /Rs\.?\s*([\d,]+\.?\d*)\s+(?:debited|spent)\s+(?:from|at)\s+(?:a\/c\s*\*?(\d{4})\s+)?(?:at\s+)?(.+?)(?:\s+on\s+|\.\s*Avl\s*bal)/i,
        type: "debit",
        amountGroup: 1,
        merchantGroup: 3,
        accountGroup: 2,
      },
      {
        regex: /Rs\.?\s*([\d,]+\.?\d*)\s+credited\s+to\s+(?:a\/c\s*\*?(\d{4}))?\s*(?:from\s+)?(.+?)(?:\s+on\s+|\.\s*Avl\s*bal)/i,
        type: "credit",
        amountGroup: 1,
        merchantGroup: 3,
        accountGroup: 2,
      },
      {
        regex: /INR\s*([\d,]+\.?\d*)\s+(?:debited|withdrawn)\s+from\s+(?:A\/c\s*\*?(\d{4}))?\s*(?:at\s+)?(.+?)(?:\.\s*Avl|$)/i,
        type: "debit",
        amountGroup: 1,
        merchantGroup: 3,
        accountGroup: 2,
      },
    ],
  },
  {
    bank: "SBI",
    senderPatterns: [/SBI/i, /SBIINB/i, /SBIIN/i],
    patterns: [
      {
        regex: /Rs\.?\s*([\d,]+\.?\d*)\s+(?:debited|transferred)\s+from\s+(?:your\s+)?(?:a\/c\s*)?(\d{4,})?\s*(?:to\s+)?(.+?)(?:\s+on\s+|\.\s*Your)/i,
        type: "debit",
        amountGroup: 1,
        merchantGroup: 3,
        accountGroup: 2,
      },
      {
        regex: /Rs\.?\s*([\d,]+\.?\d*)\s+(?:credited|deposited)\s+(?:to\s+)?(?:your\s+)?(?:a\/c\s*)?(\d{4,})?\s*(?:from\s+)?(.+?)(?:\s+on\s+|\.\s*Your)/i,
        type: "credit",
        amountGroup: 1,
        merchantGroup: 3,
        accountGroup: 2,
      },
    ],
  },
  {
    bank: "ICICI",
    senderPatterns: [/ICICI/i, /ICICIB/i],
    patterns: [
      {
        regex: /(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s+(?:debited|spent)\s+(?:from\s+)?(?:Acct\s*)?(\d{4})?\s*(?:at\s+)?(.+?)(?:\.\s*Avl\s*Bal|$)/i,
        type: "debit",
        amountGroup: 1,
        merchantGroup: 3,
        accountGroup: 2,
      },
      {
        regex: /(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s+credited\s+to\s+(?:Acct\s*)?(\d{4})?\s*(?:from\s+)?(.+?)(?:\.\s*Avl\s*Bal|$)/i,
        type: "credit",
        amountGroup: 1,
        merchantGroup: 3,
        accountGroup: 2,
      },
    ],
  },
  {
    bank: "Axis",
    senderPatterns: [/AXIS/i, /AXISBK/i],
    patterns: [
      {
        regex: /Rs\.?\s*([\d,]+\.?\d*)\s+(?:debited|spent)\s+(?:from\s+)?(?:A\/c\s+no\.\s*)?[Xx]*(\d{4})?\s*(?:at\s+)?(.+?)(?:\.\s*(?:Avl|Bal)|$)/i,
        type: "debit",
        amountGroup: 1,
        merchantGroup: 3,
        accountGroup: 2,
      },
      {
        regex: /Rs\.?\s*([\d,]+\.?\d*)\s+(?:credited|received)\s+(?:to\s+)?(?:A\/c\s+no\.\s*)?[Xx]*(\d{4})?\s*(?:from\s+)?(.+?)(?:\.\s*(?:Avl|Bal)|$)/i,
        type: "credit",
        amountGroup: 1,
        merchantGroup: 3,
        accountGroup: 2,
      },
    ],
  },
  {
    bank: "Kotak",
    senderPatterns: [/KOTAK/i, /KMB/i],
    patterns: [
      {
        regex: /Rs\.?\s*([\d,]+\.?\d*)\s+(?:debited|spent)\s+(?:from\s+)?(?:A\/c\s*)?[Xx]*(\d{4})?\s*(?:at\s+)?(.+?)(?:\.\s*Bal|$)/i,
        type: "debit",
        amountGroup: 1,
        merchantGroup: 3,
        accountGroup: 2,
      },
      {
        regex: /Rs\.?\s*([\d,]+\.?\d*)\s+(?:credited|received)\s+(?:to|in)\s+(?:A\/c\s*)?[Xx]*(\d{4})?\s*(?:from\s+)?(.+?)(?:\.\s*Bal|$)/i,
        type: "credit",
        amountGroup: 1,
        merchantGroup: 3,
        accountGroup: 2,
      },
    ],
  },
  {
    bank: "PNB",
    senderPatterns: [/PNB/i, /PNBSMS/i],
    patterns: [
      {
        regex: /Rs\.?\s*([\d,]+\.?\d*)\s+(?:debited|withdrawn)\s+(?:from\s+)?(?:your\s+)?(?:A\/c\s*)?(\d{4})?\s*(?:at\s+)?(.+?)(?:\.\s*Bal|$)/i,
        type: "debit",
        amountGroup: 1,
        merchantGroup: 3,
        accountGroup: 2,
      },
      {
        regex: /Rs\.?\s*([\d,]+\.?\d*)\s+(?:credited|deposited)\s+(?:to|in)\s+(?:your\s+)?(?:A\/c\s*)?(\d{4})?\s*(?:from\s+)?(.+?)(?:\.\s*Bal|$)/i,
        type: "credit",
        amountGroup: 1,
        merchantGroup: 3,
        accountGroup: 2,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/,/g, ""));
}

function cleanMerchant(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/[.;]+$/, "")
    .trim();
}

function tryCustomRules(smsText: string, rules: SmsRule[]): ParsedTransaction | null {
  for (const rule of rules) {
    if (!rule.is_active) continue;

    try {
      const regex = new RegExp(rule.pattern, "i");
      const match = smsText.match(regex);

      if (match) {
        const amountStr = match[rule.amount_group];
        const merchantStr = match[rule.merchant_group];

        if (amountStr) {
          const amount = parseAmount(amountStr);
          if (amount > 0) {
            return {
              amount,
              merchant: merchantStr ? cleanMerchant(merchantStr) : "Unknown",
              type: smsText.match(/credit|deposit|receiv/i) ? "credit" : "debit",
              bank: rule.bank_name,
              confidence: 0.85,
            };
          }
        }
      }
    } catch {
      // Invalid regex in user rule, skip
      continue;
    }
  }

  return null;
}

function tryBuiltinPatterns(smsText: string, sender?: string): ParsedTransaction | null {
  // Determine which bank patterns to try based on sender
  const banksToTry = sender
    ? BANK_PATTERNS.filter((bp) => bp.senderPatterns.some((sp) => sp.test(sender)))
    : BANK_PATTERNS;

  // If sender matched, try those first, then all
  const candidates = [
    ...banksToTry,
    ...BANK_PATTERNS.filter((bp) => !banksToTry.includes(bp)),
  ];

  for (const bankPattern of candidates) {
    for (const pattern of bankPattern.patterns) {
      const match = smsText.match(pattern.regex);

      if (match) {
        const amountStr = match[pattern.amountGroup];
        const merchantStr = match[pattern.merchantGroup];
        const accountStr = pattern.accountGroup ? match[pattern.accountGroup] : undefined;

        if (amountStr) {
          const amount = parseAmount(amountStr);
          if (amount > 0) {
            const isSenderMatch = banksToTry.includes(bankPattern);
            return {
              amount,
              merchant: merchantStr ? cleanMerchant(merchantStr) : "Unknown",
              type: pattern.type,
              bank: bankPattern.bank,
              account_mask: accountStr || undefined,
              confidence: isSenderMatch ? 0.9 : 0.7,
            };
          }
        }
      }
    }
  }

  // Fallback: generic amount extraction
  const genericMatch = smsText.match(
    /(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i,
  );
  if (genericMatch) {
    const amount = parseAmount(genericMatch[1]!);
    if (amount > 0) {
      const type = smsText.match(/credit|deposit|receiv/i) ? "credit" : "debit";
      return {
        amount,
        merchant: "Unknown",
        type,
        bank: "Unknown",
        confidence: 0.4,
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors();

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const body = await req.json();
    const { workspace_id, sms_text, sender, auto_create = true } = body as {
      workspace_id?: string;
      sms_text?: string;
      sender?: string;
      auto_create?: boolean;
    };

    if (!workspace_id || !sms_text) {
      return errorResponse("Missing required fields: workspace_id, sms_text");
    }

    const admin = createServiceClient();

    // 1. Try custom SMS rules first
    const { data: customRules } = await admin
      .from("sms_rules")
      .select("id, bank_name, pattern, amount_group, merchant_group, is_active")
      .eq("workspace_id", workspace_id)
      .eq("is_active", true);

    let result: ParsedTransaction | null = null;

    if (customRules && customRules.length > 0) {
      result = tryCustomRules(sms_text, customRules as unknown as SmsRule[]);
    }

    // 2. Fall back to built-in patterns
    if (!result) {
      result = tryBuiltinPatterns(sms_text, sender);
    }

    if (!result) {
      return new Response(
        JSON.stringify({
          data: {
            parsed: false,
            message: "Could not parse transaction from SMS",
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Auto-create expense if confidence is high enough
    let expenseId: string | null = null;

    if (auto_create && result.confidence >= 0.7) {
      // Get workspace owner for user_id
      const { data: workspace } = await admin
        .from("workspaces")
        .select("owner_id")
        .eq("id", workspace_id)
        .single();

      if (workspace) {
        const expenseType = result.type === "credit" ? "income" : "expense";
        const { data: expense, error: expError } = await admin
          .from("expenses")
          .insert({
            workspace_id,
            user_id: (workspace as any).owner_id,
            type: expenseType,
            amount: result.amount,
            currency: "INR",
            description: result.merchant !== "Unknown"
              ? `${result.type === "credit" ? "Received from" : "Payment to"} ${result.merchant}`
              : `Bank ${result.type} - ${result.bank}`,
            expense_date: new Date().toISOString().split("T")[0],
            tags: ["auto-sms", result.bank.toLowerCase()],
          })
          .select("id")
          .single();

        if (!expError && expense) {
          expenseId = (expense as { id: string }).id;
        }
      }
    }

    return new Response(
      JSON.stringify({
        data: {
          parsed: true,
          transaction: result,
          expense_id: expenseId,
          auto_created: !!expenseId,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    console.error("parse-bank-sms error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
    );
  }
});
