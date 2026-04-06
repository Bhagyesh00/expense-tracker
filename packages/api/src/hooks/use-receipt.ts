import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import type { TypedSupabaseClient } from '../client';

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

interface OcrScanResult {
  data: ParsedReceipt;
  ocrText: string;
}

interface UploadResult {
  url: string;
  path: string;
}

interface UseUploadReceiptOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
}

interface UseOcrScanOptions {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
}

interface UseReceiptPreviewOptions {
  client: TypedSupabaseClient;
  path: string | undefined;
}

// ---------------------------------------------------------------------------
// useUploadReceipt — uploads file to Supabase Storage
// ---------------------------------------------------------------------------

export function useUploadReceipt({ client, workspaceId }: UseUploadReceiptOptions) {
  const [progress, setProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: async (file: {
      uri: string;
      name: string;
      type: string;
      blob?: Blob;
    }): Promise<UploadResult> => {
      if (!workspaceId) throw new Error('Workspace ID required');

      setProgress(0);

      // Generate unique file path
      const timestamp = Date.now();
      const ext = file.name.split('.').pop() ?? 'jpg';
      const filePath = `${workspaceId}/${timestamp}.${ext}`;

      setProgress(20);

      // Prepare file data
      let fileData: Blob | ArrayBuffer;
      if (file.blob) {
        fileData = file.blob;
      } else if (file.uri.startsWith('data:')) {
        // Handle base64 data URI
        const base64 = file.uri.split(',')[1] ?? '';
        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        fileData = bytes.buffer;
      } else {
        // Fetch from local URI (React Native)
        const response = await fetch(file.uri);
        fileData = await response.blob();
      }

      setProgress(50);

      const { data, error } = await client.storage
        .from('receipts')
        .upload(filePath, fileData, {
          contentType: file.type || 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      setProgress(80);

      // Get public URL
      const { data: urlData } = client.storage
        .from('receipts')
        .getPublicUrl(data.path);

      setProgress(100);

      return {
        url: urlData.publicUrl,
        path: data.path,
      };
    },
    onSettled: () => {
      // Reset progress after a short delay
      setTimeout(() => setProgress(0), 500);
    },
  });

  return {
    ...mutation,
    progress,
  };
}

// ---------------------------------------------------------------------------
// useOcrScan — calls the OCR edge function
// ---------------------------------------------------------------------------

export function useOcrScan({ supabaseUrl, supabaseAnonKey, accessToken }: UseOcrScanOptions) {
  return useMutation({
    mutationFn: async (
      input: { imageUrl: string } | { base64Image: string },
    ): Promise<OcrScanResult> => {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/ocr-receipt`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify(input),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error ??
            `OCR scan failed: ${response.status}`,
        );
      }

      return response.json() as Promise<OcrScanResult>;
    },
  });
}

// ---------------------------------------------------------------------------
// useReceiptPreview — returns a signed URL for display
// ---------------------------------------------------------------------------

export function useReceiptPreview({ client, path }: UseReceiptPreviewOptions) {
  return useQuery({
    queryKey: ['receipt', 'preview', path],
    queryFn: async (): Promise<string> => {
      if (!path) throw new Error('Receipt path required');

      // If it's already a full URL, return as-is
      if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
      }

      // Create a signed URL (valid for 1 hour)
      const { data, error } = await client.storage
        .from('receipts')
        .createSignedUrl(path, 3600);

      if (error) throw error;
      if (!data?.signedUrl) throw new Error('Failed to create signed URL');

      return data.signedUrl;
    },
    enabled: !!path,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000,    // 1 hour
  });
}
