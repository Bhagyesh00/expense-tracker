import { View, Text, useColorScheme } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useCallback, useRef, useEffect } from "react";

interface ThresholdSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
}

const TRACK_HEIGHT = 8;
const THUMB_SIZE = 28;
const TICK_MARKS = [25, 50, 75, 100];

export default function ThresholdSlider({
  value,
  onValueChange,
  min = 10,
  max = 100,
}: ThresholdSliderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const trackWidth = useSharedValue(0);
  const thumbX = useSharedValue(0);
  const lastHapticValue = useRef(value);
  const isGesturing = useSharedValue(false);

  const getColor = (pct: number) => {
    if (pct < 50) return "#10B981";
    if (pct <= 80) return "#F59E0B";
    return "#EF4444";
  };

  const currentColor = getColor(value);

  // Sync thumb to external value
  useEffect(() => {
    if (!isGesturing.value && trackWidth.value > 0) {
      const fraction = (value - min) / (max - min);
      thumbX.value = withSpring(fraction * trackWidth.value, {
        damping: 20,
        stiffness: 200,
      });
    }
  }, [value, min, max]);

  const triggerHaptic = useCallback((newValue: number) => {
    // Fire haptic when crossing tick marks
    const rounded = Math.round(newValue);
    if (TICK_MARKS.includes(rounded) && lastHapticValue.current !== rounded) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    lastHapticValue.current = rounded;
    onValueChange(rounded);
  }, [onValueChange]);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      isGesturing.value = true;
    })
    .onUpdate((event) => {
      const clampedX = Math.max(0, Math.min(event.x - THUMB_SIZE / 2, trackWidth.value));
      thumbX.value = clampedX;
      const fraction = clampedX / trackWidth.value;
      const newValue = min + fraction * (max - min);
      runOnJS(triggerHaptic)(newValue);
    })
    .onEnd(() => {
      isGesturing.value = false;
    });

  const tapGesture = Gesture.Tap().onEnd((event) => {
    const clampedX = Math.max(0, Math.min(event.x - THUMB_SIZE / 2, trackWidth.value));
    thumbX.value = withSpring(clampedX, { damping: 20, stiffness: 200 });
    const fraction = clampedX / trackWidth.value;
    const newValue = min + fraction * (max - min);
    runOnJS(triggerHaptic)(newValue);
  });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: thumbX.value + THUMB_SIZE / 2,
  }));

  return (
    <View>
      {/* Value display */}
      <View className="flex-row items-center justify-between mb-2">
        <Text className={`text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>
          Alert Threshold
        </Text>
        <View
          className="rounded-full px-3 py-1"
          style={{ backgroundColor: currentColor + "20" }}
        >
          <Text className="text-sm font-bold" style={{ color: currentColor }}>
            {value}%
          </Text>
        </View>
      </View>

      {/* Slider track */}
      <GestureDetector gesture={composedGesture}>
        <View
          className="py-4"
          onLayout={(e) => {
            const width = e.nativeEvent.layout.width - THUMB_SIZE;
            trackWidth.value = width;
            const fraction = (value - min) / (max - min);
            thumbX.value = fraction * width;
          }}
        >
          {/* Track background */}
          <View
            className={`rounded-full ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
            style={{ height: TRACK_HEIGHT }}
          >
            {/* Track fill */}
            <Animated.View
              className="rounded-full absolute top-0 left-0 h-full"
              style={[fillStyle, { backgroundColor: currentColor }]}
            />
          </View>

          {/* Tick marks */}
          <View className="absolute left-0 right-0" style={{ top: 12 }}>
            {TICK_MARKS.map((tick) => {
              const tickFraction = (tick - min) / (max - min);
              return (
                <View
                  key={tick}
                  className={`absolute w-0.5 h-4 rounded-full ${isDark ? "bg-slate-600" : "bg-slate-300"}`}
                  style={{
                    left: `${tickFraction * 100}%`,
                    marginLeft: -1 + (THUMB_SIZE / 2) * (1 - tickFraction * 2 / 1),
                  }}
                />
              );
            })}
          </View>

          {/* Thumb */}
          <Animated.View
            className="absolute"
            style={[
              thumbStyle,
              {
                top: 4 + TRACK_HEIGHT / 2 - THUMB_SIZE / 2,
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: THUMB_SIZE / 2,
                backgroundColor: currentColor,
                shadowColor: currentColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.4,
                shadowRadius: 4,
                elevation: 4,
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <View className="w-3 h-3 rounded-full bg-white" />
          </Animated.View>
        </View>
      </GestureDetector>

      {/* Labels */}
      <View className="flex-row items-center justify-between mt-1">
        <Text className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          Conservative
        </Text>
        <Text className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          Aggressive
        </Text>
      </View>
    </View>
  );
}
