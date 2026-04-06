/**
 * ExpenseFlow — Accounting Export Edge Function
 *
 * Exports expenses in accounting software formats:
 * - QuickBooks (IIF format)
 * - Xero (CSV format)
 * - Zoho Books (CSV format)
 *
 * Creates an export_job record, generates the file, uploads to Supabase Storage,
 * and returns a download URL.
 *
 * POST body: { workspace_id, format: 'qbo'|'xero'|'zoho', date_range?: { start, end } }
 */

import { createServiceClient, createUserClient } from "../_shared/supabase.ts";
import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExportRequest {
  workspace_id: string;
  format: "qbo" | "xero" | "zoho" | "csv";
  date_range?: { start: string; end: string };
}

interface ExpenseForExport {
  id: string;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  type: string;
  notes: string | null;
  tags: string[];
  categories?: { name: string } | null;
}

// ---------------------------------------------------------------------------
// Format generators
// ---------------------------------------------------------------------------

function generateQuickBooksIIF(expenses: ExpenseForExport[]): string {
  const lines: string[] = [];

  // IIF header
  lines.push("!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO");
  lines.push("!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO");
  lines.push("!ENDTRNS");

  for (const expense of expenses) {
    const date = formatDateUS(expense.expense_date);
    const category = (expense.categories as any)?.name ?? "Uncategorized";
    const amount = expense.type === "income" ? expense.amount : -expense.amount;
    const memo = sanitizeIIF(expense.description);

    // Transaction line
    lines.push(
      `TRNS\tCHECK\t${date}\tChecking\t${sanitizeIIF(category)}\t${amount.toFixed(2)}\t${memo}`,
    );

    // Split line (offset to expense category)
    lines.push(
      `SPL\tCHECK\t${date}\t${sanitizeIIF(category)}\t\t${(-amount).toFixed(2)}\t${memo}`,
    );

    lines.push("ENDTRNS");
  }

  return lines.join("\r\n");
}

function generateXeroCSV(expenses: ExpenseForExport[]): string {
  const headers = [
    "*ContactName",
    "EmailAddress",
    "POAddressLine1",
    "*InvoiceNumber",
    "*InvoiceDate",
    "*DueDate",
    "Total",
    "InventoryItemCode",
    "*Description",
    "*Quantity",
    "*UnitAmount",
    "*AccountCode",
    "*TaxType",
    "Currency",
  ];

  const lines: string[] = [headers.join(",")];

  for (const expense of expenses) {
    const category = (expense.categories as any)?.name ?? "General";
    const amount = expense.type === "income" ? expense.amount : expense.amount;
    const accountCode = expense.type === "income" ? "200" : "400";

    const row = [
      csvEscape("ExpenseFlow Import"),
      "",
      "",
      csvEscape(expense.id.slice(0, 8)),
      expense.expense_date,
      expense.expense_date,
      amount.toFixed(2),
      "",
      csvEscape(expense.description),
      "1",
      amount.toFixed(2),
      accountCode,
      "Tax Exempt",
      expense.currency,
    ];

    lines.push(row.join(","));
  }

  return lines.join("\r\n");
}

function generateZohoCSV(expenses: ExpenseForExport[]): string {
  const headers = [
    "Expense Date",
    "Expense Account",
    "Amount",
    "Currency Code",
    "Description",
    "Category Name",
    "Reference Number",
    "Notes",
  ];

  const lines: string[] = [headers.join(",")];

  for (const expense of expenses) {
    const category = (expense.categories as any)?.name ?? "General";
    const account = expense.type === "income" ? "Sales" : "Operating Expenses";

    const row = [
      expense.expense_date,
      csvEscape(account),
      expense.amount.toFixed(2),
      expense.currency,
      csvEscape(expense.description),
      csvEscape(category),
      expense.id.slice(0, 8),
      csvEscape(expense.notes ?? ""),
    ];

    lines.push(row.join(","));
  }

  return lines.join("\r\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateUS(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${month}/${day}/${year}`;
}

function sanitizeIIF(value: string): string {
  return value.replace(/\t/g, " ").replace(/\r?\n/g, " ");
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function getContentType(format: string): string {
  switch (format) {
    case "qbo":
      return "text/plain";
    case "xero":
    case "zoho":
    case "csv":
      return "text/csv";
    default:
      return "application/octet-stream";
  }
}

function getFileExtension(format: string): string {
  switch (format) {
    case "qbo":
      return "iif";
    case "xero":
    case "zoho":
    case "csv":
      return "csv";
    default:
      return "txt";
  }
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
    const body = (await req.json()) as ExportRequest;
    const { workspace_id, format, date_range } = body;

    if (!workspace_id || !format) {
      return errorResponse("Missing required fields: workspace_id, format");
    }

    if (!["qbo", "xero", "zoho", "csv"].includes(format)) {
      return errorResponse("Invalid format. Supported: qbo, xero, zoho, csv");
    }

    const admin = createServiceClient();

    // 1. Create export job record
    const { data: job, error: jobError } = await admin
      .from("export_jobs")
      .insert({
        workspace_id,
        format,
        status: "processing",
        filters: date_range ? { start: date_range.start, end: date_range.end } : {},
      })
      .select("id")
      .single();

    if (jobError || !job) {
      return errorResponse(`Failed to create export job: ${jobError?.message}`, 500);
    }

    const jobId = (job as { id: string }).id;

    try {
      // 2. Fetch expenses
      let query = admin
        .from("expenses")
        .select("id, description, amount, currency, expense_date, type, notes, tags, categories(name)")
        .eq("workspace_id", workspace_id)
        .is("deleted_at", null)
        .order("expense_date", { ascending: true });

      if (date_range?.start) {
        query = query.gte("expense_date", date_range.start);
      }
      if (date_range?.end) {
        query = query.lte("expense_date", date_range.end);
      }

      const { data: expenses, error: expError } = await query;

      if (expError) {
        throw new Error(`Failed to fetch expenses: ${expError.message}`);
      }

      const expenseList = (expenses ?? []) as unknown as ExpenseForExport[];

      // 3. Generate file content
      let content: string;
      switch (format) {
        case "qbo":
          content = generateQuickBooksIIF(expenseList);
          break;
        case "xero":
          content = generateXeroCSV(expenseList);
          break;
        case "zoho":
          content = generateZohoCSV(expenseList);
          break;
        default:
          content = generateXeroCSV(expenseList); // Fallback CSV
          break;
      }

      // 4. Upload to Supabase Storage
      const fileName = `exports/${workspace_id}/${jobId}.${getFileExtension(format)}`;
      const encoder = new TextEncoder();
      const fileData = encoder.encode(content);

      const { error: uploadError } = await admin.storage
        .from("exports")
        .upload(fileName, fileData, {
          contentType: getContentType(format),
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // 5. Get public URL
      const { data: urlData } = admin.storage.from("exports").getPublicUrl(fileName);
      const fileUrl = urlData?.publicUrl ?? fileName;

      // 6. Update job as completed
      await admin
        .from("export_jobs")
        .update({
          status: "completed",
          file_url: fileUrl,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      return new Response(
        JSON.stringify({
          data: {
            job_id: jobId,
            status: "completed",
            file_url: fileUrl,
            record_count: expenseList.length,
            format,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (err: unknown) {
      // Update job as failed
      await admin
        .from("export_jobs")
        .update({
          status: "failed",
          error_message: err instanceof Error ? err.message : "Unknown error",
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      throw err;
    }
  } catch (err: unknown) {
    console.error("accounting-export error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
    );
  }
});
