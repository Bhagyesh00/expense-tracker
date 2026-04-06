import { useRef, useEffect, useCallback } from "react";
import {
  FlatList,
  View,
  Text,
  AccessibilityInfo,
  useColorScheme,
  type FlatListProps,
  type ListRenderItem,
} from "react-native";

import { useAccessibility } from "@/hooks/use-accessibility";

// ---- Types ----

interface AccessibleListProps<T> extends Omit<FlatListProps<T>, "renderItem"> {
  /** The items to render */
  data: T[];
  /** Render each item */
  renderItem: ListRenderItem<T>;
  /** Accessibility label for the list (read by screen reader) */
  listLabel: string;
  /** Optional: announced when list data changes */
  changeAnnouncement?: string;
  /** Optional: key extractor */
  keyExtractor?: (item: T, index: number) => string;
}

// ---- Component ----

export default function AccessibleList<T>({
  data,
  renderItem,
  listLabel,
  changeAnnouncement,
  keyExtractor,
  ...rest
}: AccessibleListProps<T>) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const prevLengthRef = useRef(data.length);

  const {
    highContrast,
    screenReaderActive,
    screenReaderOptimizations,
  } = useAccessibility();

  // Announce list changes to screen reader
  useEffect(() => {
    if (!screenReaderActive) return;

    const prevLength = prevLengthRef.current;
    prevLengthRef.current = data.length;

    if (prevLength !== data.length) {
      const announcement =
        changeAnnouncement ??
        `List updated. ${data.length} item${data.length !== 1 ? "s" : ""}.`;

      AccessibilityInfo.announceForAccessibility(announcement);
    }
  }, [data.length, screenReaderActive, changeAnnouncement]);

  // Wrapped render item with accessibility enhancements
  const wrappedRenderItem: ListRenderItem<T> = useCallback(
    (info) => {
      const rendered = renderItem(info);

      if (!screenReaderOptimizations) return rendered;

      // Wrap with accessibility hint about position
      return (
        <View
          accessible
          accessibilityLabel={`Item ${info.index + 1} of ${data.length}`}
          accessibilityRole="button"
          style={
            highContrast
              ? {
                  borderWidth: 1,
                  borderColor: isDark ? "#FFFFFF" : "#000000",
                  borderRadius: 8,
                  marginVertical: 1,
                }
              : undefined
          }
        >
          {rendered}
        </View>
      );
    },
    [renderItem, screenReaderOptimizations, data.length, highContrast, isDark]
  );

  return (
    <FlatList
      data={data}
      renderItem={wrappedRenderItem}
      keyExtractor={keyExtractor}
      accessible
      accessibilityLabel={listLabel}
      accessibilityRole="list"
      accessibilityHint={
        screenReaderActive
          ? `${data.length} item${data.length !== 1 ? "s" : ""} in this list. Swipe to navigate.`
          : undefined
      }
      // Keyboard navigation support
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      // Performance
      removeClippedSubviews
      maxToRenderPerBatch={10}
      windowSize={5}
      ListEmptyComponent={
        <View
          className="items-center py-12"
          accessible
          accessibilityLabel="Empty list"
        >
          <Text
            className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            No items to display
          </Text>
        </View>
      }
      {...rest}
    />
  );
}
