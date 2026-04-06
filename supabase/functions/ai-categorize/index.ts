/**
 * ExpenseFlow — AI Categorize Edge Function
 *
 * Classifies an expense into a category using Gemini AI,
 * with a keyword-based fallback. Caches results in the ai_cache table.
 *
 * POST /ai-categorize
 * Body: { description: string, merchant?: string, categories: Array<{id, name}> }
 * Returns: { data: { categoryId, confidence, reasoning } }
 */

import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";
import { createUserClient, createServiceClient, getUserId } from "../_shared/supabase.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategorizeRequest {
  description: string;
  merchant?: string;
  categories: Array<{ id: string; name: string }>;
}

interface CategorizeResult {
  categoryId: string | null;
  confidence: number;
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Keyword map for fallback categorization
// ---------------------------------------------------------------------------

const KEYWORD_MAP: Record<string, string[]> = {
  food: [
    "restaurant", "cafe", "coffee", "pizza", "burger", "lunch", "dinner",
    "breakfast", "snack", "swiggy", "zomato", "uber eats", "food",
    "biryani", "chai", "tea", "bakery", "kitchen", "dine", "eat",
  ],
  transport: [
    "uber", "ola", "cab", "taxi", "auto", "rickshaw", "metro", "bus",
    "train", "flight", "fuel", "petrol", "diesel", "parking", "toll",
    "rapido", "lyft", "grab",
  ],
  shopping: [
    "amazon", "flipkart", "myntra", "mall", "store", "shop", "buy",
    "purchase", "market", "retail", "clothing", "shoes", "electronics",
  ],
  groceries: [
    "grocery", "groceries", "vegetables", "fruits", "milk", "bread",
    "supermarket", "bigbasket", "blinkit", "instamart", "zepto",
    "dunzo", "dmart", "reliance fresh",
  ],
  entertainment: [
    "movie", "cinema", "netflix", "spotify", "prime", "disney",
    "hotstar", "game", "gaming", "concert", "show", "event",
    "youtube", "subscription",
  ],
  utilities: [
    "electricity", "water", "gas", "internet", "wifi", "broadband",
    "phone", "mobile", "recharge", "bill", "utility",
  ],
  health: [
    "doctor", "hospital", "medical", "medicine", "pharmacy", "health",
    "gym", "fitness", "clinic", "lab", "test", "dental",
  ],
  education: [
    "course", "class", "tuition", "book", "udemy", "coursera",
    "school", "college", "university", "education", "training",
  ],
  rent: ["rent", "lease", "housing", "apartment", "flat"],
  insurance: ["insurance", "premium", "policy", "lic", "health insurance"],
};

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

    const body: CategorizeRequest = await req.json();
    const { description, merchant, categories } = body;

    if (!description || !categories || categories.length === 0) {
      return errorResponse("description and categories[] are required");
    }

    // Step 1: Check cache
    const admin = createServiceClient();
    const cacheKey = buildCacheKey(description, merchant);

    const { data: cached } = await admin
      .from("ai_cache")
      .select("data, expires_at")
      .eq("cache_key", cacheKey)
      .eq("cache_type", "categorization")
      .single();

    if (cached && new Date(cached.expires_at) > new Date()) {
      const cachedResult = cached.data as unknown as CategorizeResult;
      // Validate the cached categoryId still exists in the provided categories
      if (cachedResult.categoryId && categories.some((c) => c.id === cachedResult.categoryId)) {
        return jsonResponse({ data: cachedResult, source: "cache" });
      }
    }

    // Step 2: Try Gemini AI categorization
    let result: CategorizeResult;
    try {
      result = await categorizeWithGemini(description, merchant, categories);
    } catch (err: unknown) {
      console.warn("[ai-categorize] Gemini failed, falling back to keywords:", err);
      result = categorizeWithKeywords(description, merchant, categories);
    }

