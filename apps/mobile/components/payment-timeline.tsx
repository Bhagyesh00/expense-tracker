import { View, Text, Image } from "react-native";
import Animated, { FadeInLeft, FadeInRight } from "react-native-reanimated";

export interface PaymentTimelineEntry {
  id: string;
  type: "created" | "payment" | "partial" | "overdue" | "settled";
  amount: number;
  date: string;
  method?: "cash" | "upi" | "bank_transfer" | "card" | "other";
  note?: string;
  proofUrl?: string | null;
}

interface PaymentTimelineProps {
  payments: PaymentTimelineEntry[];
  totalAmount?: number;
}

const DOT_COLORS: Record<PaymentTimelineEntry["type"], string> = {
  created: "#6366F1",
  payment: "#10B981",
  partial: "#F59E0B",
  overdue: "#EF4444",
  settled: "#10B981",
};

const DOT_BG_COLORS: Record<PaymentTimelineEntry["type"], string> = {
  created: "#EEF2FF",
  payment: "#D1FAE5",
  partial: "#FEF3C7",
  overdue: "#FEE2E2",
  settled: "#D1FAE5",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  card: "Card",
  other: "Other",
};

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getTypeLabel(type: PaymentTimelineEntry["type"]): string {
  switch (type) {
    case "created":
      return "Created";
    case "payment":
      return "Payment Recorded";
    case "partial":
      return "Partial Payment";
    case "overdue":
      return "Marked Overdue";
    case "settled":
      return "Settled";
    default:
      return "Update";
  }
}

export default function PaymentTimeline({
  payments,
  totalAmount,
}: PaymentTimelineProps) {
  if (payments.length === 0) {
    return (
      <View className="py-6 items-center">
        <Text className="text-slate-400 text-sm">
          No payment history yet.
        </Text>
      </View>
    );
  }

  // Show latest first
  const sorted = [...payments].reverse();

  return (
    <View>
      {sorted.map((entry, index) => {
        const isLast = index === sorted.length - 1;
        const dotColor = DOT_COLORS[entry.type] ?? "#94A3B8";
        const dotBg = DOT_BG_COLORS[entry.type] ?? "#F1F5F9";

        return (
          <Animated.View
            key={entry.id}
            entering={FadeInLeft.duration(400).delay(index * 80)}
            className="flex-row"
          >
            {/* Timeline line + dot */}
            <View className="items-center mr-3" style={{ width: 28 }}>
              <View
                className="w-7 h-7 rounded-full items-center justify-center"
                style={{ backgroundColor: dotBg }}
              >
                <View
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: dotColor }}
                />
              </View>
              {!isLast && (
                <View
                  className="w-0.5 flex-1 my-1"
                  style={{ backgroundColor: "#E2E8F0" }}
                />
              )}
            </View>

            {/* Content */}
            <View className={`flex-1 ${isLast ? "pb-0" : "pb-4"}`}>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-slate-900">
                  {getTypeLabel(entry.type)}
                </Text>
                <Text className="text-xs text-slate-400">
                  {formatDate(entry.date)}
                </Text>
              </View>

              <View className="flex-row items-center mt-1 flex-wrap gap-2">
                <Text
                  className={`text-sm font-bold ${
                    entry.type === "created"
                      ? "text-slate-700"
                      : "text-green-600"
                  }`}
                >
                  {entry.type === "created" ? "Total: " : "+"}
                  {"\u20B9"}
                  {entry.amount.toLocaleString("en-IN")}
                </Text>

                {entry.method && (
                  <View className="bg-slate-100 rounded-full px-2 py-0.5">
                    <Text className="text-[10px] font-medium text-slate-600">
                      {METHOD_LABELS[entry.method] ?? entry.method}
                    </Text>
                  </View>
                )}
              </View>

              {entry.note ? (
                <Text className="text-xs text-slate-500 mt-1" numberOfLines={2}>
                  {entry.note}
                </Text>
              ) : null}

              {entry.proofUrl ? (
                <View className="mt-2">
                  <View className="w-12 h-12 rounded-lg bg-slate-100 items-center justify-center overflow-hidden">
                    <Image
                      source={{ uri: entry.proofUrl }}
                      className="w-12 h-12"
                      resizeMode="cover"
                    />
                  </View>
                </View>
              ) : null}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}
