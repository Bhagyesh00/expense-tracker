import type { AIProvider } from '../providers';

export interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
}

export interface ParsedReceipt {
  merchant: string | null;
  amount: number | null;
  date: string | null;
  items: ReceiptItem[];
  tax: number | null;
  total: number | null;
  currency: string | null;
}

/**
 * Parse structured data from OCR text of a receipt.
 * Handles both English and Hindi text.
 */
export async function parseReceipt(
  provider: AIProvider,
  ocrText: string,
): Promise<ParsedReceipt> {
  if (!ocrText.trim()) {
    return emptyReceipt();
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

  try {
    const raw = await provider.generateText(prompt, {
      temperature: 0.1,
      maxTokens: 1024,
    });

    return parseReceiptResponse(raw);
  } catch {
    return emptyReceipt();
  }
}

function parseReceiptResponse(raw: string): ParsedReceipt {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return emptyReceipt();
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    const merchant =
      typeof parsed.merchant === 'string' ? parsed.merchant : null;

    const amount = toValidNumber(parsed.amount);
    const tax = toValidNumber(parsed.tax);
    const total = toValidNumber(parsed.total);

    const date = parseDate(parsed.date);
    const currency =
      typeof parsed.currency === 'string' ? parsed.currency.toUpperCase() : null;

    const items = parseItems(parsed.items);

    // Cross-validate: if total is present but amount isn't, derive it
    const finalAmount = amount ?? (total !== null && tax !== null ? total - tax : null);

    return {
      merchant,
      amount: finalAmount,
      date,
      items,
      tax,
      total,
      currency,
    };
  } catch {
    return emptyReceipt();
  }
}

function toValidNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) return null;
  if (num < 0) return null;

  return Math.round(num * 100) / 100;
}

function parseDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;

  // Try ISO format YYYY-MM-DD
  const isoMatch = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(`${year}-${month}-${day}`);
    if (!Number.isNaN(date.getTime())) {
      return `${year}-${month}-${day}`;
    }
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = value.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const padded = `${year}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}`;
    const date = new Date(padded);
    if (!Number.isNaN(date.getTime())) {
      return padded;
    }
  }

  return null;
}

function parseItems(value: unknown): ReceiptItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null,
    )
    .map((item) => ({
      name: typeof item.name === 'string' ? item.name : 'Unknown item',
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
