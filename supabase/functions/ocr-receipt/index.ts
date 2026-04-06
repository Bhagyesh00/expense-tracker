/**
 * ExpenseFlow — OCR Receipt Edge Function
 *
 * Accepts a receipt image (URL or base64), runs OCR to extract text,
 * then uses Gemini AI to parse structured receipt data.
 * Falls back to regex-based extraction if AI fails.
 *
 * POST /ocr-receipt
 * Body: { imageUrl: string } | { base64Image: string }
 * Returns: { data: ParsedReceipt }
 */

import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";
import { createUserClient, createServiceClient, getUserId } from "../_shared/supabase.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
}

interface ParsedReceipt {
  merchant: string | null;
  amount: number | null;
  date: string | null;
  items: ReceiptItem[];
  tax: number | null;
  total: number | null;
  currency: string | null;
}

interface OcrRequest {
  imageUrl?: string;
  base64Image?: string;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    // Auth verification
    const userClient = createUserClient(req);
    const userId = await getUserId(userClient);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const body: OcrRequest = await req.json();
    const { imageUrl, base64Image } = body;

    if (!imageUrl && !base64Image) {
      return errorResponse("Either imageUrl or base64Image is required");
    }

    // Step 1: Get image bytes
    let imageBytes: Uint8Array;

    if (base64Image) {
      // Strip data URI prefix if present
      const base64Clean = base64Image.replace(/^data:image\/\w+;base64,/, "");
      imageBytes = Uint8Array.from(atob(base64Clean), (c) => c.charCodeAt(0));
    } else {
      // Download from Supabase Storage or external URL
      imageBytes = await downloadImage(imageUrl!);
    }

    // Step 2: Run OCR via Tesseract.js worker
    const ocrText = await runOcr(imageBytes);

    if (!ocrText.trim()) {
      return jsonResponse({ data: emptyReceipt(), ocrText: "" });
    }

    // Step 3: Parse receipt using Gemini AI, with regex fallback
    let parsed: ParsedReceipt;
    try {
      parsed = await parseReceiptWithGemini(ocrText);
    } catch {
      parsed = parseReceiptWithRegex(ocrText);
    }

    return jsonResponse({ data: parsed, ocrText });
  } catch (err: unknown) {
    console.error("[ocr-receipt] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return errorResponse(message, 500);
  }
});

// ---------------------------------------------------------------------------
// Image download
// ---------------------------------------------------------------------------

async function downloadImage(url: string): Promise<Uint8Array> {
  // If it's a Supabase Storage path (not a full URL), download via service client
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    const admin = createServiceClient();
    const { data, error } = await admin.storage
      .from("receipts")
      .download(url);

    if (error || !data) {
      throw new Error(`Failed to download from storage: ${error?.message ?? "No data"}`);
    }
    return new Uint8Array(await data.arrayBuffer());
  }

  // External URL
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

// ---------------------------------------------------------------------------
// OCR via Tesseract.js (Deno-compatible)
// ---------------------------------------------------------------------------

async function runOcr(imageBytes: Uint8Array): Promise<string> {
  // Use Tesseract.js via esm.sh for Deno
  const { createWorker } = await import("https://esm.sh/tesseract.js@5");

  const worker = await createWorker("eng", 1, {
    // Suppress verbose logging in production
    logger: () => {},
  });

  try {
    const { data } = await worker.recognize(imageBytes);
    return data.text ?? "";
  } finally {
    await worker.terminate();
  }
}

// ---------------------------------------------------------------------------
// Gemini AI receipt parsing
// ---------------------------------------------------------------------------

