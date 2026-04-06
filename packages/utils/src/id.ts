/**
 * ID and slug generation utilities for ExpenseFlow.
 */

import { nanoid } from 'nanoid';

/**
 * Generate a globally unique, URL-safe identifier.
 *
 * Uses `nanoid` (21-character alphabet by default) which provides ~149 bits
 * of entropy — sufficient for database primary keys and public-facing IDs.
 *
 * @param size - Optional length override (default 21).
 * @returns A random alphanumeric string.
 *
 * @example
 * generateId();    // "V1StGXR8_Z5jdHi6B-myT"
 * generateId(12);  // "kf3Ld92Hax_q"
 */
export function generateId(size: number = 21): string {
  return nanoid(size);
}

/**
 * Create a URL-friendly slug from a human-readable name, with a short
 * random suffix to avoid collisions.
 *
 * @param name - The source string (e.g. a workspace name).
 * @returns A lowercase, hyphenated slug with a 6-char random suffix.
 *
 * @example
 * generateSlug('My Workspace');  // "my-workspace-a1b2c3"
 * generateSlug('Hello World!');  // "hello-world-x9y8z7"
 */
export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')   // strip non-word characters (except spaces & hyphens)
    .replace(/[\s_]+/g, '-')    // collapse whitespace / underscores to hyphens
    .replace(/-+/g, '-')        // collapse consecutive hyphens
    .replace(/^-|-$/g, '');     // trim leading / trailing hyphens

  const suffix = nanoid(6);
  return `${base}-${suffix}`;
}
