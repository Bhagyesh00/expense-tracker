/**
 * ExpenseFlow — Google Sheets Sync Edge Function
 *
 * Syncs workspace expenses to a connected Google Sheets spreadsheet.
 * - Reads integration config for the workspace
 * - Fetches recent expenses (last 30 days by default)
 * - Appends/updates rows via Google Sheets API v4
 * - Handles OAuth token refresh when expired
 *
 * POST body: { workspace_id: string, days?: number, spreadsheet_id?: string }
 */

import { createServiceClient, createUserClient } from "../_shared/supabase.ts";
import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GoogleSheetsConfig {
  spreadsheet_id: string;
  sheet_name: string;
  column_mapping?: Record<string, string>;
}

interface IntegrationRow {
  id: string;
  config: GoogleSheetsConfig;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
}

interface ExpenseRow {
  id: string;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  type: string;
  tags: string[];
  notes: string | null;
  categories?: { name: string } | null;
}

// ---------------------------------------------------------------------------
// Google OAuth token refresh
// ---------------------------------------------------------------------------

async function refreshAccessToken(
  refreshToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Google Sheets API helpers
// ---------------------------------------------------------------------------

async function appendToSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  values: string[][],
): Promise<void> {
  const range = encodeURIComponent(`${sheetName}!A:H`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Sheets API append failed: ${err}`);
  }
}

async function clearAndWriteSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  values: string[][],
): Promise<void> {
  const range = encodeURIComponent(`${sheetName}!A:H`);

  // Clear existing data
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:clear`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  // Write all rows
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Sheets API write failed: ${err}`);
  }
}

// ---------------------------------------------------------------------------
// Map expense rows to spreadsheet values
// ---------------------------------------------------------------------------

function mapExpensesToRows(expenses: ExpenseRow[]): string[][] {
  const header = [
    "ID",
    "Date",
    "Type",
    "Description",
    "Category",
    "Amount",
    "Currency",
    "Tags",
    "Notes",
  ];

  const rows = expenses.map((e) => [
    e.id,
    e.expense_date,
    e.type,
    e.description,
    (e.categories as any)?.name ?? "",
    e.amount.toString(),
    e.currency,
    (e.tags ?? []).join(", "),
    e.notes ?? "",
  ]);

  return [header, ...rows];
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
    const { workspace_id, days = 30, mode = "replace" } = body as {
      workspace_id?: string;
      days?: number;
      mode?: "append" | "replace";
    };

    if (!workspace_id) {
      return errorResponse("Missing workspace_id");
    }

    const admin = createServiceClient();

    // 1. Fetch Google Sheets integration
    const { data: integration, error: intError } = await admin
      .from("integrations")
      .select("id, config, access_token, refresh_token, expires_at")
      .eq("workspace_id", workspace_id)
      .eq("provider", "google_sheets")
      .eq("is_active", true)
      .single();

    if (intError || !integration) {
      return errorResponse("Google Sheets integration not found or inactive", 404);
    }

    const intRow = integration as unknown as IntegrationRow;
    const config = intRow.config;

    if (!config?.spreadsheet_id || !config?.sheet_name) {
      return errorResponse("Integration missing spreadsheet_id or sheet_name in config");
    }

    // 2. Check and refresh access token if expired
    let accessToken = intRow.access_token;

    if (!accessToken || (intRow.expires_at && new Date(intRow.expires_at) <= new Date())) {
      if (!intRow.refresh_token) {
        return errorResponse("Access token expired and no refresh token available", 401);
      }

      const tokenData = await refreshAccessToken(intRow.refresh_token);
      accessToken = tokenData.access_token;

      // Store refreshed token
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      await admin
        .from("integrations")
        .update({
          access_token: accessToken,
          expires_at: expiresAt,
        })
        .eq("id", intRow.id);
    }

    if (!accessToken) {
      return errorResponse("No valid access token", 401);
    }

    // 3. Fetch recent expenses
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: expenses, error: expError } = await admin
      .from("expenses")
      .select("id, description, amount, currency, expense_date, type, tags, notes, categories(name)")
      .eq("workspace_id", workspace_id)
      .gte("expense_date", startDate.toISOString().split("T")[0]!)
      .is("deleted_at", null)
      .order("expense_date", { ascending: false });

    if (expError) {
      return errorResponse(`Failed to fetch expenses: ${expError.message}`, 500);
    }

    const rows = mapExpensesToRows((expenses ?? []) as unknown as ExpenseRow[]);

    // 4. Write to Google Sheets
    if (mode === "append") {
      // Skip header, append only data rows
      await appendToSheet(accessToken, config.spreadsheet_id, config.sheet_name, rows.slice(1));
    } else {
      // Replace: clear and rewrite all data with header
      await clearAndWriteSheet(accessToken, config.spreadsheet_id, config.sheet_name, rows);
    }

    const summary = {
      synced_count: (expenses ?? []).length,
      spreadsheet_id: config.spreadsheet_id,
      sheet_name: config.sheet_name,
      mode,
      date_range: {
        from: startDate.toISOString().split("T")[0],
        to: new Date().toISOString().split("T")[0],
      },
    };

    return new Response(
      JSON.stringify({ data: summary }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    console.error("google-sheets-sync error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
    );
  }
});