async function parseReceiptWithGemini(ocrText: string): Promise<ParsedReceipt> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const prompt = `You are a receipt parser. Extract structured data from the following OCR text of a receipt. The text may be in English or Hindi.

OCR Text:
"""
${ocrText.slice(0, 3000)}
"""

Extract the following fields. If a field cannot be determined, use null.
- merchant: store/restaurant name
- amount: subtotal before tax (as a number)
- date: transaction date in YYYY-MM-DD format
- items: array of {name, qty, price} for each line item
- tax: tax amount (as a number)
- total: final total (as a number)
- currency: "INR", "USD", etc. Default to "INR" if unclear

Important:
- All monetary values must be numbers, not strings
- Quantities default to 1 if not specified
- Parse Hindi numerals if present
- If the text is too garbled to parse, return all nulls

Respond with ONLY a JSON object matching this structure:
{"merchant": null, "amount": null, "date": null, "items": [], "tax": null, "total": null, "currency": null}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const result = await response.json();
  const rawText =
    result?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  return parseReceiptJson(rawText);
}

// ---------------------------------------------------------------------------
// JSON response parser (shared between AI and regex)
// ---------------------------------------------------------------------------

function parseReceiptJson(raw: string): ParsedReceipt {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return emptyReceipt();

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

  const merchant = typeof parsed.merchant === "string" ? parsed.merchant : null;
  const amount = toValidNumber(parsed.amount);
  const tax = toValidNumber(parsed.tax);
  const total = toValidNumber(parsed.total);
  const date = parseDate(parsed.date);
  const currency =
    typeof parsed.currency === "string" ? parsed.currency.toUpperCase() : null;
  const items = parseItems(parsed.items);

  // Cross-validate: derive amount from total - tax if missing
  const finalAmount =
    amount ?? (total !== null && tax !== null ? total - tax : null);

  return { merchant, amount: finalAmount, date, items, tax, total, currency };
}

// ---------------------------------------------------------------------------
// Regex fallback parser
// ---------------------------------------------------------------------------

function parseReceiptWithRegex(ocrText: string): ParsedReceipt {
  const lines = ocrText.split("\n").map((l) => l.trim()).filter(Boolean);

  // Merchant: usually the first non-empty line
  const merchant = lines[0] ?? null;

  // Total: look for "total" followed by a number
  let total: number | null = null;
  let tax: number | null = null;
  let amount: number | null = null;

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Total detection
    if (/\btotal\b/i.test(lower) && !/\bsub\s*total\b/i.test(lower)) {
      const match = line.match(/([\d,]+\.?\d*)/);
      if (match) total = parseNumber(match[1]!);
    }

    // Subtotal detection
    if (/\bsub\s*total\b/i.test(lower)) {
      const match = line.match(/([\d,]+\.?\d*)/);
      if (match) amount = parseNumber(match[1]!);
    }

    // Tax detection
    if (/\b(tax|gst|vat|cgst|sgst)\b/i.test(lower)) {
      const match = line.match(/([\d,]+\.?\d*)/);
      if (match) tax = parseNumber(match[1]!);
    }
  }

  // Date: look for date patterns
  const dateMatch = ocrText.match(
    /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/,
  );
  let date: string | null = null;
  if (dateMatch) {
    const [, d, m, y] = dateMatch;
    const year = y!.length === 2 ? `20${y}` : y;
    date = `${year}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }

  // Currency: look for symbols
  let currency: string | null = "INR";
  if (/\$/.test(ocrText)) currency = "USD";
  if (/[£]/.test(ocrText)) currency = "GBP";
  if (/[€]/.test(ocrText)) currency = "EUR";
  if (/[¥]/.test(ocrText)) currency = "JPY";

  // Items: look for lines with prices
  const items: ReceiptItem[] = [];
  for (const line of lines) {
    const itemMatch = line.match(/^(.+?)\s+([\d,]+\.?\d*)$/);
    if (itemMatch && itemMatch[1] && itemMatch[2]) {
      const name = itemMatch[1].trim();
      const price = parseNumber(itemMatch[2]);
      if (price !== null && price > 0 && name.length > 1) {
        items.push({ name, qty: 1, price });
      }
    }
  }

  const finalAmount = amount ?? (total !== null && tax !== null ? total - tax : null);

  return { merchant, amount: finalAmount, date, items, tax, total, currency };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toValidNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (Number.isNaN(num) || !Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100) / 100;
}

function parseNumber(str: string): number | null {
  const cleaned = str.replace(/,/g, "");
  const num = parseFloat(cleaned);
  if (Number.isNaN(num) || !Number.isFinite(num)) return null;
  return Math.round(num * 100) / 100;
}

function parseDate(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const isoMatch = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const d = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`);
    if (!Number.isNaN(d.getTime())) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  const dmyMatch = value.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (dmyMatch) {
    const padded = `${dmyMatch[3]}-${dmyMatch[2]!.padStart(2, "0")}-${dmyMatch[1]!.padStart(2, "0")}`;
    const d = new Date(padded);
    if (!Number.isNaN(d.getTime())) return padded;
  }
  return null;
}

function parseItems(value: unknown): ReceiptItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      name: typeof item.name === "string" ? item.name : "Unknown item",
      qty: toValidNumber(item.qty) ?? 1,
      price: toValidNumber(item.price) ?? 0,
    }))
    .filter((item) => item.price > 0);
}

function emptyReceipt(): ParsedReceipt {
  return {
    merchant: null,
    amount: null,
    date: null,
    items: [],
    tax: null,
    total: null,
    currency: null,
  };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