    // Step 3: Cache the result (24-hour TTL)
    if (result.categoryId) {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await admin.from("ai_cache").upsert(
        {
          cache_key: cacheKey,
          cache_type: "categorization",
          data: result as unknown as Record<string, unknown>,
          expires_at: expiresAt,
        },
        { onConflict: "cache_key,cache_type" },
      );
    }

    return jsonResponse({ data: result, source: "ai" });
  } catch (err: unknown) {
    console.error("[ai-categorize] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return errorResponse(message, 500);
  }
});

// ---------------------------------------------------------------------------
// Gemini AI categorization
// ---------------------------------------------------------------------------

async function categorizeWithGemini(
  description: string,
  merchant: string | undefined,
  categories: Array<{ id: string; name: string }>,
): Promise<CategorizeResult> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const fullDescription = merchant
    ? `${description} (merchant: ${merchant})`
    : description;

  const categoryList = categories
    .map((c) => `- id: "${c.id}", name: "${c.name}"`)
    .join("\n");

  const prompt = `You are an expense categorizer. Given an expense description, classify it into the most appropriate category.

Expense: "${fullDescription}"

Available categories:
${categoryList}

Respond with ONLY a JSON object:
{"categoryId": "<the matching category id>", "confidence": <0.0 to 1.0>, "reasoning": "<brief explanation>"}

Rules:
- categoryId MUST be one of the provided category IDs
- confidence should reflect how certain you are (0.0 = uncertain, 1.0 = certain)
- If no category fits well, pick the closest one and set confidence below 0.5`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 256,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const result = await response.json();
  const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Parse JSON from response
  const jsonMatch = rawText.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) {
    throw new Error("No JSON in Gemini response");
  }

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

  const categoryId = typeof parsed.categoryId === "string" ? parsed.categoryId : null;
  const confidence = typeof parsed.confidence === "number"
    ? Math.max(0, Math.min(1, parsed.confidence))
    : 0;
  const reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning : "";

  // Validate categoryId exists in provided list
  if (categoryId && !categories.some((c) => c.id === categoryId)) {
    throw new Error("AI returned invalid categoryId");
  }

  return { categoryId, confidence, reasoning };
}

// ---------------------------------------------------------------------------
// Keyword fallback categorization
// ---------------------------------------------------------------------------

function categorizeWithKeywords(
  description: string,
  merchant: string | undefined,
  categories: Array<{ id: string; name: string }>,
): CategorizeResult {
  const searchText = `${description} ${merchant ?? ""}`.toLowerCase();

  // Score each keyword category
  let bestCategoryName: string | null = null;
  let bestScore = 0;

  for (const [categoryName, keywords] of Object.entries(KEYWORD_MAP)) {
    let score = 0;
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        score += keyword.length; // Longer matches = higher confidence
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategoryName = categoryName;
    }
  }

  if (!bestCategoryName) {
    return {
      categoryId: null,
      confidence: 0,
      reasoning: "No keyword matches found",
    };
  }

  // Find matching category from provided list (case-insensitive name match)
  const matchedCategory = categories.find(
    (c) => c.name.toLowerCase().includes(bestCategoryName!) ||
      bestCategoryName!.includes(c.name.toLowerCase()),
  );

  if (!matchedCategory) {
    return {
      categoryId: null,
      confidence: 0,
      reasoning: `Keyword match "${bestCategoryName}" but no matching category in list`,
    };
  }

  // Confidence based on score — more keyword matches = higher confidence
  const confidence = Math.min(0.8, 0.3 + bestScore * 0.05);

  return {
    categoryId: matchedCategory.id,
    confidence: Math.round(confidence * 100) / 100,
    reasoning: `Keyword match: "${bestCategoryName}"`,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCacheKey(description: string, merchant?: string): string {
  const normalized = `${description.toLowerCase().trim()}|${(merchant ?? "").toLowerCase().trim()}`;
  return normalized;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
