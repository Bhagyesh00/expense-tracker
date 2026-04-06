"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/cn";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  MAX_RECEIPT_SIZE,
  SUPPORTED_RECEIPT_TYPES,
} from "@expenseflow/utils";
import {
  Upload,
  Camera,
  FileImage,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface OcrResult {
  amount?: number;
  merchant?: string;
  date?: string;
  items?: string[];
}

interface ReceiptUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  onOcrResult?: (result: OcrResult) => void;
  className?: string;
}

export function ReceiptUpload({
  value,
  onChange,
  onOcrResult,
  className,
}: ReceiptUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!SUPPORTED_RECEIPT_TYPES.includes(file.type as typeof SUPPORTED_RECEIPT_TYPES[number])) {
      return "Unsupported file type. Please upload JPG, PNG, or PDF files.";
    }
    if (file.size > MAX_RECEIPT_SIZE) {
      return "File is too large. Maximum size is 10MB.";
    }
    return null;
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      const error = validateFile(file);
      if (error) {
        setUploadError(error);
        return;
      }

      setUploadError(null);
      setIsUploading(true);
      setOcrResult(null);
      setOcrError(null);

      // Show local preview
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }

      try {
        const supabase = createBrowserClient();
        const ext = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const filePath = `receipts/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from("receipts")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadErr) throw uploadErr;

        const {
          data: { publicUrl },
        } = supabase.storage.from("receipts").getPublicUrl(filePath);

        onChange(publicUrl);
        setIsUploading(false);

        // Trigger OCR
        if (onOcrResult) {
          setIsOcrProcessing(true);
          try {
            const { data: ocrData, error: ocrErr } =
              await supabase.functions.invoke("ocr-receipt", {
                body: { receiptUrl: publicUrl },
              });

            if (ocrErr) throw ocrErr;

            const result: OcrResult = {
              amount: ocrData?.amount,
              merchant: ocrData?.merchant,
              date: ocrData?.date,
              items: ocrData?.items,
            };
            setOcrResult(result);
            onOcrResult(result);
          } catch {
            setOcrError("OCR processing failed. You can fill in the details manually.");
          } finally {
            setIsOcrProcessing(false);
          }
        }
      } catch {
        setUploadError("Failed to upload file. Please try again.");
        setIsUploading(false);
      }
    },
    [onChange, onOcrResult, validateFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [uploadFile],
  );

  const handleRemove = useCallback(() => {
    onChange(null);
    setPreview(null);
    setOcrResult(null);
    setOcrError(null);
    setUploadError(null);
  }, [onChange]);

  const handleCapture = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.setAttribute("capture", "environment");
      inputRef.current.click();
      inputRef.current.removeAttribute("capture");
    }
  }, []);

  return (
    <div className={cn("space-y-3", className)}>
      {!value && !isUploading ? (
        <>
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors",
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-accent/50",
            )}
          >
            <Upload
              className={cn(
                "mb-3 h-8 w-8",
                isDragOver ? "text-primary" : "text-muted-foreground",
              )}
            />
            <p className="text-sm font-medium text-foreground">
              Drop your receipt here
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              JPG, PNG, PDF up to 10MB
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <FileImage className="h-3.5 w-3.5" />
                Browse files
              </button>
              <button
                type="button"
                onClick={handleCapture}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent md:hidden"
              >
                <Camera className="h-3.5 w-3.5" />
                Camera
              </button>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={SUPPORTED_RECEIPT_TYPES.join(",")}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          {uploadError && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {uploadError}
            </div>
          )}
        </>
      ) : isUploading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border p-6">
          <Loader2 className="mb-2 h-6 w-6 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">Uploading...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Preview */}
          <div className="relative rounded-xl border border-border bg-card overflow-hidden">
            {preview ? (
              <img
                src={preview}
                alt="Receipt preview"
                className="max-h-48 w-full object-contain"
              />
            ) : value ? (
              <div className="flex items-center gap-2 p-4">
                <FileImage className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1 truncate text-sm text-foreground">
                  Receipt uploaded
                </span>
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleRemove}
              className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:text-destructive"
              aria-label="Remove receipt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* OCR processing */}
          {isOcrProcessing && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-primary">
                Scanning receipt...
              </span>
            </div>
          )}

          {/* OCR result */}
          {ocrResult && (
            <div className="rounded-lg border border-success/20 bg-success/5 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-success">
                  Receipt scanned
                </span>
              </div>
              <p className="text-xs text-foreground">
                We detected:{" "}
                {ocrResult.amount && (
                  <span className="font-semibold">
                    {"\u20B9"}
                    {ocrResult.amount}
                  </span>
                )}
                {ocrResult.merchant && (
                  <span>
                    {" "}
                    at <span className="font-semibold">{ocrResult.merchant}</span>
                  </span>
                )}
                {ocrResult.date && (
                  <span>
                    {" "}
                    on <span className="font-semibold">{ocrResult.date}</span>
                  </span>
                )}
              </p>
            </div>
          )}

          {/* OCR error */}
          {ocrError && (
            <div className="flex items-center gap-2 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {ocrError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
