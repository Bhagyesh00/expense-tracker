import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { CameraView, useCameraPermissions, type FlashMode } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
} from "react-native-reanimated";

import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OCRData {
  amount: number | null;
  merchant: string | null;
  date: string | null;
  confidence: number;
}

interface CameraReceiptProps {
  onCapture: (uri: string, remoteUrl?: string, ocrData?: OCRData) => void;
  onClose: () => void;
}

type CaptureState = "camera" | "preview" | "uploading" | "scanning";

// ---------------------------------------------------------------------------
// Scanning animation overlay
// ---------------------------------------------------------------------------

function ScanningOverlay() {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.6);

  translateY.value = withRepeat(
    withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
    -1,
    true,
  );
  opacity.value = withRepeat(
    withSequence(
      withTiming(1, { duration: 900 }),
      withTiming(0.4, { duration: 900 }),
    ),
    -1,
    false,
  );

  const lineStyle = useAnimatedStyle(() => ({
    top: `${translateY.value * 80 + 10}%`,
    opacity: opacity.value,
  }));

  return (
    <View className="absolute inset-0 bg-black/60 items-center justify-center">
      <Animated.View
        style={[lineStyle, { position: "absolute", left: 24, right: 24, height: 2 }]}
        className="bg-primary-400 rounded-full"
      />
      <View className="items-center mt-24">
        <ActivityIndicator size="large" color="#A5B4FC" />
        <Animated.Text
          entering={FadeIn.duration(300)}
          className="text-white text-sm font-semibold mt-4"
        >
          Scanning receipt...
        </Animated.Text>
        <Text className="text-white/60 text-xs mt-1">
          Looking for amount, merchant, and date
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CameraReceipt({ onCapture, onClose }: CameraReceiptProps) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<CaptureState>("camera");
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [flashMode, setFlashMode] = useState<"off" | "on">("off");
  const [ocrResult, setOcrResult] = useState<OCRData | null>(null);

  // Shutter animation
  const shutterScale = useSharedValue(1);
  const shutterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shutterScale.value }],
  }));

  // ---- Permission screens ----

  if (!permission) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#FFFFFF" size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-white dark:bg-slate-900 items-center justify-center px-8">
        <View className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 items-center justify-center mb-5">
          <Text className="text-4xl">📷</Text>
        </View>
        <Text className="text-xl font-bold text-slate-900 dark:text-white mb-2 text-center">
          Camera Permission
        </Text>
        <Text className="text-sm text-slate-500 text-center mb-6 leading-5">
          Allow ExpenseFlow to use your camera to scan and capture receipts for automatic data entry.
        </Text>
        <TouchableOpacity
          className="bg-primary-600 rounded-2xl px-10 py-4 mb-3"
          onPress={requestPermission}
          activeOpacity={0.8}
          style={{
            shadowColor: "#4F46E5",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <Text className="text-white font-bold text-base">Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="py-2">
          <Text className="text-slate-400 font-medium">Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---- Handlers ----

  async function handleCapture() {
    if (!cameraRef.current) return;

    // Shutter animation
    shutterScale.value = withSequence(
      withTiming(0.85, { duration: 80 }),
      withSpring(1, { damping: 12 }),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        setCapturedUri(photo.uri);
        setState("preview");
      }
    } catch {
      Alert.alert("Error", "Failed to capture photo. Please try again.");
    }
  }

  async function handlePickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Required", "Photo library access is needed to select receipts.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedUri(result.assets[0].uri);
      setState("preview");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  function handleRetake() {
    setCapturedUri(null);
    setOcrResult(null);
    setState("camera");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function toggleFlash() {
    setFlashMode((prev) => (prev === "off" ? "on" : "off"));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function runOCR(uri: string): Promise<OCRData> {
    // Simulate OCR processing
    await new Promise((resolve) => setTimeout(resolve, 2500));

    return {
      amount: Math.floor(Math.random() * 2000) + 100,
      merchant: ["McDonald's", "Uber", "Amazon", "Flipkart", "Swiggy", "Starbucks"][
        Math.floor(Math.random() * 6)
      ],
      date: new Date().toISOString().split("T")[0],
      confidence: 0.85 + Math.random() * 0.15,
    };
  }

  async function handleConfirm() {
    if (!capturedUri) return;

    // Phase 1: OCR scan
    setState("scanning");
    const ocrData = await runOCR(capturedUri);
    setOcrResult(ocrData);

    // Phase 2: Upload
    setIsUploading(true);
    setState("uploading");
    setUploadProgress(0);

    try {
      const fileInfo = await FileSystem.getInfoAsync(capturedUri);
      if (!fileInfo.exists) throw new Error("File not found");

      const fileName = `receipts/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const fileBase64 = await FileSystem.readAsStringAsync(capturedUri, {
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
        onCapture(capturedUri, undefined, ocrData);
      } else {
        const {
          data: { publicUrl },
        } = supabase.storage.from("receipts").getPublicUrl(data.path);
        onCapture(capturedUri, publicUrl, ocrData);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      console.error("Receipt upload error:", err);
      onCapture(capturedUri, undefined, ocrData);
    } finally {
      setIsUploading(false);
    }
  }

  // ---- Camera View ----

  if (state === "camera") {
    return (
      <View className="flex-1 bg-black">
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing="back"
          flash={flashMode}
        >
          <View className="flex-1">
            {/* Top bar */}
            <Animated.View
              entering={FadeInDown.duration(400)}
              className="flex-row items-center justify-between px-5 pt-14 pb-4"
            >
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
                className="w-10 h-10 rounded-full bg-black/30 items-center justify-center"
              >
                <Text className="text-white text-lg font-medium">✕</Text>
              </TouchableOpacity>
              <Text className="text-white text-sm font-semibold">Scan Receipt</Text>
              <TouchableOpacity
                onPress={toggleFlash}
                activeOpacity={0.7}
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  flashMode === "on" ? "bg-yellow-500/50" : "bg-black/30"
                }`}
              >
                <Text className="text-white text-sm">
                  {flashMode === "on" ? "⚡" : "⚡"}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Receipt alignment guide */}
            <View className="flex-1 items-center justify-center px-6">
              <View
                className="w-full aspect-[3/4] rounded-2xl"
                style={{ maxHeight: "70%", borderWidth: 2, borderColor: "rgba(255,255,255,0.35)" }}
              >
                {/* Corner indicators */}
                <View className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-[3px] border-l-[3px] border-white rounded-tl-xl" />
                <View className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-[3px] border-r-[3px] border-white rounded-tr-xl" />
                <View className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-[3px] border-l-[3px] border-white rounded-bl-xl" />
                <View className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-[3px] border-r-[3px] border-white rounded-br-xl" />
              </View>
              <Text className="text-white/60 text-xs mt-4 font-medium">
                Align receipt within the frame
              </Text>
            </View>

            {/* Bottom controls */}
            <Animated.View
              entering={FadeInDown.duration(400).delay(200)}
              className="flex-row items-center justify-center gap-12 pb-12 pt-4"
            >
              {/* Gallery */}
              <TouchableOpacity
                onPress={handlePickFromGallery}
                activeOpacity={0.7}
                className="w-12 h-12 rounded-2xl bg-white/15 items-center justify-center"
              >
                <Text className="text-white text-lg">🖼</Text>
              </TouchableOpacity>

              {/* Shutter button */}
              <Animated.View style={shutterStyle}>
                <TouchableOpacity
                  onPress={handleCapture}
                  activeOpacity={0.8}
                  className="w-20 h-20 rounded-full border-4 border-white items-center justify-center"
                >
                  <View className="w-16 h-16 rounded-full bg-white" />
                </TouchableOpacity>
              </Animated.View>

              {/* Spacer */}
              <View className="w-12 h-12" />
            </Animated.View>
          </View>
        </CameraView>
      </View>
    );
  }

  // ---- Preview / Scanning / Uploading ----

  return (
    <View className="flex-1 bg-black">
      {capturedUri && (
        <Image
          source={{ uri: capturedUri }}
          className="flex-1"
          resizeMode="contain"
        />
      )}

      {/* Scanning overlay */}
      {state === "scanning" && <ScanningOverlay />}

      {/* Upload overlay */}
      {state === "uploading" && isUploading && (
        <Animated.View
          entering={FadeIn.duration(300)}
          className="absolute inset-0 bg-black/60 items-center justify-center"
        >
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text className="text-white mt-4 font-semibold text-sm">
            Uploading receipt...
          </Text>
          <View className="w-40 h-1.5 bg-white/20 rounded-full mt-3 overflow-hidden">
            <View
              className="h-full bg-primary-400 rounded-full"
              style={{ width: `${uploadProgress * 100}%` }}
            />
          </View>
          <Text className="text-white/60 text-xs mt-2">
            {Math.round(uploadProgress * 100)}%
          </Text>

          {/* OCR result preview */}
          {ocrResult && (
            <Animated.View
              entering={FadeInDown.duration(300).delay(200)}
              className="mt-6 bg-white/10 rounded-2xl p-4 mx-8"
            >
              <Text className="text-white/80 text-xs font-semibold mb-2">
                Scanned Results:
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {ocrResult.amount != null && (
                  <View className="bg-green-500/20 px-3 py-1 rounded-lg">
                    <Text className="text-green-300 text-sm font-bold">
                      ₹{ocrResult.amount.toLocaleString("en-IN")}
                    </Text>
                  </View>
                )}
                {ocrResult.merchant && (
                  <View className="bg-blue-500/20 px-3 py-1 rounded-lg">
                    <Text className="text-blue-300 text-sm font-medium">
                      {ocrResult.merchant}
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>
          )}
        </Animated.View>
      )}

      {/* Preview controls */}
      {state === "preview" && (
        <Animated.View
          entering={SlideInDown.duration(300)}
          className="absolute bottom-0 left-0 right-0 flex-row gap-4 px-5 pb-12 pt-4"
          style={{
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
        >
          <TouchableOpacity
            className="flex-1 bg-white/20 rounded-2xl py-4 items-center"
            onPress={handleRetake}
            activeOpacity={0.7}
          >
            <Text className="text-white font-bold">Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-primary-600 rounded-2xl py-4 items-center"
            onPress={handleConfirm}
            activeOpacity={0.8}
            style={{
              shadowColor: "#4F46E5",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <Text className="text-white font-bold">Use Photo</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Utility: decode base64 to ArrayBuffer
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
