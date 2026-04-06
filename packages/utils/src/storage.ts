/**
 * Storage path and file utilities for ExpenseFlow.
 *
 * These helpers produce deterministic, hierarchical paths used by the
 * Supabase Storage (or any S3-compatible) backend.  They do NOT perform
 * any I/O — they are pure functions.
 */

import { SUPPORTED_RECEIPT_TYPES, MAX_RECEIPT_SIZE } from './constants';

/**
 * Build the storage path for a receipt file.
 *
 * @param workspaceId - The workspace that owns the expense.
 * @param userId      - The uploading user's ID.
 * @param filename    - Original (or generated) filename including extension.
 * @returns A forward-slash-delimited path, e.g.
 *          `"receipts/ws_abc/usr_123/receipt.jpg"`.
 */
export function getReceiptUrl(
  workspaceId: string,
  userId: string,
  filename: string,
): string {
  return `receipts/${workspaceId}/${userId}/${filename}`;
}

/**
 * Build the storage path for a user avatar.
 *
 * @param userId   - The user's ID.
 * @param filename - Original (or generated) filename including extension.
 * @returns A forward-slash-delimited path, e.g. `"avatars/usr_123/avatar.png"`.
 */
export function getAvatarUrl(userId: string, filename: string): string {
  return `avatars/${userId}/${filename}`;
}

/**
 * Extract the file extension (without the leading dot) from a filename.
 *
 * @param filename - e.g. `"report.pdf"`, `"photo.JPEG"`.
 * @returns Lowercase extension, or an empty string if none is found.
 *
 * @example
 * getFileExtension('receipt.PDF');  // "pdf"
 * getFileExtension('no-ext');       // ""
 */
export function getFileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex === filename.length - 1) return '';
  return filename.slice(dotIndex + 1).toLowerCase();
}

/**
 * Check whether a MIME type is in the list of accepted receipt types.
 *
 * @param mimeType - The file's MIME type (e.g. `"image/png"`).
 * @returns `true` if the type is supported.
 */
export function isValidReceiptType(mimeType: string): boolean {
  return (SUPPORTED_RECEIPT_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Format a byte count into a human-readable string.
 *
 * @param bytes - File size in bytes.
 * @returns Formatted string, e.g. `"2.4 MB"`, `"512 B"`.
 *
 * @example
 * formatFileSize(0);            // "0 B"
 * formatFileSize(1024);         // "1.0 KB"
 * formatFileSize(10_485_760);   // "10.0 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  // Show decimals only for KB and above.
  return i === 0
    ? `${value} ${units[i]}`
    : `${value.toFixed(1)} ${units[i]}`;
}

/**
 * Check whether a file size is within the maximum allowed receipt size.
 *
 * @param bytes - File size in bytes.
 * @returns `true` if the file is within the limit.
 */
export function isWithinReceiptSizeLimit(bytes: number): boolean {
  return bytes > 0 && bytes <= MAX_RECEIPT_SIZE;
}
