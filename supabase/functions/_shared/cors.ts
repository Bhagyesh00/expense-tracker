/**
 * ExpenseFlow — Shared CORS headers for Supabase Edge Functions
 *
 * Usage:
 *   import { corsHeaders, handleCors } from "../_shared/cors.ts";
 *
 *   Deno.serve(async (req) => {
 *     // Handle CORS preflight
 *     if (req.method === "OPTIONS") return handleCors();
 *
 *     // … your logic …
 *     return new Response(JSON.stringify(data), {
 *       headers: { ...corsHeaders, "Content-Type": "application/json" },
 *       status: 200,
 *     });
 *   });
 */

const ALLOWED_ORIGINS = [
  "https://expense-reducer.vercel.app",
  "http://localhost:3000",
  "http://localhost:8081",
  "exp://localhost:8081",
];

/**
 * Standard CORS headers attached to every response.
 * In production, replace the wildcard with your actual domain.
 */
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Max-Age": "86400",
};

/**
 * Return a 204 No Content response with CORS headers.
 * Use this to handle preflight OPTIONS requests.
 */
export function handleCors(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Build CORS headers that restrict the origin to known allowed origins.
 * Falls back to blocking the request if the origin is not recognized.
 */
export function restrictedCorsHeaders(
  origin: string | null,
): Record<string, string> {
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    ...corsHeaders,
    "Access-Control-Allow-Origin": allowed,
  };
}

/**
 * Create a JSON error response with CORS headers.
 */
export function errorResponse(
  message: string,
  status = 400,
): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
