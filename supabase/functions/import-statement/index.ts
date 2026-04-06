/**
 * ExpenseFlow — Bank Statement Import Edge Function (Phase 12)
 *
 * Accepts bank statement files (CSV, OFX, QIF, PDF) and parses them
 * into bank_transactions. Attempts auto-matching with existing expenses.
 *
 * POST body: { workspace_id, statement_id, file_url, file_type }
 */

import { createServiceClient } from "../_shared/supabase.ts";
import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
  balance?: number;
  reference?: string;
}

interface ImportRequest {
  workspace_id: string;
  statement_id: string;
  file_url: string;
  file_type: "csv" | "ofx" | "qif" | "pdf";
}

// ---------------------------------------------------------------------------
// CSV Parser — auto-detect column mapping
// ---------------------------------------------------------------------------

function parseCSV(content: string): ParsedTransaction[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const header = lines[0]!.toLowerCase();
  const columns = splitCSVLine(lines[0]!);

  // Auto-detect column indices
  const dateIdx = findColumnIndex(columns, ["date", "transaction date", "txn date", "posting date", "value date"]);
  const descIdx = findColumnIndex(columns, ["description", "narration", "particulars", "details", "memo", "transaction details"]);
  const amountIdx = findColumnIndex(columns, ["amount", "transaction amount", "txn amount"]);
  const debitIdx = findColumnIndex(columns, ["debit", "withdrawal", "dr"]);
  const creditIdx = findColumnIndex(columns, ["credit", "deposit", "cr"]);
  const balanceIdx = findColumnIndex(columns, ["balance", "closing balance", "running balance"]);

  if (dateIdx === -1 || descIdx === -1) {
    // If no clear mapping, try positional: date, description, amount
    if (columns.length >= 3) {
      return parseCSVPositional(lines.slice(1));
    }
    return [];
  }

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]!);
    if (cols.length <= Math.max(dateIdx, descIdx)) continue;

    const dateStr = cols[dateIdx]?.trim() ?? "";
    const description = cols[descIdx]?.trim() ?? "";
    const date = normalizeDate(dateStr);

    if (!date) continue;

    let amount = 0;
    let type: "debit" | "credit" = "debit";

    if (amountIdx !== -1) {
      const rawAmount = parseFloat((cols[amountIdx] ?? "0").replace(/[,\s"]/g, ""));
      amount = Math.abs(rawAmount);
      type = rawAmount < 0 ? "debit" : "credit";
    } else if (debitIdx !== -1 || creditIdx !== -1) {
      const debitVal = debitIdx !== -1 ? parseFloat((cols[debitIdx] ?? "0").replace(/[,\s"]/g, "")) : 0;
      const creditVal = creditIdx !== -1 ? parseFloat((cols[creditIdx] ?? "0").replace(/[,\s"]/g, "")) : 0;

      if (debitVal > 0) {
        amount = debitVal;
        type = "debit";
      } else if (creditVal > 0) {
        amount = creditVal;
        type = "credit";
      }
    }

    if (amount <= 0 || !description) continue;

    const balance = balanceIdx !== -1
      ? parseFloat((cols[balanceIdx] ?? "").replace(/[,\s"]/g, "")) || undefined
      : undefined;

    transactions.push({ date, description, amount, type, balance });
  }

  return transactions;
}

function parseCSVPositional(lines: string[]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  for (const line of lines) {
    const cols = splitCSVLine(line);
    if (cols.length < 3) continue;

    const date = normalizeDate(cols[0]?.trim() ?? "");
    const description = cols[1]?.trim() ?? "";
    const rawAmount = parseFloat((cols[2] ?? "0").replace(/[,\s"]/g, ""));

    if (!date || !description || rawAmount === 0) continue;

    transactions.push({
      date,
      description,
      amount: Math.abs(rawAmount),
      type: rawAmount < 0 ? "debit" : "credit",
    });
  }

  return transactions;
}

// ---------------------------------------------------------------------------
// OFX Parser
// ---------------------------------------------------------------------------

function parseOFX(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;

  let match;
  while ((match = stmtTrnRegex.exec(content)) !== null) {
    const block = match[1]!;

    const trnType = extractOFXTag(block, "TRNTYPE");
    const datePosted = extractOFXTag(block, "DTPOSTED");
    const amount = parseFloat(extractOFXTag(block, "TRNAMT") ?? "0");
    const name = extractOFXTag(block, "NAME") ?? extractOFXTag(block, "MEMO") ?? "";
    const fitid = extractOFXTag(block, "FITID");

    if (!datePosted || amount === 0) continue;

    const date = normalizeOFXDate(datePosted);
    if (!date) continue;

    transactions.push({
      date,
      description: name.trim(),
      amount: Math.abs(amount),
      type: amount < 0 ? "debit" : "credit",
      reference: fitid ?? undefined,
    });
  }

  return transactions;
}

function extractOFXTag(block: string, tag: string): string | null {
  // OFX can use <TAG>value or <TAG>value</TAG>
  const regex = new RegExp(`<${tag}>\\s*([^<\\r\\n]+)`, "i");
  const match = block.match(regex);
  return match ? match[1]!.trim() : null;
}

function normalizeOFXDate(dateStr: string): string | null {
  // OFX dates: YYYYMMDD or YYYYMMDDHHMMSS
  const match = dateStr.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

// ---------------------------------------------------------------------------
// QIF Parser
// ---------------------------------------------------------------------------

function parseQIF(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const entries = content.split("^").filter((e) => e.trim().length > 0);

  for (const entry of entries) {
    const lines = entry.split(/\r?\n/).filter((l) => l.trim().length > 0);

    let date = "";
    let amount = 0;
    let description = "";

    for (const line of lines) {
      const code = line[0];
      const value = line.slice(1).trim();

      switch (code) {
        case "D": // Date
          date = normalizeDate(value) ?? "";
          break;
        case "T": // Amount
        case "U":
          amount = parseFloat(value.replace(/[,\s]/g, "")) || 0;
          break;
        case "P": // Payee
        case "M": // Memo
          if (!description) description = value;
          break;
      }
    }

    if (date && amount !== 0 && description) {
      transactions.push({
        date,
        description,
        amount: Math.abs(amount),
        type: amount < 0 ? "debit" : "credit",
      });
    }
  }

  return transactions;
}

// ---------------------------------------------------------------------------
// PDF Parser (pattern-based extraction)
// ---------------------------------------------------------------------------

function parsePDFText(text: string): ParsedTransaction[] {
  // For PDF, we extract text content and apply common bank statement patterns
  const transactions: ParsedTransaction[] = [];
  const lines = text.split(/\r?\n/);

  // Common pattern: DATE DESCRIPTION DEBIT/CREDIT BALANCE
  const linePattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+(.+?)\s+([\d,]+\.?\d{0,2})\s*(Dr|Cr|DR|CR)?\s*([\d,]+\.?\d{0,2})?$/;

  for (const line of lines) {
    const match = line.trim().match(linePattern);
    if (!match) continue;

    const date = normalizeDate(match[1]!);
    if (!date) continue;

    const description = match[2]!.trim();
    const amount = parseFloat(match[3]!.replace(/,/g, ""));
    const drCr = match[4]?.toUpperCase();

    if (amount <= 0 || !description) continue;

    transactions.push({
      date,
      description,
      amount,
      type: drCr === "CR" ? "credit" : "debit",
      balance: match[5] ? parseFloat(match[5].replace(/,/g, "")) : undefined,
    });
  }

  return transactions;
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function findColumnIndex(columns: string[], candidates: string[]): number {
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i]!.toLowerCase().replace(/["\s]/g, "").trim();
    if (candidates.some((c) => col.includes(c.replace(/\s/g, "")))) {
      return i;
    }
  }
  return -1;
}

function normalizeDate(raw: string): string | null {
  // Try common date formats: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY
  const separators = raw.match(/(\d{1,4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,4})/);
  if (!separators) return null;

  let [, a, b, c] = separators;

  // YYYY-MM-DD
  if (a!.length === 4) {
    return `${a}-${b!.padStart(2, "0")}-${c!.padStart(2, "0")}`;
  }

  // DD/MM/YYYY or DD/MM/YY (Indian format preference)
  if (c!.length === 4) {
    // Assume DD/MM/YYYY for Indian banks
    return `${c}-${b!.padStart(2, "0")}-${a!.padStart(2, "0")}`;
  }

  // DD/MM/YY
  if (c!.length === 2) {
    const year = parseInt(c!) > 50 ? `19${c}` : `20${c}`;
    return `${year}-${b!.padStart(2, "0")}-${a!.padStart(2, "0")}`;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Auto-matching with existing expenses
// ---------------------------------------------------------------------------

async function matchTransactions(
  admin: ReturnType<typeof createServiceClient>,
  workspaceId: string,
  transactions: ParsedTransaction[],
): Promise<Map<number, string>> {
  const matches = new Map<number, string>();

  if (transactions.length === 0) return matches;

  // Get date range of transactions
  const dates = transactions.map((t) => t.date).sort();
  const startDate = dates[0]!;
  const endDate = dates[dates.length - 1]!;

  // Fetch expenses in the same date range
  const { data: expenses } = await admin
    .from("expenses")
    .select("id, amount, description, expense_date")
    .eq("workspace_id", workspaceId)
    .gte("expense_date", startDate)
    .lte("expense_date", endDate)
    .is("deleted_at", null);

  if (!expenses || expenses.length === 0) return matches;

  // Simple matching: same amount and date
  for (let i = 0; i < transactions.length; i++) {
    const txn = transactions[i]!;
    const match = expenses.find(
      (e: any) =>
        Math.abs(e.amount - txn.amount) < 0.01 &&
        e.expense_date === txn.date,
    );

    if (match) {
      matches.set(i, (match as any).id);
    }
  }

  return matches;
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
    const body = (await req.json()) as ImportRequest;
    const { workspace_id, statement_id, file_url, file_type } = body;

    if (!workspace_id || !statement_id || !file_url || !file_type) {
      return errorResponse("Missing required fields: workspace_id, statement_id, file_url, file_type");
    }

    const admin = createServiceClient();

    // 1. Update statement status to processing
    await admin
      .from("bank_statements")
      .update({ status: "processing" })
      .eq("id", statement_id);

    try {
      // 2. Download file from storage
      const { data: fileData, error: downloadError } = await admin.storage
        .from("statements")
        .download(file_url);

      if (downloadError || !fileData) {
        throw new Error(`File download failed: ${downloadError?.message ?? "No data"}`);
      }

      const content = await fileData.text();

      // 3. Parse based on file type
      let transactions: ParsedTransaction[];

      switch (file_type) {
        case "csv":
          transactions = parseCSV(content);
          break;
        case "ofx":
          transactions = parseOFX(content);
          break;
        case "qif":
          transactions = parseQIF(content);
          break;
        case "pdf":
          // For PDF, we work with the text content
          // In production, this would use OCR; here we parse extracted text
          transactions = parsePDFText(content);
          break;
        default:
          throw new Error(`Unsupported file type: ${file_type}`);
      }

      if (transactions.length === 0) {
        await admin
          .from("bank_statements")
          .update({
            status: "completed",
            parsed_count: 0,
            matched_count: 0,
          })
          .eq("id", statement_id);

        return new Response(
          JSON.stringify({
            data: { parsed_count: 0, matched_count: 0, message: "No transactions found" },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // 4. Auto-match with existing expenses
      const matches = await matchTransactions(admin, workspace_id, transactions);

      // 5. Get or create a manual bank connection for statement imports
      let { data: connection } = await admin
        .from("bank_connections")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("provider", "manual")
        .eq("account_name", "Statement Import")
        .single();

      if (!connection) {
        const { data: newConn } = await admin
          .from("bank_connections")
          .insert({
            workspace_id,
            provider: "manual",
            institution_name: "Manual Import",
            account_name: "Statement Import",
            account_type: "checking",
            status: "active",
          })
          .select("id")
          .single();
        connection = newConn;
      }

      if (!connection) {
        throw new Error("Failed to create bank connection");
      }

      // 6. Insert bank_transactions
      const connectionId = (connection as { id: string }).id;
      let matchedCount = 0;

      const txnInserts = transactions.map((txn, idx) => {
        const matchedExpenseId = matches.get(idx) ?? null;
        if (matchedExpenseId) matchedCount++;

        return {
          workspace_id,
          bank_connection_id: connectionId,
          transaction_id: `stmt_${statement_id}_${idx}`,
          amount: txn.type === "debit" ? -txn.amount : txn.amount,
          currency: "INR",
          description: txn.description,
          merchant_name: txn.description,
          date: txn.date,
          status: "posted",
          is_matched: !!matchedExpenseId,
          matched_expense_id: matchedExpenseId,
          raw_data: { source: "statement_import", statement_id, index: idx },
        };
      });

      // Insert in batches of 100
      for (let i = 0; i < txnInserts.length; i += 100) {
        const batch = txnInserts.slice(i, i + 100);
        const { error: insertError } = await admin
          .from("bank_transactions")
          .insert(batch);

        if (insertError) {
          console.error(`Batch insert error at offset ${i}:`, insertError);
        }
      }

      // 7. Update statement record
      await admin
        .from("bank_statements")
        .update({
          status: "completed",
          parsed_count: transactions.length,
          matched_count: matchedCount,
        })
        .eq("id", statement_id);

      return new Response(
        JSON.stringify({
          data: {
            parsed_count: transactions.length,
            matched_count: matchedCount,
            unmatched_count: transactions.length - matchedCount,
            statement_id,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (err: unknown) {
      // Update statement as failed
      await admin
        .from("bank_statements")
        .update({
          status: "failed",
          error_message: err instanceof Error ? err.message : "Unknown error",
        })
        .eq("id", statement_id);

      throw err;
    }
  } catch (err: unknown) {
    console.error("import-statement error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
    );
  }
});
