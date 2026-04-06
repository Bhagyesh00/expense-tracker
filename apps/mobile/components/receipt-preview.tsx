import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  useColorScheme,
  Dimensions,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OCROverlayData {
  amount: number | null;
  merchant: string | null;
  date: string | null;
  confidence: number;
}

interface ReceiptPreviewProps {
  uri: string;
  isUploading?: boolean;
  uploadProgress?: number;
  ocrResult?: OCROverlayData | null;
  isScanning?: boolean;
  onRemove?: () => void;
  onApplyOCR?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ---------------------------------------------------------------------------
// Thumbnail mode
// ---------------------------------------------------------------------------

export default function ReceiptPreview({
  uri,
  isUploading = false,
  uploadProgress = 0,
  ocrResult,
  isScanning = false,
  onRemove,
  onApplyOCR,
}: ReceiptPreviewProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [fullScreenVisible, setFullScreenVisible] = useState(false);

  return (
    <Animated.View entering={FadeInDown.duration(300)} className="mt-3">
      {/* Thumbnail */}
      <View
        className={`rounded-2xl overflow-hidden border ${
          isDark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50"
        }`}
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFullScreenVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri }}
            className="w-full h-40 rounded-t-2xl"
            resizeMode="cover"
          />

          {/* Upload overlay */}
          {isUploading && (
            <View className="absolute inset-0 bg-black/50 items-center justify-center rounded-t-2xl">
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text className="text-white text-xs mt-2 font-medium">
                Uploading... {Math.round(uploadProgress * 100)}%
              </Text>
              {/* Progress bar */}
              <View className="w-32 h-1 bg-white/30 rounded-full mt-2 overflow-hidden">
                <View
                  className="h-full bg-white rounded-full"
                  style={{ width: `${uploadProgress * 100}%` }}
                />
              </View>
            </View>
          )}

          {/* Scanning overlay */}
          {isScanning && (
            <View className="absolute inset-0 bg-black/50 items-center justify-center rounded-t-2xl">
              <ActivityIndicator size="small" color="#A5B4FC" />
              <Text className="text-white text-xs mt-2 font-medium">
                Scanning receipt...
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Bottom bar: OCR results or action */}
        <View className="flex-row items-center px-3 py-2.5">
          <View className="flex-1">
            {ocrResult && !isScanning ? (
              <View className="flex-row items-center flex-wrap gap-1.5">
                {ocrResult.amount != null && (
                  <View className="bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-md">
                    <Text className="text-xs font-semibold text-green-700 dark:text-green-300">
                      ₹{ocrResult.amount.toLocaleString("en-IN")}
                    </Text>
                  </View>
                )}
                {ocrResult.merchant && (
                  <View className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                    <Text className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      {ocrResult.merchant}
                    </Text>
                  </View>
                )}
                {ocrResult.date && (
                  <View className="bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-md">
                    <Text className="text-xs font-medium text-purple-700 dark:text-purple-300">
                      {ocrResult.date}
                    </Text>
                  </View>
                )}
              </View>
            ) : isScanning ? (
              <Text className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Analyzing receipt...
              </Text>
            ) : (
              <Text className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Receipt attached
              </Text>
            )}
          </View>

          <View className="flex-row items-center gap-2">
            {ocrResult && !isScanning && onApplyOCR && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onApplyOCR();
                }}
                className="bg-primary-600 px-3 py-1.5 rounded-lg"
                activeOpacity={0.7}
              >
                <Text className="text-xs font-semibold text-white">Apply</Text>
              </TouchableOpacity>
            )}
            {onRemove && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onRemove();
                }}
                activeOpacity={0.7}
              >
                <Text className="text-red-500 text-xs font-semibold">Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Full-screen modal */}
      <FullScreenPreview
        visible={fullScreenVisible}
        uri={uri}
        ocrResult={ocrResult ?? undefined}
        onClose={() => setFullScreenVisible(false)}
        onApplyOCR={onApplyOCR}
      />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Full-screen preview with pinch-to-zoom
// ---------------------------------------------------------------------------

function FullScreenPreview({
  visible,
  uri,
  ocrResult,
  onClose,
  onApplyOCR,
}: {
  visible: boolean;
  uri: string;
  ocrResult?: OCROverlayData;
  onClose: () => void;
  onApplyOCR?: () => void;
}) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
      } else if (scale.value > 4) {
        scale.value = withSpring(4);
        savedScale.value = 4;
      } else {
        savedScale.value = scale.value;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withSpring(2.5);
        savedScale.value = 2.5;
      }
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);
  const finalGesture = Gesture.Exclusive(doubleTapGesture, composedGesture);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className="flex-1 bg-black">
          {/* Top bar */}
          <View className="flex-row items-center justify-between px-5 pt-14 pb-3 z-10">
            <TouchableOpacity
              onPress={onClose}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
              activeOpacity={0.7}
            >
              <Text className="text-white text-lg">✕</Text>
            </TouchableOpacity>
            <Text className="text-white font-semibold">Receipt</Text>
            <View className="w-10" />
          </View>

          {/* Zoomable image */}
          <GestureDetector gesture={finalGesture}>
            <Animated.View className="flex-1 items-center justify-center" style={imageStyle}>
              <Image
                source={{ uri }}
                style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7 }}
                resizeMode="contain"
              />
            </Animated.View>
          </GestureDetector>

          {/* OCR results overlay */}
          {ocrResult && (
            <View className="absolute bottom-0 left-0 right-0 px-5 pb-12 pt-4 bg-gradient-to-t from-black/80">
              <View className="flex-row flex-wrap gap-2 mb-3">
                {ocrResult.amount != null && (
                  <View className="bg-green-500/20 border border-green-500/30 px-3 py-1.5 rounded-lg">
                    <Text className="text-green-300 text-sm font-bold">
                      ₹{ocrResult.amount.toLocaleString("en-IN")}
                    </Text>
                  </View>
                )}
                {ocrResult.merchant && (
                  <View className="bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 rounded-lg">
                    <Text className="text-blue-300 text-sm font-medium">
                      {ocrResult.merchant}
                    </Text>
                  </View>
                )}
              </View>
              {onApplyOCR && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onApplyOCR();
                    onClose();
                  }}
                  className="bg-primary-600 rounded-2xl py-3.5 items-center"
                  activeOpacity={0.8}
                >
                  <Text className="text-white font-bold">Apply OCR Results</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
