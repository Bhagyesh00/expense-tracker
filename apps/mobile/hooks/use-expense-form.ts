import { useState, useCallback, useRef } from "react";
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExpenseType = "expense" | "income";

export type RecurrenceInterval =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export interface ExpenseFormData {
  amount: string;
  type: ExpenseType;
  categoryId: string;
  description: string;
  date: Date;
  tags: string[];
  notes: string;
  isRecurring: boolean;
  recurrenceInterval: RecurrenceInterval | null;
  receiptUri: string | null;
  receiptRemoteUrl: string | null;
}

export interface OCRResult {
  amount: number | null;
  merchant: string | null;
  date: string | null;
  confidence: number;
}

export interface AISuggestion {
  categoryId: string;
  categoryName: string;
  confidence: number;
}

interface UseExpenseFormOptions {
  initialData?: Partial<ExpenseFormData>;
  onSaveSuccess?: () => void;
}

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

const DEFAULT_FORM_DATA: ExpenseFormData = {
  amount: "",
  type: "expense",
  categoryId: "",
  description: "",
  date: new Date(),
  tags: [],
  notes: "",
  isRecurring: false,
  recurrenceInterval: null,
  receiptUri: null,
  receiptRemoteUrl: null,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useExpenseForm(options: UseExpenseFormOptions = {}) {
  const { initialData, onSaveSuccess } = options;

  const [formData, setFormData] = useState<ExpenseFormData>({
    ...DEFAULT_FORM_DATA,
    ...initialData,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ExpenseFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [aiSuggestion, setAISuggestion] = useState<AISuggestion | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // ---- Field updaters ----

  const setField = useCallback(
    <K extends keyof ExpenseFormData>(key: K, value: ExpenseFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      setIsDirty(true);
      // Clear error for this field
      setErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [],
  );

  const setAmount = useCallback((v: string) => setField("amount", v), [setField]);
  const setType = useCallback((v: ExpenseType) => setField("type", v), [setField]);
  const setCategoryId = useCallback((v: string) => setField("categoryId", v), [setField]);
  const setDescription = useCallback((v: string) => setField("description", v), [setField]);
  const setDate = useCallback((v: Date) => setField("date", v), [setField]);
  const setNotes = useCallback((v: string) => setField("notes", v), [setField]);
  const setIsRecurring = useCallback((v: boolean) => setField("isRecurring", v), [setField]);
  const setRecurrenceInterval = useCallback(
    (v: RecurrenceInterval | null) => setField("recurrenceInterval", v),
    [setField],
  );

  // ---- Tags ----

  const addTag = useCallback((tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    setFormData((prev) => {
      if (prev.tags.includes(trimmed)) return prev;
      if (prev.tags.length >= 10) return prev;
      return { ...prev, tags: [...prev.tags, trimmed] };
    });
    setIsDirty(true);
  }, []);

  const removeTag = useCallback((tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
    setIsDirty(true);
  }, []);

  // ---- Receipt ----

  const pickReceiptFromGallery = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Required", "Allow photo library access to attach receipts.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setField("receiptUri", result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await runOCR(result.assets[0].uri);
    }
  }, [setField]);

  const pickReceiptFromCamera = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Required", "Allow camera access to capture receipts.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setField("receiptUri", result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await runOCR(result.assets[0].uri);
    }
  }, [setField]);

  const removeReceipt = useCallback(() => {
    setField("receiptUri", null);
    setField("receiptRemoteUrl", null);
    setOcrResult(null);
  }, [setField]);

  const uploadReceipt = useCallback(async (localUri: string): Promise<string | null> => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) throw new Error("File not found");

      const fileName = `receipts/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const fileBase64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setUploadProgress(0.5);

      const { data, error } = await supabase.storage
        .from("receipts")
        .upload(fileName, decode(fileBase64), {
          contentType: "image/jpeg",
          cacheControl: "3600",
        });

      setUploadProgress(1);

      if (error) {
        console.error("Upload error:", error);
        return null;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("receipts").getPublicUrl(data.path);

      setField("receiptRemoteUrl", publicUrl);
      return publicUrl;
    } catch (err: unknown) {
      console.error("Receipt upload error:", err);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [setField]);

  // ---- OCR (simulated) ----

  const runOCR = useCallback(async (uri: string) => {
    setIsScanning(true);
    setOcrResult(null);

    try {
      // Simulate OCR processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // In production, call your OCR API here
      // For now, return a simulated result
      const simulatedResult: OCRResult = {
        amount: Math.floor(Math.random() * 2000) + 100,
        merchant: ["McDonald's", "Uber", "Amazon", "Flipkart", "Swiggy"][
          Math.floor(Math.random() * 5)
        ],
        date: new Date().toISOString().split("T")[0],
        confidence: 0.85 + Math.random() * 0.15,
      };

      setOcrResult(simulatedResult);
    } catch {
      // OCR failed silently
    } finally {
      setIsScanning(false);
    }
  }, []);

  const applyOCRResult = useCallback(() => {
    if (!ocrResult) return;

    if (ocrResult.amount != null) {
      setField("amount", String(ocrResult.amount));
    }
    if (ocrResult.merchant) {
      setField("description", ocrResult.merchant);
    }
    if (ocrResult.date) {
      setField("date", new Date(ocrResult.date));
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [ocrResult, setField]);

  // ---- AI Categorization (simulated) ----

  const fetchAISuggestion = useCallback(async (description: string) => {
    if (description.length < 3) {
      setAISuggestion(null);
      return;
    }

    try {
      // Simulate AI categorization
      await new Promise((resolve) => setTimeout(resolve, 500));

      const descLower = description.toLowerCase();
      let suggestion: AISuggestion;

      if (descLower.includes("food") || descLower.includes("restaurant") || descLower.includes("swiggy") || descLower.includes("zomato")) {
        suggestion = { categoryId: "food", categoryName: "Food & Dining", confidence: 0.92 };
      } else if (descLower.includes("uber") || descLower.includes("ola") || descLower.includes("petrol") || descLower.includes("fuel")) {
        suggestion = { categoryId: "transport", categoryName: "Transport", confidence: 0.89 };
      } else if (descLower.includes("amazon") || descLower.includes("flipkart") || descLower.includes("shop")) {
        suggestion = { categoryId: "shopping", categoryName: "Shopping", confidence: 0.87 };
      } else if (descLower.includes("netflix") || descLower.includes("movie") || descLower.includes("spotify")) {
        suggestion = { categoryId: "entertainment", categoryName: "Entertainment", confidence: 0.91 };
      } else if (descLower.includes("bill") || descLower.includes("electric") || descLower.includes("water") || descLower.includes("internet")) {
        suggestion = { categoryId: "bills", categoryName: "Bills & Utilities", confidence: 0.88 };
      } else if (descLower.includes("doctor") || descLower.includes("medicine") || descLower.includes("hospital")) {
        suggestion = { categoryId: "health", categoryName: "Health", confidence: 0.9 };
      } else {
        suggestion = { categoryId: "other", categoryName: "Other", confidence: 0.5 };
      }

      setAISuggestion(suggestion);
    } catch {
      setAISuggestion(null);
    }
  }, []);

  // ---- Validation ----

  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof ExpenseFormData, string>> = {};

    const amount = Number(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = "Enter a valid amount greater than 0";
    }

    if (!formData.categoryId) {
      newErrors.categoryId = "Select a category";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (formData.isRecurring && !formData.recurrenceInterval) {
      newErrors.recurrenceInterval = "Select recurrence interval";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // ---- Save ----

  const save = useCallback(async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }

    setIsSubmitting(true);

    try {
      // Upload receipt if present and not yet uploaded
      if (formData.receiptUri && !formData.receiptRemoteUrl) {
        await uploadReceipt(formData.receiptUri);
      }

      // TODO: Call actual API via useCreateExpense mutation
      // For now, simulate a network call
      await new Promise((resolve) => setTimeout(resolve, 800));

      console.log("Saving expense:", {
        amount: Number(formData.amount),
        type: formData.type,
        categoryId: formData.categoryId,
        description: formData.description,
        date: formData.date.toISOString(),
        tags: formData.tags,
        notes: formData.notes,
        isRecurring: formData.isRecurring,
        recurrenceInterval: formData.recurrenceInterval,
        receiptUrl: formData.receiptRemoteUrl,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsDirty(false);
      onSaveSuccess?.();
      return true;
    } catch (err: unknown) {
      Alert.alert("Error", "Failed to save expense. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validate, uploadReceipt, onSaveSuccess]);

  // ---- Reset ----

  const reset = useCallback(() => {
    setFormData({ ...DEFAULT_FORM_DATA, ...initialData });
    setErrors({});
    setOcrResult(null);
    setAISuggestion(null);
    setIsDirty(false);
  }, [initialData]);

  return {
    // State
    formData,
    errors,
    isSubmitting,
    isUploading,
    uploadProgress,
    ocrResult,
    isScanning,
    aiSuggestion,
    isDirty,

    // Field setters
    setAmount,
    setType,
    setCategoryId,
    setDescription,
    setDate,
    setNotes,
    setIsRecurring,
    setRecurrenceInterval,
    setField,

    // Tags
    addTag,
    removeTag,

    // Receipt
    pickReceiptFromGallery,
    pickReceiptFromCamera,
    removeReceipt,
    uploadReceipt,

    // OCR
    applyOCRResult,

    // AI
    fetchAISuggestion,

    // Actions
    save,
    reset,
    validate,
  };
}

// ---------------------------------------------------------------------------
// Utility: decode base64 to ArrayBuffer for Supabase upload
// ---------------------------------------------------------------------------

function decode(base64: string): ArrayBuffer {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  const bufferLength = Math.floor(base64.length * 0.75);
  const arraybuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arraybuffer);

  let p = 0;
  for (let i = 0; i < base64.length; i += 4) {
    const encoded1 = lookup[base64.charCodeAt(i)];
    const encoded2 = lookup[base64.charCodeAt(i + 1)];
    const encoded3 = lookup[base64.charCodeAt(i + 2)];
    const encoded4 = lookup[base64.charCodeAt(i + 3)];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }

  return arraybuffer;
}
