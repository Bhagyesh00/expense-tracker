import type { AIProvider } from '../providers';

export interface GeneratedQuery {
  sql: string;
  params: unknown[];
  explanation: string;
}

/** Simplified schema description for the AI to understand the database. */
const SCHEMA_CONTEXT = `
Database schema:
- expenses(id, workspace_id, user_id, category_id, type ['expense'|'income'], amount, currency, description, notes, date, tags, is_recurring, is_split, location, created_at)
- categories(id, workspace_id, name, icon, color, is_default, sort_order)
- subcategories(id, category_id, name, icon, sort_order)
- budgets(id, workspace_id, user_id, category_id, name, amount, spent, currency, period ['weekly'|'monthly'|'quarterly'|'yearly'], start_date, end_date, alert_threshold, is_active)
- pending_payments(id, workspace_id, user_id, contact_id, direction ['give'|'receive'], amount, settled_amount, currency, status ['pending'|'partial'|'settled'|'overdue'|'cancelled'], description, due_date)
- contacts(id, workspace_id, name, email, phone)
- savings_goals(id, workspace_id, user_id, name, target_amount, current_amount, currency, target_date, is_completed)
`.trim();

/** Patterns that indicate mutation attempts -- blocked for safety. */
const MUTATION_PATTERNS =
  /\b(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|EXEC|EXECUTE|MERGE|REPLACE)\b/i;

/**
 * Generate a safe SELECT-only SQL query from a natural language question.
 */
export async function generateSQLQuery(
  provider: AIProvider,
  question: string,
  workspaceId: string,
  customSchema?: string,
): Promise<GeneratedQuery> {
  const schema = customSchema ?? SCHEMA_CONTEXT;

  const prompt = `You are a SQL query generator for a personal finance app (PostgreSQL). Convert the user's natural language question into a safe SELECT query.

${schema}

Rules:
- ONLY generate SELECT statements. Never generate INSERT, UPDATE, DELETE, DROP, ALTER, or any mutation.
- Always filter by workspace_id = $1 for security.
- Use proper aggregate functions (SUM, AVG, COUNT) when appropriate.
- Format dates using PostgreSQL functions (DATE_TRUNC, EXTRACT, etc.).
- For "this month", use: date >= DATE_TRUNC('month', CURRENT_DATE) AND date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
- For "last month", use: date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' AND date < DATE_TRUNC('month', CURRENT_DATE)
- When asking about categories, JOIN with categories table to get the name.
- Limit results to 50 rows maximum.
- Use aliases for readability.

User question: "${question}"

Respond with ONLY a JSON object:
{"sql": "<the SELECT query with $1 for workspace_id>", "params": [], "explanation": "<brief explanation of what the query does>"}`;

  const raw = await provider.generateText(prompt, {
    temperature: 0.1,
    maxTokens: 512,
  });

  const parsed = parseQueryResponse(raw);

  // Safety validation: ensure no mutation keywords
  if (MUTATION_PATTERNS.test(parsed.sql)) {
    throw new Error(
      'Generated query contains disallowed mutation keywords. Only SELECT queries are permitted.',
    );
  }

  // Ensure it starts with SELECT (after trimming whitespace and common prefixes)
  const trimmedSql = parsed.sql.trim();
  if (!trimmedSql.toUpperCase().startsWith('SELECT')) {
    throw new Error(
      'Generated query must be a SELECT statement.',
    );
  }

  // Inject the workspace_id as first parameter
  parsed.params = [workspaceId, ...parsed.params];

  return parsed;
}

function parseQueryResponse(raw: string): GeneratedQuery {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    if (typeof parsed.sql !== 'string' || !parsed.sql.trim()) {
      throw new Error('Missing or empty sql field in response');
    }

    return {
      sql: sanitizeSql(parsed.sql),
      params: Array.isArray(parsed.params) ? parsed.params : [],
      explanation:
        typeof parsed.explanation === 'string' ? parsed.explanation : '',
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('JSON')) {
      throw new Error(`Failed to parse SQL query from AI response: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Strip any remaining mutation keywords that might be hidden in comments or strings.
 */
function sanitizeSql(sql: string): string {
  // Remove SQL comments
  let cleaned = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  // Final safety check after removing comments
  if (MUTATION_PATTERNS.test(cleaned)) {
    throw new Error('Query contains disallowed statements after sanitization');
  }

  return cleaned.trim();
}
